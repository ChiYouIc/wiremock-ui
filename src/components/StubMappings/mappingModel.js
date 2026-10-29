// 表单模型 ⇄ WireMock 载荷（对齐 wiremock-admin-api.json 的 stub-mapping 定义）

export const URL_MATCH_TYPES = [
  { value: 'urlPath', label: '路径精确（urlPath）', placeholder: '/api/users' },
  {
    value: 'urlPathTemplate',
    label: '路径模板（urlPathTemplate，支持 {变量}）',
    placeholder: '/openapi/param2/{version}/{namespace}/{apiName}/{appKey}',
  },
  { value: 'urlPathPattern', label: '路径正则（urlPathPattern）', placeholder: '/api/users/[0-9]+' },
  { value: 'url', label: 'URL 精确（url，含查询串）', placeholder: '/api/users?page=1' },
  { value: 'urlPattern', label: 'URL 正则（urlPattern，含查询串）', placeholder: '/api/users\\?page=[0-9]+' },
];

// urlPathPattern / urlPattern 交给 Java 正则引擎编译，{变量} 会被当成量词；
// 带占位符的路径必须用 urlPathTemplate。
export const REGEX_MATCH_TYPES = new Set(['urlPathPattern', 'urlPattern']);
export const EXACT_MATCH_TYPES = new Set(['urlPath', 'url']);
export const PATH_PARAMETER_MATCH_TYPES = new Set(['urlPathPattern', 'urlPathTemplate']);

const PATH_VARIABLE = /\{[A-Za-z_][\w-]*\}/;

/** 判断值里是否含有 {name} 形式的路径变量 */
export const looksLikePathTemplate = (value) =>
  typeof value === 'string' && PATH_VARIABLE.test(value);

/** 取出路径模板里的全部变量名（不含大括号） */
export const extractPathVariables = (value) => {
  if (typeof value !== 'string') return [];
  return Array.from(value.matchAll(/\{([A-Za-z_][\w-]*)\}/g), (match) => match[1]);
};

const REGEX_META = /[.^$*+?()[\]{}|\\]/;

// 路径模板里除了 {变量} 之外不允许出现的正则元字符（不含 . 和 +，它们在 URL 里很常见）
const TEMPLATE_ILLEGAL_META = /[[\](){}*?^$|\\]/;

/**
 * 判断一个「写法像路径模板」的 URL 是否只由字面量片段和 {变量} 组成。
 * 只有这种值才能无损地从 urlPattern / urlPathPattern 改写成 urlPathTemplate；
 * 含其他正则元字符（.*、\d 等）时返回 null，交由调用方提示用户手改。
 */
export const toPathTemplate = (value) => {
  if (typeof value !== 'string' || !value.startsWith('/')) return null;
  const segments = value.split('/').slice(1);
  const variables = [];
  for (const segment of segments) {
    const variable = /^\{([A-Za-z_][\w-]*)\}$/.exec(segment);
    if (variable) {
      variables.push(variable[1]);
      continue;
    }
    if (REGEX_META.test(segment)) return null;
  }
  return variables.length > 0 ? { urlPathTemplate: value, variables } : null;
};

export const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS', 'TRACE', 'ANY'];

export const FAULTS = [
  'CONNECTION_RESET_BY_PEER',
  'EMPTY_RESPONSE',
  'MALFORMED_RESPONSE_CHUNK',
  'RANDOM_DATA_THEN_CLOSE',
];

export const BODY_MATCHERS = [
  { value: 'equalTo', label: '等于（字符串）', takesValue: true },
  { value: 'equalToJson', label: '等于（JSON）', takesValue: true, jsonOptions: true },
  { value: 'equalToXml', label: '等于（XML）', takesValue: true },
  { value: 'contains', label: '包含', takesValue: true },
  { value: 'doesNotContain', label: '不包含', takesValue: true },
  { value: 'matches', label: '正则匹配', takesValue: true },
  { value: 'doesNotMatch', label: '正则不匹配', takesValue: true },
  { value: 'matchesJsonPath', label: 'JSONPath 匹配', takesValue: true },
  { value: 'matchesXPath', label: 'XPath 匹配', takesValue: true },
  { value: 'matchesJsonSchema', label: 'JSON Schema', takesValue: true },
  { value: 'equalToDateTime', label: '时间等于', takesValue: true },
  { value: 'before', label: '时间早于', takesValue: true },
  { value: 'after', label: '时间晚于', takesValue: true },
  { value: 'absent', label: '字段不存在', takesValue: false },
];

