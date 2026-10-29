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
  normalizeImportedMappings,
  rowsToObject,
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

  const urlFields = ['url', 'urlPath', 'urlPattern', 'urlPathPattern', 'urlPathTemplate'].filter(
    (key) => key in request
  );
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
    // 测试用的「无关 URL」默认给一个合法值；默认空 URL 的行为在 [1] 里单独验证
    request: { ...base.request, urlValue: '/', ...(overrides.request || {}) },
    response: { ...base.response, ...(overrides.response || {}) },
  };
};

console.log('契约测试：wiremock-admin-api.json (WireMock 3.12.2)');

// 1. 默认表单
{
  console.log('\n[1] 默认表单');
  const defaults = getDefaultFormValues();
  const payload = buildMappingPayload(defaults);
  validateStubMapping(payload, '默认载荷');
  assert(!('urlPath' in payload.request), '新建默认不填 URL（避免误建 GET /）');
  assert(
    validateMappingForm(defaults).some((error) => error.path?.join('.') === 'request.urlValue'),
    '默认表单被本地校验拦下并指向 request.urlValue'
  );

  const filled = withOverrides({ request: { urlMatchType: 'urlPath', urlValue: '/' } });
  const filledPayload = buildMappingPayload(filled);
  validateStubMapping(filledPayload, '填写 URL 后的载荷');
  assertServerRules(filledPayload, '填写 URL 后的载荷');
  assert(filledPayload.request.urlPath === '/', 'urlPath 精确匹配按原样下发');
  assert(validateMappingForm(filled).length === 0, '填写 URL 后通过本地校验');
}

