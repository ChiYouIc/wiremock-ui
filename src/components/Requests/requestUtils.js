import React from 'react';
import dayjs from 'dayjs';

export const formatTime = (timestamp, dateString) => {
  if (timestamp) return dayjs(timestamp).format('YYYY-MM-DD HH:mm:ss.SSS');
  if (dateString) return dayjs(dateString).format('YYYY-MM-DD HH:mm:ss.SSS');
  return '-';
};

export const formatJson = (value) => {
  if (!value) return '';
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value, null, 2);
};

// 日志条目的时间：优先 request.loggedDate
export const getLoggedDate = (record) =>
  record?.request?.loggedDate ?? record?.loggedDate ?? record?.request?.loggedDateString;

// 匹配状态：优先 wasMatched；否则看 stubMapping，注意未命中时 WireMock 会返回
// 一个 response.fromConfiguredStub=false 的占位映射（method=ANY），不能算作命中
export const isMatched = (record) => {
  if (typeof record?.wasMatched === 'boolean') return record.wasMatched;
  const stub = record?.stubMapping;
  if (!stub) return false;
  if (stub.response?.fromConfiguredStub === false) return false;
  return Boolean(stub.id);
};

export const getResponseStatus = (record) =>
  record?.response?.status ?? record?.responseDefinition?.status ?? null;

export const parseQueryParams = (queryParams) => {
  if (!queryParams) return [];
  return Object.entries(queryParams).map(([key, value]) => ({
    key,
    name: key,
    value: Array.isArray(value?.values) ? value.values.join(', ') : value?.values ?? value,
  }));
};

export const parseHeaders = (headers) => {
  if (!headers) return [];
  return Object.entries(headers).map(([key, value]) => ({
    key,
    name: key,
    value: Array.isArray(value) ? value.join(', ') : String(value ?? ''),
  }));
};

export const getMatchedStubInfo = (record) => {
  if (!record?.stubMapping) return null;
  return {
    id: record.stubMapping.id,
    name: record.stubMapping.name,
    priority: record.stubMapping.priority,
    scenario: record.stubMapping.scenarioName,
    description: record.stubMapping.metadata?.wmui?.description,
    request: record.stubMapping.request,
  };
};

// subEvents 不是规范字段，仅在自定义扩展提供时展示
export const getWebhookEvents = (record) => {
  if (!Array.isArray(record?.subEvents)) return [];
  return record.subEvents.filter(
    (event) => event.type === 'WEBHOOK_REQUEST' || event.type === 'WEBHOOK_RESPONSE'
  );
};

export const getStatusColor = (status) => {
  if (!status) return 'orange';
  if (status >= 200 && status < 300) return 'green';
  if (status >= 400) return 'red';
  return 'orange';
};

export const getTableColumns = () => [
  { title: '头部名称', dataIndex: 'name', key: 'name', width: '30%' },
  {
    title: '头部值',
    dataIndex: 'value',
    key: 'value',
    render: (text) =>
      React.createElement(
        'span',
        { style: { fontFamily: 'monospace', fontSize: '12px' } },
        text
      ),
  },
];

export const getParamTableColumns = () => [
  { title: '参数名', dataIndex: 'name', key: 'name', width: '30%' },
  {
    title: '参数值',
    dataIndex: 'value',
    key: 'value',
    render: (text) =>
      React.createElement(
        'span',
        { style: { fontFamily: 'monospace', fontSize: '12px' } },
        text
      ),
  },
];