const BODY_MATCHER_KEYS = BODY_MATCHERS.map((item) => item.value);
const TAKES_VALUE = new Set(BODY_MATCHERS.filter((item) => item.takesValue).map((item) => item.value));

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const isEmpty = (value) =>
  value === undefined || value === null || value === '';

export const getDefaultFormValues = () => ({
  name: '',
  priority: 5,
  scenarioName: '',
  requiredScenarioState: '',
  newScenarioState: '',
  persistent: false,
  metadata: { wmui: { description: '', group: '' } },
  request: {
    method: 'GET',
    urlMatchType: 'urlPath',
    urlValue: '',
    scheme: undefined,
    host: undefined,
    port: undefined,
    queryParameters: {},
    headers: {},
    cookies: {},
    formParameters: {},
    pathParameters: {},
    bodyMatchers: [],
    basicAuth: { username: '', password: '' },
  },
  response: {
    status: 200,
    statusMessage: '',
    headers: { 'Content-Type': 'application/json' },
    bodySource: 'body',
    bodyValue: '{}',
    fault: undefined,
    fixedDelayMilliseconds: 0,
    delayType: 'none',
    delayLower: 0,
    delayUpper: 0,
    delayMedian: 0,
    delaySigma: 0,
    chunkedEnabled: false,
    numberOfChunks: 2,
    totalDuration: 1000,
    proxyBaseUrl: '',
    proxyUrlPrefixToRemove: '',
    transformers: '',
    transformerParameters: '',
  },
  webhook: null,
});

const toPairObject = (obj) => (isPlainObject(obj) ? obj : {});

export const MATCHER_MAP_FIELDS = [
  'queryParameters',
  'headers',
  'cookies',
  'formParameters',
  'pathParameters',
];

/**
 * 把 { key: "值" } 这种简写补成 WireMock 要求的断言对象 { key: { equalTo: "值" } }。
 * 服务端对裸字符串会返回 `"1" is not a valid match operation`。
 */
export const coerceMatcherMap = (map) => {
  if (!isPlainObject(map)) return undefined;
  const result = {};
  Object.entries(map).forEach(([key, value]) => {
    if (!key) return;
    if (isPlainObject(value) || Array.isArray(value)) {
      result[key] = value;
      return;
    }
    result[key] = { equalTo: value === undefined || value === null ? '' : String(value) };
  });
  return Object.keys(result).length > 0 ? result : undefined;
};

const isShorthandMatcher = (value) => !isPlainObject(value) && !Array.isArray(value);

/**
 * 键值行模型 → 提交对象。
 * pattern 模式（query/header/cookie/form/path 参数）把裸值包成 {"equalTo": "x"}，
 * plain 模式（响应头 / webhook 请求头）保持纯字符串，服务端这两处只接受字符串。
 */
export const rowsToObject = (rows, valueMode = 'plain') => {
  const result = {};
  (rows || []).forEach((row) => {
    const key = row?.key?.trim();
    if (!key) return;
    if (row.mode === 'predicate') {
      result[key] = row.predicate === 'absent' ? { absent: true } : { [row.predicate]: row.value ?? '' };
      return;
    }
    // text 模式是简写：键填了但值留空的行走「未填写」，不能变成 equalTo ""，
    // 否则会要求请求里该参数/头等于空串，映射永远不命中。
    if (isEmpty(row.value)) return;
    result[key] = valueMode === 'pattern' ? { equalTo: row.value } : row.value;
  });
  return result;
};