// 2. URL 匹配方式互斥
{
  console.log('\n[2] URL 匹配方式互斥');
  ['url', 'urlPath', 'urlPattern', 'urlPathPattern', 'urlPathTemplate'].forEach((type) => {
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

// 9. 路径模板（urlPathTemplate）
{
  console.log('\n[9] 路径模板');
  const template = '/openapi/param2/{version}/{namespace}/{apiName}/{appKey}';
  const values = withOverrides({
    request: {
      urlMatchType: 'urlPathTemplate',
      urlValue: template,
      pathParameters: { version: { equalTo: 'v2' } },
    },
  });
  const payload = buildMappingPayload(values);
  validateStubMapping(payload, 'urlPathTemplate 载荷');
  assertServerRules(payload, 'urlPathTemplate 载荷');
  assert(payload.request.urlPathTemplate === template, 'urlPathTemplate 原样下发模板（不做正则转义）');
  assert(payload.request.pathParameters?.version?.equalTo === 'v2', 'urlPathTemplate 下保留 pathParameters');
  assert(validateMappingForm(values).length === 0, '路径模板表单通过本地校验');

  // 服务端会把 urlPathPattern 当 Java 正则编译，{version} 会报 Illegal repetition
  const regexWithTemplate = withOverrides({
    request: { urlMatchType: 'urlPathPattern', urlValue: template },
  });
  assert(
    validateMappingForm(regexWithTemplate).some((error) => error.message.includes('urlPathTemplate')),
    '本地校验拦截「正数字段里写路径模板」'
  );

  // 精确匹配里写模板：永远命中不到真实请求
  const exactWithTemplate = withOverrides({
    request: { urlMatchType: 'urlPath', urlValue: template },
  });
  assert(
    validateMappingForm(exactWithTemplate).some(
      (error) => error.message.includes('永远匹配不到') && error.path?.join('.') === 'request.urlValue'
    ),
    '本地校验拦截「精确匹配里写路径模板」并指向 urlValue'
  );

  // 模板里混用正则元字符
  const metaInTemplate = withOverrides({
    request: { urlMatchType: 'urlPathTemplate', urlValue: '/users/[0-9]+' },
  });
  assert(
    validateMappingForm(metaInTemplate).some((error) => error.message.includes('字面量')),
    '本地校验拦截「模板里混用正则元字符」'
  );

  const unknownParam = withOverrides({
    request: {
      urlMatchType: 'urlPathTemplate',
      urlValue: '/users/{userId}',
      pathParameters: { id: { equalTo: '1' } },
    },
  });
  assert(
    validateMappingForm(unknownParam).some((error) => error.message.includes('id')),
    '本地校验拦截模板里不存在的路径参数'
  );

  const roundTrip = buildMappingPayload(
    mapRecordToFormData({ request: { method: 'GET', urlPathTemplate: template } })
  );
  assert(roundTrip.request.urlPathTemplate === template, 'urlPathTemplate 可回读回写');
}

// 10. 导入归一化：urlPattern 里的 {变量} 自动改为 urlPathTemplate
{
  console.log('\n[10] 导入归一化');
  const imported = [
    {
      name: '创建订单',
      request: {
        method: 'POST',
        urlPattern: '/openapi/param2/{version}/{namespace}/{apiName}/{appKey}',
        bodyPatterns: [{ matches: '.*594237325375.*' }],
      },
      response: { status: 200, jsonBody: { success: true } },
    },
  ];
  const { mappings, converted, problems } = normalizeImportedMappings(imported);
  assert(problems.length === 0, '纯 {变量} 路径不产生 problem');
  assert(converted.length === 1, '识别出 1 个需要改写的映射');
  assert(
    mappings[0].request.urlPathTemplate === imported[0].request.urlPattern,
    'urlPattern 改写为 urlPathTemplate'
  );
  assert(!('urlPattern' in mappings[0].request), '改写后不再保留 urlPattern');
  assert(mappings[0].request.bodyPatterns?.length === 1, '其余字段原样保留');
  validateStubMapping({ request: mappings[0].request, response: mappings[0].response }, '“创建订单”');

  const mixed = normalizeImportedMappings([
    { name: '混用', request: { urlPattern: '/api/{id}/.*' } },
  ]);
  assert(mixed.problems.length === 1, '混用正则元字符时报告 problem 而不是瞎改');

  const plain = normalizeImportedMappings([{ name: '普通', request: { urlPathPattern: '/api/[0-9]+' } }]);
  assert(plain.converted.length === 0 && plain.problems.length === 0, '真正的正则不受影响');
}

// 11. 断言简写：{"version": "1"} → {"version": {"equalTo": "1"}}
{
  console.log('\n[11] 断言简写');
  const shorthandValues = withOverrides({
    request: {
      urlMatchType: 'urlPathTemplate',
      urlValue: '/openapi/param2/{version}/{namespace}/{apiName}/{appKey}',
      queryParameters: { version: 1, namespace: 'com.alibaba.trade', apiName: 'alibaba.trade.createCrossOrder' },
      headers: { 'Content-Type': 'application/json', 'X-Num': 2 },
    },
  });
  const payload = buildMappingPayload(shorthandValues);
  validateStubMapping(payload, '断言简写载荷');
  assert(payload.request.queryParameters.version.equalTo === '1', '数字被补成 equalTo 字符串');
  assert(
    payload.request.queryParameters.namespace.equalTo === 'com.alibaba.trade',
    '字符串被补成 equalTo'
  );
  assert(payload.request.headers['X-Num'].equalTo === '2', 'headers 同样补成 equalTo');

  const importedForm = normalizeImportedMappings([
    {
      name: '创建订单(urlPath)',
      request: {
        method: 'POST',
        urlPath: '/openapi/param2/{version}/{namespace}/{apiName}/{appKey}',
        queryParameters: { version: '1', namespace: 'com.alibaba.trade' },
      },
    },
  ]);
  assert(importedForm.problems.length === 0, 'urlPath 写模板不算 problem');
  assert(importedForm.converted[0]?.from === 'urlPath', 'urlPath 里的模板改写成 urlPathTemplate');
  assert(
    importedForm.mappings[0].request.queryParameters.version.equalTo === '1',
    '导入时把断言简写补齐'
  );
  assert(importedForm.coerced.length === 1, '导入时统计补齐的键值数');

  const noPairs = buildMappingPayload(getDefaultFormValues());
  assert(typeof noPairs.request.queryParameters === 'undefined', '没有键值时不写空对象');

  const arrayParam = validateMappingForm(
    withOverrides({ request: { urlValue: '/', queryParameters: { tag: ['a', 'b'] } } })
  );
  assert(
    arrayParam.some((error) => error.message.includes('数组') && error.path?.join('.') === 'request.queryParameters'),
    '数组形态的参数值被拦下而不是静默丢弃'
  );
}

// 12. 键值编辑器：pattern 模式包断言，plain 模式保持字符串，空值行忽略
{
  console.log('\n[12] 键值编辑器');
  const rows = [
    { key: 'version', mode: 'text', value: '1' },
    { key: 'trace', mode: 'predicate', predicate: 'absent' },
    { key: 'empty', mode: 'text', value: '' },
  ];
  const pattern = rowsToObject(rows, 'pattern');
  assert(pattern.version.equalTo === '1', 'pattern 模式下裸值包成 equalTo');
  assert(pattern.trace.absent === true, 'predicate 模式保持断言');
  assert(!('empty' in pattern), 'text 模式空值行被忽略（不会变成 equalTo ""）');

  const headerRows = [{ key: 'Content-Type', mode: 'text', value: 'application/json' }];
  const plain = rowsToObject(headerRows, 'plain');
  assert(plain['Content-Type'] === 'application/json', 'plain 模式保持纯字符串');

  const payload = buildMappingPayload(
    withOverrides({
      response: { headers: plain },
      webhook: { url: 'https://example.com/cb', method: 'POST', headers: plain },
    })
  );
  validateStubMapping(payload, '响应头/webhook 头载荷');
  assert(
    typeof payload.response.headers['Content-Type'] === 'string',
    '响应头仍是字符串（服务端只接受字符串映射）'
  );
  assert(
    typeof payload.postServeActions.webhook.headers['Content-Type'] === 'string',
    'webhook 请求头仍是字符串'
  );
}

// ---- 可选的在线冒烟 ----
const liveMode = process.argv.includes('--live');
if (liveMode) {
  const base = (process.env.WM_URL || 'http://localhost:8080').replace(/\/$/, '');
  const admin = `${base}/__admin`;
  console.log(`\n[13] 在线冒烟：${admin}`);

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
