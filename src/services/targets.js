// 多实例（"工作空间"）配置：保存在 localStorage
const TARGETS_KEY = 'wmui.targets';
const ACTIVE_KEY = 'wmui.activeTarget';

export const DEFAULT_TARGET = {
  id: 'same-origin',
  name: '本机（同源代理）',
  baseUrl: '',
};

const normalizeBaseUrl = (value = '') => value.trim().replace(/\/+$/, '');

export const toAdminBaseUrl = (target) => {
  const base = normalizeBaseUrl(target?.baseUrl);
  return base ? `${base}/__admin` : '/__admin';
};

const sanitize = (target) => ({
  id: target.id || `t-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  name: (target.name || '').trim() || '未命名实例',
  baseUrl: normalizeBaseUrl(target.baseUrl),
});

export const loadTargets = () => {
  try {
    const raw = localStorage.getItem(TARGETS_KEY);
    const list = raw ? JSON.parse(raw) : [];
    const safe = Array.isArray(list) ? list.map(sanitize) : [];
    return safe.length > 0 ? safe : [DEFAULT_TARGET];
  } catch {
    return [DEFAULT_TARGET];
  }
};

export const saveTargets = (targets) => {
  const safe = (Array.isArray(targets) ? targets : []).map(sanitize);
  const withDefault = safe.some((t) => t.id === DEFAULT_TARGET.id)
    ? safe
    : [DEFAULT_TARGET, ...safe];
  localStorage.setItem(TARGETS_KEY, JSON.stringify(withDefault));
  return withDefault;
};

export const getActiveTargetId = () => localStorage.getItem(ACTIVE_KEY) || DEFAULT_TARGET.id;

export const setActiveTargetId = (id) => localStorage.setItem(ACTIVE_KEY, id);

export const getActiveTarget = () => {
  const targets = loadTargets();
  const activeId = getActiveTargetId();
  return targets.find((t) => t.id === activeId) || targets[0] || DEFAULT_TARGET;
};

export const isValidBaseUrl = (value) => {
  const base = normalizeBaseUrl(value);
  if (!base) return true; // 留空表示走同源代理
  try {
    const url = new URL(base);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
};