const isEmptyPredicate = (matcher) => {
  if (!isPlainObject(matcher)) return isEmpty(matcher);
  const [predicate] = Object.keys(matcher);
  if (predicate === 'absent') return false;
  return isEmpty(matcher[predicate]);
};

const pickStr = (value) => (isEmpty(value) ? undefined : value);

const mapBodyPatternsToForm = (patterns) => {
  if (!Array.isArray(patterns)) return [];
  return patterns.map((pattern) => {
    if (!isPlainObject(pattern)) {
      return { matcher: 'equalTo', value: String(pattern) };
    }
    const matcher = BODY_MATCHER_KEYS.find((key) => key in pattern) || 'equalTo';
    const raw = pattern[matcher];
    return {
      matcher,
      value: matcher === 'absent' ? '' : isPlainObject(raw) ? JSON.stringify(raw) : String(raw ?? ''),
      caseInsensitive: pattern.caseInsensitive === true,
      ignoreArrayOrder: pattern.ignoreArrayOrder !== false,
      ignoreExtraElements: pattern.ignoreExtraElements !== false,
    };
  });
};

const buildBodyPatterns = (matchers) => {
  if (!Array.isArray(matchers)) return undefined;
  const patterns = matchers
    .filter((item) => item && item.matcher)
    .map((item) => {
      if (item.matcher === 'absent') return { absent: true };
      if (TAKES_VALUE.has(item.matcher) && isEmpty(item.value)) return null;

      const pattern = { [item.matcher]: item.value };
      if (item.matcher === 'equalTo' && item.caseInsensitive) {
        pattern.caseInsensitive = true;
      }
      if (item.matcher === 'equalToJson') {
        pattern.ignoreArrayOrder = item.ignoreArrayOrder !== false;
        pattern.ignoreExtraElements = item.ignoreExtraElements !== false;
      }
      return pattern;
    })
    .filter(Boolean);

  return patterns.length > 0 ? patterns : undefined;
};

/** 兼容 4.x 归一化后的数组形态与规范的对象形态 */
export const normalizePostServeActions = (actions) => {
  if (!actions) return [];
  if (Array.isArray(actions)) {
    return actions
      .filter(isPlainObject)
      .map((action) => ({
        name: action.name || 'webhook',
        parameters: isPlainObject(action.parameters) ? action.parameters : {},
      }));
  }
  if (isPlainObject(actions)) {
    return Object.entries(actions).map(([name, parameters]) => ({
      name,
      parameters: isPlainObject(parameters) ? parameters : {},
    }));
  }
  return [];
};

const mapWebhookToForm = (actions) => {
  const webhook = normalizePostServeActions(actions).find((action) => action.name === 'webhook');
  if (!webhook) return null;

  const params = webhook.parameters || {};
  const delayMs = params.delay?.milliseconds ?? params.fixedDelayMilliseconds ?? 0;

  return {
    url: params.url || '',
    method: params.method || 'POST',
    headers: toPairObject(params.headers),
    body: params.body || '',
    delayMilliseconds: Number(delayMs) || 0,
  };
};

const buildWebhook = (webhook) => {
  if (!webhook || isEmpty(webhook.url)) return undefined;

  const parameters = {
    url: webhook.url,
    method: webhook.method || 'POST',
  };
  if (isPlainObject(webhook.headers) && Object.keys(webhook.headers).length > 0) {
    parameters.headers = webhook.headers;
  }
  if (!isEmpty(webhook.body)) {
    parameters.body = webhook.body;
  }
  if (Number(webhook.delayMilliseconds) > 0) {
    parameters.delay = { type: 'fixed', milliseconds: Number(webhook.delayMilliseconds) };
  }

  return { webhook: parameters };
};

const splitTransformers = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseJsonText = (value) => {
  if (!value) return undefined;
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
};

