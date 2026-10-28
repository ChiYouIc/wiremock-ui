#!/usr/bin/env node
/**
 * 契约测试：用 wiremock-admin-api.json 校验前端生成的载荷。
 *
 *   node scripts/contract-test.mjs            # 仅离线校验
 *   node scripts/contract-test.mjs --live     # 额外对 WM_URL 指向的真实服务做冒烟
 *
 * 离线部分会校验 5 类曾经出错的地方：request.body、URL 匹配互斥、
 * basicAuthCredentials、postServeActions 形态、lognormal 延时参数。
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Ajv from 'ajv';
import {
  buildMappingPayload,
  getDefaultFormValues,
  mapRecordToFormData,
  validateMappingForm,
} from '../src/components/StubMappings/mappingModel.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const specPath = path.join(here, '..', 'wiremock-admin-api.json');
const spec = JSON.parse(readFileSync(specPath, 'utf8'));

const ajv = new Ajv({ strict: false, allErrors: true, validateFormats: false });
ajv.addSchema({ ...spec, $id: 'wiremock' });

const validators = {
  stubMapping: ajv.compile({ $ref: 'wiremock#/components/schemas/stub-mapping' }),
  requestPattern: ajv.compile({ $ref: 'wiremock#/components/schemas/request-pattern' }),
  responseDefinition: ajv.compile({ $ref: 'wiremock#/components/schemas/response-definition' }),
};

let failures = 0;
let checks = 0;

const fail = (message) => {
  failures += 1;
  console.error(`  ✗ ${message}`);
};

const ok = (message) => {
  checks += 1;
  console.log(`  ✓ ${message}`);
};

const assert = (condition, message) => {
  if (condition) ok(message);
  else fail(message);
};

const formatErrors = (errors) =>
  (errors || [])
    .map((error) => `${error.instancePath || '/'} ${error.message}`)
    .join('; ');

const validateStubMapping = (payload, label) => {
  const valid = validators.stubMapping(payload);
  assert(valid, `${label} 通过 stub-mapping schema 校验${valid ? '' : `（${formatErrors(validators.stubMapping.errors)}）`}`);
};

// spec 的 request-pattern 没有 additionalProperties:false，服务端却是严格反序列化，
// 这里用显式规则补齐规范无法表达的约束。
const assertServerRules = (payload, label) => {
  const request = payload.request || {};
  assert(!('body' in request), `${label} 不包含非法的 request.body`);
  assert(
    !('basicAuth' in request),
    `${label} 使用 basicAuthCredentials 而不是 basicAuth`
  );

  const urlFields = ['url', 'urlPath', 'urlPattern', 'urlPathPattern'].filter((key) => key in request);
  assert(urlFields.length === 1, `${label} 只有一种 URL 匹配字段（实际：${urlFields.join('|') || '无'}）`);

  if (payload.postServeActions) {
    assert(
      !Array.isArray(payload.postServeActions),
      `${label} 的 postServeActions 是对象形态`
    );
  }
};

const withOverrides = (overrides) => {
  const base = getDefaultFormValues();
  return {
    ...base,
    ...overrides,
    request: { ...base.request, ...(overrides.request || {}) },
    response: { ...base.response, ...(overrides.response || {}) },
  };
};

console.log('契约测试：wiremock-admin-api.json (WireMock 3.12.2)');

// 1. 默认表单
{
  console.log('\n[1] 默认表单');
  const payload = buildMappingPayload(getDefaultFormValues());
  validateStubMapping(payload, '默认载荷');
  assertServerRules(payload, '默认载荷');
  assert(payload.request.urlPath === '/', '默认使用 urlPath 匹配');
  assert(validateMappingForm(getDefaultFormValues()).length === 0, '默认表单通过本地校验');
}

// 2. URL 匹配四选一
{
  console.log('\n[2] URL 匹配方式互斥');
  ['url', 'urlPath', 'urlPattern', 'urlPathPattern'].forEach((type) => {
    const values = withOverrides({
      request: { urlMatchType: type, urlValue: '/api/x', urlPath: '/legacy', urlPathPattern: '/legacy.*' },
    });
    const payload = buildMappingPayload(values);
    validateStubMapping(payload, `${type} 载荷`);
    assertServerRules(payload, `${type} 载荷`);
    assert(payload.request[type] === '/api/x', `${type} 只下发选中的匹配字段`);
  });
}

// 3. 请求体匹配器 → bodyPatterns
{
  console.log('\n[3] 请求体匹配');
  const values = withOverrides({
    request: {
      bodyMatchers: [
        { matcher: 'equalTo', value: 'hello', caseInsensitive: true },
        { matcher: 'equalToJson', value: '{"a":1}', ignoreArrayOrder: false, ignoreExtraElements: true },
        { matcher: 'absent' },
      ],
    },
  });
  const payload = buildMappingPayload(values);
  validateStubMapping(payload, 'bodyPatterns 载荷');
  assertServerRules(payload, 'bodyPatterns 载荷');
  assert(payload.request.bodyPatterns?.length === 3, '3 个匹配器全部写入 bodyPatterns');
  assert(payload.request.bodyPatterns[0].caseInsensitive === true, 'equalTo 保留 caseInsensitive');
  assert(payload.request.bodyPatterns[1].ignoreArrayOrder === false, 'equalToJson 保留 ignoreArrayOrder');
  assert(payload.request.bodyPatterns[2].absent === true, 'absent 匹配器正确');
  const patternValid = validators.requestPattern(payload.request);
  assert(patternValid, `request 通过 request-pattern 校验${patternValid ? '' : `（${formatErrors(validators.requestPattern.errors)}）`}`);
}

// 4. Basic Auth
{
  console.log('\n[4] Basic Auth');
  const payload = buildMappingPayload(
    withOverrides({ request: { basicAuth: { username: 'u', password: 'p' } } })
  );
  validateStubMapping(payload, 'basicAuth 载荷');
  assertServerRules(payload, 'basicAuth 载荷');
  assert(payload.request.basicAuthCredentials?.username === 'u', '下发 basicAuthCredentials');
}

// 5. Webhook → postServeActions 对象形态
{
  console.log('\n[5] Webhook');
  const payload = buildMappingPayload(
    withOverrides({
      webhook: { url: 'https://example.com/cb', method: 'POST', headers: { 'X-A': '1' }, body: '{}', delayMilliseconds: 500 },
    })
  );
  validateStubMapping(payload, 'webhook 载荷');
  assertServerRules(payload, 'webhook 载荷');
  assert(!Array.isArray(payload.postServeActions), 'postServeActions 是对象');
  assert(payload.postServeActions.webhook.delay.milliseconds === 500, 'webhook delay 使用 {type:fixed,milliseconds}');
}

// 6. 延时分布
{
  console.log('\n[6] 延时分布');
  const uniform = buildMappingPayload(withOverrides({ response: { delayType: 'uniform', delayLower: 10, delayUpper: 20 } }));
  validateStubMapping(uniform, 'uniform 载荷');
  assert(uniform.response.delayDistribution.lower === 10, 'uniform 使用 lower/upper');

  const lognormal = buildMappingPayload(
    withOverrides({ response: { delayType: 'lognormal', delayMedian: 50, delaySigma: 0.4 } })
  );
  validateStubMapping(lognormal, 'lognormal 载荷');
  assert(lognormal.response.delayDistribution.median === 50, 'lognormal 使用 median/sigma');
  assert(!('lower' in lognormal.response.delayDistribution), 'lognormal 不包含 lower');

  const invalidLog = validateMappingForm(
    withOverrides({ response: { delayType: 'lognormal', delayMedian: 0, delaySigma: 0 } })
  );
  assert(invalidLog.length > 0, '本地校验拦截缺失 median/sigma 的 lognormal');
}

// 7. 响应体来源
{
  console.log('\n[7] 响应体来源');
  const jsonBody = buildMappingPayload(
    withOverrides({ response: { bodySource: 'jsonBody', bodyValue: '{"ok":true}' } })
  );
  validateStubMapping(jsonBody, 'jsonBody 载荷');
  assert(jsonBody.response.jsonBody?.ok === true, 'jsonBody 被解析为对象');

  const fileBody = buildMappingPayload(
    withOverrides({ response: { bodySource: 'bodyFileName', bodyValue: 'payloads/a.json' } })
  );
  validateStubMapping(fileBody, 'bodyFileName 载荷');
  assert(fileBody.response.bodyFileName === 'payloads/a.json', 'bodyFileName 正确');

  const badJson = validateMappingForm(withOverrides({ response: { bodySource: 'jsonBody', bodyValue: '{oops' } }));
  assert(badJson.length > 0, '本地校验拦截非法 jsonBody');
}

// 8. 回读 → 回写一致性
{
  console.log('\n[8] 回读/回写一致性');
  const record = {
    id: '11111111-1111-1111-1111-111111111111',
    name: '示例',
    priority: 3,
    scenarioName: 'flow',
    requiredScenarioState: 'Started',
    newScenarioState: 'step2',
    metadata: { wmui: { description: '说明' }, tag: 'x' },
    request: {
      method: 'POST',
      urlPathPattern: '/api/items/[0-9]+',
      queryParameters: { page: { equalTo: '1' } },
      headers: { 'Content-Type': { matches: '.*json' } },
      bodyPatterns: [{ equalToJson: '{"a":1}', ignoreArrayOrder: true, ignoreExtraElements: true }],
      basicAuthCredentials: { username: 'u', password: 'p' },
    },
    response: {
      status: 201,
      statusMessage: 'Created',
      headers: { 'Content-Type': 'application/json' },
      jsonBody: { ok: true },
      fixedDelayMilliseconds: 25,
      delayDistribution: { type: 'lognormal', median: 40, sigma: 0.2 },
      transformers: ['response-template'],
    },
    postServeActions: [{ name: 'webhook', parameters: { url: 'https://example.com/cb', method: 'POST' } }],
  };

  const form = mapRecordToFormData(record);
  const payload = buildMappingPayload(form);
  validateStubMapping(payload, '回写载荷');
  assertServerRules(payload, '回写载荷');

  assert(payload.request.urlPathPattern === record.request.urlPathPattern, 'URL 匹配方式还原');
  assert(payload.request.bodyPatterns?.[0]?.equalToJson === '{"a":1}', 'bodyPatterns 还原');
  assert(payload.request.basicAuthCredentials?.username === 'u', 'basicAuthCredentials 还原');
  assert(payload.response.jsonBody?.ok === true, 'jsonBody 还原');
  assert(payload.response.delayDistribution?.median === 40, 'lognormal 还原');
  assert(payload.metadata?.tag === 'x', '额外 metadata 未被丢弃');
  assert(payload.scenarioName === 'flow' && payload.newScenarioState === 'step2', '场景字段还原');
  assert(payload.postServeActions?.webhook?.url === 'https://example.com/cb', '数组形态的 postServeActions 可被读取');
  const responseValid = validators.responseDefinition(payload.response);
  assert(responseValid, `response 通过 response-definition 校验${responseValid ? '' : `（${formatErrors(validators.responseDefinition.errors)}）`}`);
}

// ---- 可选的在线冒烟 ----
const liveMode = process.argv.includes('--live');
if (liveMode) {
  const base = (process.env.WM_URL || 'http://localhost:8080').replace(/\/$/, '');
  const admin = `${base}/__admin`;
  console.log(`\n[9] 在线冒烟：${admin}`);

  const call = async (method, url, body, headers = {}) => {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let data;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text;
    }
    return { status: response.status, data };
  };

  const payload = buildMappingPayload(
    withOverrides({
      name: `wmui-contract-${Date.now()}`,
      request: {
        method: 'POST',
        urlMatchType: 'urlPathPattern',
        urlValue: '/__wmui-contract/.*',
        basicAuth: { username: 'u', password: 'p' },
        bodyMatchers: [{ matcher: 'equalToJson', value: '{"a":1}' }],
      },
      response: { status: 201, delayType: 'lognormal', delayMedian: 10, delaySigma: 0.1 },
      webhook: { url: 'https://example.com/cb', method: 'POST', delayMilliseconds: 100 },
    })
  );

  try {
    const created = await call('POST', `${admin}/mappings`, payload);
    assert(created.status === 201, `POST /mappings → 201（实际 ${created.status}: ${JSON.stringify(created.data).slice(0, 200)}）`);

    if (created.status === 201) {
      const id = created.data.id;
      const fetched = await call('GET', `${admin}/mappings/${id}`);
      assert(fetched.status === 200, 'GET /mappings/{id} → 200');
      assert(
        fetched.data.request?.basicAuthCredentials?.username === 'u',
        '服务端回读保留 basicAuthCredentials'
      );
      assert(Array.isArray(fetched.data.request?.bodyPatterns), '服务端回读保留 bodyPatterns');

      const updated = await call('PUT', `${admin}/mappings/${id}`, { ...payload, priority: 2 });
      assert(updated.status === 200, `PUT /mappings/{id} → 200（实际 ${updated.status}）`);

      const nearMiss = await call('POST', `${admin}/near-misses/request`, {
        method: 'GET',
        url: '/__wmui-contract/1',
      });
      assert(nearMiss.status === 200 && Array.isArray(nearMiss.data?.nearMisses), 'POST /near-misses/request → 200');

      const fileName = `__wmui-contract-${Date.now()}.json`;
      const putFile = await call('PUT', `${admin}/files/${fileName}`, '{"hello":1}', {
        'Content-Type': 'application/octet-stream',
      });
      assert(putFile.status === 200, `PUT /files/{name} → 200（实际 ${putFile.status}）`);
      const getFile = await call('GET', `${admin}/files/${fileName}`);
      assert(getFile.status === 200, 'GET /files/{name} → 200');
      const delFile = await call('DELETE', `${admin}/files/${fileName}`);
      assert(delFile.status === 200, 'DELETE /files/{name} → 200');

      const removed = await call('DELETE', `${admin}/mappings/${id}`);
      assert(removed.status === 200, 'DELETE /mappings/{id} → 200');
    }
  } catch (error) {
    fail(`在线冒烟异常：${error.message}`);
  }
}

console.log(`\n结果：${checks} 项通过，${failures} 项失败`);
process.exit(failures === 0 ? 0 : 1);
