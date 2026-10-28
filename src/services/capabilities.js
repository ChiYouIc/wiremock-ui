import { systemApi } from './wiremockApi';

const STORAGE_KEY = 'wmui.capabilities';

const defaults = {
  reachable: false,
  version: null,
  major: null,
  supportsHealth: false,
  supportsSettingsRead: false,
  // WireMock 4.x 的 GET/POST /settings 使用 { "settings": {...} } 信封
  settingsEnvelope: false,
  detectedAt: null,
};

let current = { ...defaults };

export const getCapabilities = () => current;

const isNotFound = (error) => error?.response?.status === 404;

/**
 * 探测运行时能力。规范（3.12.2）与 WireMock 4.x 在 /settings 与 /version 上存在差异，
 * 这里只探测「读」能力，写请求始终使用规范形态。
 */
export const detectCapabilities = async () => {
  let version = null;
  let supportsHealth = false;

  try {
    const health = await systemApi.getHealth();
    supportsHealth = true;
    version = health.data?.version || null;
  } catch {
    try {
      const res = await systemApi.getVersion();
      version = res.data?.version || null;
    } catch {
      version = null;
    }
  }

  let supportsSettingsRead = false;
  let settingsEnvelope = false;

  try {
    const res = await systemApi.getSettings();
    supportsSettingsRead = true;
    settingsEnvelope = Boolean(res.data && typeof res.data === 'object' && res.data.settings);
  } catch (error) {
    if (!isNotFound(error)) {
      supportsSettingsRead = true;
    }
  }

  const major = version ? Number.parseInt(version.split('.')[0], 10) : null;

  current = {
    reachable: Boolean(version) || supportsSettingsRead,
    version,
    major: Number.isNaN(major) ? null : major,
    supportsHealth,
    supportsSettingsRead,
    settingsEnvelope,
    detectedAt: Date.now(),
  };

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {
    // 忽略存储失败（隐私模式等）
  }

  return current;
};

/** 4.x 的 POST /settings 需要 { settings: {...} } 信封 */
export const toSettingsPayload = (settings) =>
  current.settingsEnvelope ? { settings } : settings;

/** 4.x 的 GET /settings 返回 { settings: {...} } */
export const unwrapSettings = (body) =>
  body && typeof body === 'object' && body.settings ? body.settings : body;

try {
  const cached = sessionStorage.getItem(STORAGE_KEY);
  if (cached) {
    current = { ...defaults, ...JSON.parse(cached) };
  }
} catch {
  // 忽略缓存读取失败
}