/** 表单值 → WireMock stub-mapping 载荷 */
export const buildMappingPayload = (values) => {
  const request = values.request || {};
  const response = values.response || {};

  const urlMatchType = request.urlMatchType || 'urlPath';
  const requestPayload = { method: request.method || 'GET' };

  if (!isEmpty(request.urlValue)) {
    requestPayload[urlMatchType] = request.urlValue;
  }
  if (!isEmpty(request.scheme)) requestPayload.scheme = request.scheme;
  if (!isEmpty(request.host)) requestPayload.host = request.host;
  if (Number(request.port) > 0) requestPayload.port = Number(request.port);

  const pairFields = ['queryParameters', 'headers', 'cookies', 'formParameters'];
  pairFields.forEach((field) => {
    const value = coerceMatcherMap(request[field]);
    if (value) {
      requestPayload[field] = value;
    }
  });

  if (PATH_PARAMETER_MATCH_TYPES.has(urlMatchType)) {
    const pathParams = coerceMatcherMap(request.pathParameters);
    if (pathParams) {
      requestPayload.pathParameters = pathParams;
    }
  }

  const bodyPatterns = buildBodyPatterns(request.bodyMatchers);
  if (bodyPatterns) requestPayload.bodyPatterns = bodyPatterns;

  const username = request.basicAuth?.username;
  const password = request.basicAuth?.password;
  if (!isEmpty(username) || !isEmpty(password)) {
    requestPayload.basicAuthCredentials = { username: username || '', password: password || '' };
  }

  const metadata = isPlainObject(values.metadata) ? { ...values.metadata } : {};
  if (isPlainObject(metadata.wmui)) {
    if (isEmpty(metadata.wmui.description)) {
      delete metadata.wmui.description;
    }
    if (isEmpty(metadata.wmui.group)) {
      delete metadata.wmui.group;
    }
    if (Object.keys(metadata.wmui).length === 0) {
      delete metadata.wmui;
    }
  }

  const responsePayload = {
    status: Number(response.status) || 200,
  };
  if (!isEmpty(response.statusMessage)) {
    responsePayload.statusMessage = response.statusMessage;
  }
  if (isPlainObject(response.headers) && Object.keys(response.headers).length > 0) {
    responsePayload.headers = response.headers;
  }

  const bodySource = response.bodySource || 'body';
  if (!isEmpty(response.fault)) {
    responsePayload.fault = response.fault;
  } else if (!isEmpty(response.bodyValue)) {
    if (bodySource === 'jsonBody') {
      const parsed = parseJsonText(response.bodyValue);
      responsePayload.jsonBody = parsed === undefined ? response.bodyValue : parsed;
    } else {
      responsePayload[bodySource] = response.bodyValue;
    }
  }

  if (Number(response.fixedDelayMilliseconds) > 0) {
    responsePayload.fixedDelayMilliseconds = Number(response.fixedDelayMilliseconds);
  }
  if (response.delayType === 'uniform') {
    responsePayload.delayDistribution = {
      type: 'uniform',
      lower: Number(response.delayLower) || 0,
      upper: Number(response.delayUpper) || 0,
    };
  } else if (response.delayType === 'lognormal') {
    responsePayload.delayDistribution = {
      type: 'lognormal',
      median: Number(response.delayMedian) || 0,
      sigma: Number(response.delaySigma) || 0,
    };
  }
  if (response.chunkedEnabled) {
    responsePayload.chunkedDribbleDelay = {
      numberOfChunks: Number(response.numberOfChunks) || 1,
      totalDuration: Number(response.totalDuration) || 0,
    };
  }
  if (!isEmpty(response.proxyBaseUrl)) {
    responsePayload.proxyBaseUrl = response.proxyBaseUrl;
  }
  if (!isEmpty(response.proxyUrlPrefixToRemove)) {
    responsePayload.proxyUrlPrefixToRemove = response.proxyUrlPrefixToRemove;
  }
  const transformers = splitTransformers(response.transformers);
  if (transformers.length > 0) {
    responsePayload.transformers = transformers;
    const parameters = parseJsonText(response.transformerParameters);
    if (isPlainObject(parameters) && Object.keys(parameters).length > 0) {
      responsePayload.transformerParameters = parameters;
    }
  }

  const payload = {
    request: requestPayload,
    response: responsePayload,
  };

  if (!isEmpty(values.name)) payload.name = values.name;
  if (Number(values.priority) > 0) payload.priority = Number(values.priority);
  if (!isEmpty(values.scenarioName)) payload.scenarioName = values.scenarioName;
  if (!isEmpty(values.requiredScenarioState)) payload.requiredScenarioState = values.requiredScenarioState;
  if (!isEmpty(values.newScenarioState)) payload.newScenarioState = values.newScenarioState;
  if (values.persistent === true) payload.persistent = true;
  if (Object.keys(metadata).length > 0) payload.metadata = metadata;

  const postServeActions = buildWebhook(values.webhook);
  if (postServeActions) payload.postServeActions = postServeActions;

  return payload;
};

