import axios from 'axios';
import { getActiveTarget, toAdminBaseUrl } from './targets';

// 所有端点对齐 wiremock-admin-api.json（WireMock 3.12.2 契约）。
// 该契约同时被 WireMock 4.x 接受，版本差异由 services/capabilities.js 在运行时处理。
// baseURL 由「多实例」选择决定：留空走同源代理，否则直连目标（WireMock 的 /__admin 自带 CORS）。
const api = axios.create({
  baseURL: toAdminBaseUrl(getActiveTarget()),
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const applyTarget = (target) => {
  api.defaults.baseURL = toAdminBaseUrl(target);
};

export const getApiBaseUrl = () => api.defaults.baseURL;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const pointer = error.response?.data?.errors?.[0]?.source?.pointer;
    console.error(
      'WireMock API 错误:',
      error.config?.method?.toUpperCase(),
      error.config?.url,
      error.response?.status,
      pointer || '',
      error.message
    );
    return Promise.reject(error);
  }
);

const patternBody = (pattern) => pattern || {};

// ---------------- Stub Mappings ----------------
export const stubMappingsApi = {
  getAll: (params = {}) => api.get('/mappings', { params }),
  getById: (id) => api.get(`/mappings/${id}`),
  create: (data) => api.post('/mappings', data),
  update: (id, data) => api.put(`/mappings/${id}`, data),
  remove: (id) => api.delete(`/mappings/${id}`),
  removeAll: () => api.delete('/mappings'),
  reset: () => api.post('/mappings/reset'),
  save: () => api.post('/mappings/save'),
  import: (payload) => api.post('/mappings/import', payload),
  findByMetadata: (pattern) => api.post('/mappings/find-by-metadata', patternBody(pattern)),
  removeByMetadata: (pattern) => api.post('/mappings/remove-by-metadata', patternBody(pattern)),
  getUnmatched: () => api.get('/mappings/unmatched'),
  removeUnmatched: () => api.delete('/mappings/unmatched'),
};

// ---------------- Requests ----------------
export const requestsApi = {
  getAll: (params = {}) => api.get('/requests', { params }),
  getById: (id) => api.get(`/requests/${id}`),
  removeById: (id) => api.delete(`/requests/${id}`),
  removeAll: () => api.delete('/requests'),
  resetJournal: () => api.post('/requests/reset'),
  count: (pattern) => api.post('/requests/count', patternBody(pattern)),
  remove: (pattern) => api.post('/requests/remove', patternBody(pattern)),
  removeByMetadata: (pattern) => api.post('/requests/remove-by-metadata', patternBody(pattern)),
  find: (pattern) => api.post('/requests/find', patternBody(pattern)),
  getUnmatched: () => api.get('/requests/unmatched'),
  getNearMissesForUnmatched: () => api.get('/requests/unmatched/near-misses'),
};

// ---------------- Near misses ----------------
export const nearMissesApi = {
  forRequest: (loggedRequest) => api.post('/near-misses/request', loggedRequest),
  forRequestPattern: (pattern) => api.post('/near-misses/request-pattern', pattern),
};

// ---------------- Recordings ----------------
export const recordingsApi = {
  start: (recordSpec) => api.post('/recordings/start', recordSpec),
  stop: () => api.post('/recordings/stop'),
  status: () => api.get('/recordings/status'),
  snapshot: (recordSpec) => api.post('/recordings/snapshot', recordSpec),
};

// ---------------- Scenarios ----------------
export const scenariosApi = {
  getAll: () => api.get('/scenarios'),
  resetAll: () => api.post('/scenarios/reset'),
};

// ---------------- Files ----------------
export const filesApi = {
  list: () => api.get('/files'),
  get: (name) => api.get(`/files/${encodeURIComponent(name)}`, { responseType: 'text' }),
  put: (name, content) =>
    api.put(`/files/${encodeURIComponent(name)}`, content, {
      headers: { 'Content-Type': 'application/octet-stream' },
    }),
  remove: (name) => api.delete(`/files/${encodeURIComponent(name)}`),
};

// ---------------- System ----------------
export const systemApi = {
  getVersion: () => api.get('/version'),
  getHealth: () => api.get('/health'),
  // 仅在 WireMock 4.x 存在，3.x 返回 404
  getSettings: () => api.get('/settings'),
  updateSettings: (body) => api.post('/settings', body),
  resetAll: () => api.post('/reset'),
  shutdown: () => api.post('/shutdown'),
};

export default api;
