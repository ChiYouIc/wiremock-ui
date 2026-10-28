import { isMatched, getResponseStatus } from './requestUtils';

/**
 * @param {Array} requests
 * @param {string} searchText
 * @param {string} methodFilter
 * @param {string} statusFilter 形如 2xx / 4xx
 * @param {boolean} onlyUnmatched
 */
export const filterRequests = (requests, searchText, methodFilter, statusFilter, onlyUnmatched) => {
  const searchLower = (searchText || '').toLowerCase();

  return requests.filter((record) => {
    if (methodFilter && record.request?.method !== methodFilter) return false;

    if (statusFilter) {
      const status = getResponseStatus(record);
      const bucket = status ? `${Math.floor(status / 100)}xx` : null;
      if (bucket !== statusFilter) return false;
    }

    if (onlyUnmatched && isMatched(record)) return false;

    if (!searchLower) return true;

    const haystack = [
      record.request?.url,
      record.request?.absoluteUrl,
      record.request?.method,
      record.request?.clientIp,
      record.stubMapping?.name,
    ];
    return haystack.some(
      (value) => typeof value === 'string' && value.toLowerCase().includes(searchLower)
    );
  });
};