/** WireMock stub-mapping → 表单值 */
export const mapRecordToFormData = (record) => {
  const defaults = getDefaultFormValues();
  if (!record) return defaults;

  const request = record.request || {};
  const response = record.response || {};

  let urlMatchType = 'urlPath';
  let urlValue = '/';
  for (const type of ['url', 'urlPattern', 'urlPathTemplate', 'urlPath', 'urlPathPattern']) {
    if (!isEmpty(request[type])) {
      urlMatchType = type;
      urlValue = request[type];
      break;
    }
  }

  let bodySource = 'body';
  let bodyValue = '';
  if (!isEmpty(response.body)) {
    bodyValue = response.body;
  } else if (response.jsonBody !== undefined) {
    bodySource = 'jsonBody';
    bodyValue = typeof response.jsonBody === 'string'
      ? response.jsonBody
      : JSON.stringify(response.jsonBody, null, 2);
  } else if (!isEmpty(response.base64Body)) {
    bodySource = 'base64Body';
    bodyValue = response.base64Body;
  } else if (!isEmpty(response.bodyFileName)) {
    bodySource = 'bodyFileName';
    bodyValue = response.bodyFileName;
  }

  const distribution = response.delayDistribution;
  let delayType = 'none';
  const delayValues = {
    delayLower: 0,
    delayUpper: 0,
    delayMedian: 0,
    delaySigma: 0,
  };
  if (distribution?.type === 'uniform') {
    delayType = 'uniform';
    delayValues.delayLower = distribution.lower ?? 0;
    delayValues.delayUpper = distribution.upper ?? 0;
  } else if (distribution?.type === 'lognormal') {
    delayType = 'lognormal';
    delayValues.delayMedian = distribution.median ?? 0;
    delayValues.delaySigma = distribution.sigma ?? 0;
  }

  return {
    ...defaults,
    name: record.name || '',
    priority: record.priority ?? 5,
    scenarioName: record.scenarioName || '',
    requiredScenarioState: record.requiredScenarioState || '',
    newScenarioState: record.newScenarioState || '',
    persistent: record.persistent === true,
    metadata: {
      ...(isPlainObject(record.metadata) ? record.metadata : {}),
      wmui: {
        ...(isPlainObject(record.metadata?.wmui) ? record.metadata.wmui : {}),
        description: record.metadata?.wmui?.description || '',
        group: record.metadata?.wmui?.group || '',
      },
    },
    request: {
      method: request.method || 'GET',
      urlMatchType,
      urlValue,
      scheme: request.scheme,
      host: request.host,
      port: request.port,
      queryParameters: toPairObject(request.queryParameters),
      headers: toPairObject(request.headers),
      cookies: toPairObject(request.cookies),
      formParameters: toPairObject(request.formParameters),
      pathParameters: toPairObject(request.pathParameters),
      bodyMatchers: mapBodyPatternsToForm(request.bodyPatterns),
      basicAuth: {
        username: request.basicAuthCredentials?.username || request.basicAuth?.username || '',
        password: request.basicAuthCredentials?.password || request.basicAuth?.password || '',
      },
    },
    response: {
      ...defaults.response,
      status: response.status ?? 200,
      statusMessage: response.statusMessage || '',
      headers: toPairObject(response.headers),
      bodySource,
      bodyValue,
      fault: response.fault,
      fixedDelayMilliseconds: response.fixedDelayMilliseconds ?? 0,
      delayType,
      ...delayValues,
      chunkedEnabled: Boolean(response.chunkedDribbleDelay),
      numberOfChunks: response.chunkedDribbleDelay?.numberOfChunks ?? 2,
      totalDuration: response.chunkedDribbleDelay?.totalDuration ?? 1000,
      proxyBaseUrl: response.proxyBaseUrl || '',
      proxyUrlPrefixToRemove: response.proxyUrlPrefixToRemove || '',
      transformers: Array.isArray(response.transformers) ? response.transformers.join(', ') : '',
      transformerParameters: response.transformerParameters
        ? JSON.stringify(response.transformerParameters, null, 2)
        : '',
    },
    webhook: mapWebhookToForm(record.postServeActions),
  };
};

