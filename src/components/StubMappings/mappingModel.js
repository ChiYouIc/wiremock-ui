// 表单模型 ⇄ WireMock 载荷（对齐 wiremock-admin-api.json 的 stub-mapping 定义）

export const URL_MATCH_TYPES = [
  { value: 'urlPath', label: '路径精确（urlPath）', placeholder: '/api/users' },
  { value: 'urlPathPattern', label: '路径正则（urlPathPattern）', placeholder: '/api/users/[0-9]+' },
  { value: 'url', label: 'URL 精确（url，含查询串）', placeholder: '/api/users?page=1' },
  { value: 'urlPattern', label: 'URL 正则（urlPattern，含查询串）', placeholder: '/api/users\\?page=[0-9]+' },
];

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
    urlValue: '/',
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
    const value = request[field];
    if (isPlainObject(value) && Object.keys(value).length > 0) {
      requestPayload[field] = value;
    }
  });

  if (urlMatchType === 'urlPathPattern') {
    const pathParams = request.pathParameters;
    if (isPlainObject(pathParams) && Object.keys(pathParams).length > 0) {
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
  for (const type of ['url', 'urlPattern', 'urlPath', 'urlPathPattern']) {
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

/** 表单校验，返回错误消息数组（空数组表示通过） */
export const validateMappingForm = (values) => {
  const errors = [];
  const request = values.request || {};
  const response = values.response || {};

  if (isEmpty(request.urlValue)) {
    errors.push('请填写 URL 匹配值');
  }
  if (
    request.urlMatchType === 'urlPathPattern' &&
    isPlainObject(request.pathParameters) &&
    Object.values(request.pathParameters).some((value) => isEmpty(value))
  ) {
    errors.push('路径参数的取值不能为空');
  }

  (request.bodyMatchers || []).forEach((item, index) => {
    if (item?.matcher && TAKES_VALUE.has(item.matcher) && isEmpty(item.value)) {
      errors.push(`请求体匹配 #${index + 1} 缺少匹配值`);
    }
    if (item?.matcher === 'equalToJson' && !isEmpty(item.value) && parseJsonText(item.value) === undefined) {
      errors.push(`请求体匹配 #${index + 1} 不是合法 JSON`);
    }
  });

  if (response.bodySource === 'jsonBody' && !isEmpty(response.bodyValue) && parseJsonText(response.bodyValue) === undefined) {
    errors.push('响应体声明为 JSON，但内容不是合法 JSON');
  }
  if (response.delayType === 'uniform' && Number(response.delayUpper) < Number(response.delayLower)) {
    errors.push('延时的上限不能小于下限');
  }
  if (response.delayType === 'lognormal' && !(Number(response.delayMedian) > 0 && Number(response.delaySigma) > 0)) {
    errors.push('对数正态延时需要 median 与 sigma 均大于 0（不支持 lower/upper）');
  }
  if (response.chunkedEnabled && !(Number(response.numberOfChunks) > 0)) {
    errors.push('chunked 延时的分片数必须大于 0');
  }
  if (!isEmpty(response.transformerParameters)) {
    const parsed = parseJsonText(response.transformerParameters);
    if (!isPlainObject(parsed)) {
      errors.push('转换器参数必须是 JSON 对象');
    }
  }

  return errors;
};

export const getRequestSummary = (record) => {
  const request = record?.request || {};
  const url =
    request.url || request.urlPattern || request.urlPath || request.urlPathPattern || '-';
  return `${request.method || 'ANY'} ${url}`;
};
