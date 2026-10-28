import { notification } from 'antd';

/**
 * WireMock returns 422 with a body shaped like the `bad-request-entity` schema:
 * { errors: [{ code, source: { pointer }, title, detail }] }
 */
export const parseApiError = (error) => {
  if (!error) {
    return { title: '未知错误', status: 0, details: [] };
  }

  const response = error.response;
  if (!response) {
    return {
      title: '无法连接到 WireMock 服务',
      status: 0,
      details: [{ pointer: '', detail: error.message || '网络错误' }],
    };
  }

  const body = response.data;
  const details = Array.isArray(body?.errors)
    ? body.errors.map((item) => ({
        pointer: item?.source?.pointer || '',
        detail: item?.detail || item?.title || '',
        code: item?.code,
      }))
    : [];

  if (details.length === 0) {
    details.push({
      pointer: '',
      detail:
        (typeof body === 'string' && body) ||
        body?.message ||
        response.statusText ||
        error.message,
    });
  }

  const titleByStatus = {
    400: '请求参数错误',
    404: '资源不存在',
    405: 'HTTP 方法不受支持',
    415: 'Content-Type 不被支持',
    422: 'WireMock 校验失败',
    500: 'WireMock 内部错误',
  };

  return {
    title: titleByStatus[response.status] || `请求失败 (${response.status})`,
    status: response.status,
    details,
  };
};

const formatDetail = ({ pointer, detail }) =>
  pointer ? `${pointer}: ${detail}` : detail;

export const describeApiError = (error) => {
  const { title, details } = parseApiError(error);
  const lines = details.slice(0, 5).map(formatDetail).filter(Boolean);
  return lines.length > 0 ? `${title}\n${lines.join('\n')}` : title;
};

export const showApiError = (error, message) => {
  const { title, details } = parseApiError(error);
  const lines = details.slice(0, 5).map(formatDetail).filter(Boolean);

  notification.error({
    message: message || title,
    description: lines.length > 0 ? lines.join('\n') : undefined,
    duration: 6,
    style: { whiteSpace: 'pre-line' },
  });
};