/** 表单校验，返回 [{ path, message }]（空数组表示通过）；path 用于把错误落到具体字段 */
export const validateMappingForm = (values) => {
  const errors = [];
  const push = (path, message) => errors.push({ path, message });
  const request = values.request || {};
  const response = values.response || {};
  const urlMatchType = request.urlMatchType || 'urlPath';

  if (isEmpty(request.urlValue)) {
    push(['request', 'urlValue'], '请填写 URL 匹配值');
  }
  if (REGEX_MATCH_TYPES.has(urlMatchType) && looksLikePathTemplate(request.urlValue)) {
    push(
      ['request', 'urlValue'],
      `${urlMatchType} 按 Java 正则解析，${request.urlValue} 里的 {变量} 会被当成非法量词（服务端报 Illegal repetition）。` +
        '请改用「路径模板（urlPathTemplate）」，或把 {变量} 改写成 ([^/]+)'
    );
  }
  if (EXACT_MATCH_TYPES.has(urlMatchType) && looksLikePathTemplate(request.urlValue)) {
    push(
      ['request', 'urlValue'],
      `${urlMatchType} 是精确匹配，${request.urlValue} 里的 {变量} 会被当成普通字符，永远匹配不到真实请求。` +
        '请改用「路径模板（urlPathTemplate）」，并在「路径参数」里校验各段取值'
    );
  }
  if (urlMatchType === 'urlPathTemplate' && !isEmpty(request.urlValue)) {
    const leftover = String(request.urlValue).replace(/\{[A-Za-z_][\w-]*\}/g, '');
    if (TEMPLATE_ILLEGAL_META.test(leftover)) {
      push(
        ['request', 'urlValue'],
        '路径模板里只能有字面量片段和 {变量}；[ ] ( ) * ? ^ $ | \\ 会被当成普通字符，请改写成 ([^/]+) 或改用正则匹配方式'
      );
    }
  }
  if (
    PATH_PARAMETER_MATCH_TYPES.has(urlMatchType) &&
    isPlainObject(request.pathParameters) &&
    Object.values(request.pathParameters).some((value) => isEmptyPredicate(value))
  ) {
    push(['request', 'pathParameters'], '路径参数的取值不能为空');
  }
  if (urlMatchType === 'urlPathTemplate' && isPlainObject(request.pathParameters)) {
    const variables = new Set(extractPathVariables(request.urlValue));
    const unknown = Object.keys(request.pathParameters).filter((key) => !variables.has(key));
    if (unknown.length > 0) {
      push(['request', 'pathParameters'], `路径参数 ${unknown.join('、')} 在路径模板里不存在对应变量`);
    }
  }

  MATCHER_MAP_FIELDS.forEach((field) => {
    const map = request[field];
    if (!isPlainObject(map)) return;
    const arrays = Object.entries(map)
      .filter(([, value]) => Array.isArray(value))
      .map(([key]) => key);
    if (arrays.length > 0) {
      push(
        ['request', field],
        `${field} 里的 ${arrays.join('、')} 用了数组，WireMock 只接受断言对象（如 {"equalTo": "x"}）`
      );
    }
  });

  (request.bodyMatchers || []).forEach((item, index) => {
    if (item?.matcher && TAKES_VALUE.has(item.matcher) && isEmpty(item.value)) {
      push(['request', 'bodyMatchers', index, 'value'], `请求体匹配 #${index + 1} 缺少匹配值`);
    }
    if (item?.matcher === 'equalToJson' && !isEmpty(item.value) && parseJsonText(item.value) === undefined) {
      push(['request', 'bodyMatchers', index, 'value'], `请求体匹配 #${index + 1} 不是合法 JSON`);
    }
  });

  if (response.bodySource === 'jsonBody' && !isEmpty(response.bodyValue) && parseJsonText(response.bodyValue) === undefined) {
    push(['response', 'bodyValue'], '响应体声明为 JSON，但内容不是合法 JSON');
  }
  if (response.delayType === 'uniform' && Number(response.delayUpper) < Number(response.delayLower)) {
    push(['response', 'delayUpper'], '随机延时的上限不能小于下限');
  }
  if (response.delayType === 'lognormal' && !(Number(response.delayMedian) > 0 && Number(response.delaySigma) > 0)) {
    push(['response', 'delayMedian'], '对数正态延时需要 median 与 sigma 均大于 0（不支持 lower/upper）');
  }
  if (response.chunkedEnabled && !(Number(response.numberOfChunks) > 0)) {
    push(['response', 'numberOfChunks'], 'chunked 延时的分片数必须大于 0');
  }
  if (!isEmpty(response.transformerParameters)) {
    const parsed = parseJsonText(response.transformerParameters);
    if (!isPlainObject(parsed)) {
      push(['response', 'transformerParameters'], '转换器参数必须是 JSON 对象');
    }
  }

  return errors;
};

/**
 * 导入前归一化：
 * 1. 把「正数字段 / 精确字段里写路径模板」的映射改写成 urlPathTemplate；
 * 2. 把 { key: "值" } 的断言简写补成 { key: { equalTo: "值" } }。
 * 返回 { mappings, converted, coerced, problems }；problems 非空时应阻止导入。
 */
export const normalizeImportedMappings = (mappings) => {
  const converted = [];
  const coerced = [];
  const problems = [];
  const result = (mappings || []).map((mapping) => {
    const request = mapping?.request;
    if (!isPlainObject(request)) return mapping;

    let next = { ...request };
    let touched = false;

    for (const type of [...REGEX_MATCH_TYPES, ...EXACT_MATCH_TYPES]) {
      if (!looksLikePathTemplate(next[type])) continue;
      const template = toPathTemplate(next[type]);
      if (!template) {
        problems.push({
          name: mapping.name || next[type],
          reason: `${type} 里含有 {变量}，同时又混用了正则元字符，需要手工改成 urlPathTemplate`,
        });
        return mapping;
      }
      delete next[type];
      next.urlPathTemplate = template.urlPathTemplate;
      converted.push({ name: mapping.name || template.urlPathTemplate, from: type });
      touched = true;
      break;
    }

    MATCHER_MAP_FIELDS.forEach((field) => {
      const value = next[field];
      if (!isPlainObject(value)) return;
      const shorthand = Object.keys(value).filter((key) => isShorthandMatcher(value[key]));
      if (shorthand.length === 0) return;
      next[field] = coerceMatcherMap(value);
      coerced.push({ name: mapping.name || next.urlPathTemplate || '-', field, keys: shorthand });
      touched = true;
    });

    return touched ? { ...mapping, request: next } : mapping;
  });

  return { mappings: result, converted, coerced, problems };
};

export const getRequestSummary = (record) => {
  const request = record?.request || {};
  const url =
    request.url ||
    request.urlPattern ||
    request.urlPath ||
    request.urlPathTemplate ||
    request.urlPathPattern ||
    '-';
  return `${request.method || 'ANY'} ${url}`;
};
