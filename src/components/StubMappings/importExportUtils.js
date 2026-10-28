import { notification } from 'antd';
import { stubMappingsApi } from '../../services/wiremockApi';
import { showApiError } from '../../services/wiremockErrors';

// 导出映射
export const handleExport = (mappings, selectedRowKeys) => {
  try {
    let exportMappings = mappings;
    let fileName = 'wiremock-mappings-all';

    if (selectedRowKeys.length > 0) {
      exportMappings = mappings.filter((mapping) => selectedRowKeys.includes(mapping.id));
      fileName = 'wiremock-mappings-selected';
    }

    const dataStr = JSON.stringify({ mappings: exportMappings }, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    notification.success({
      message: '导出成功',
      description: `已导出 ${exportMappings.length} 个映射配置`,
    });
  } catch (error) {
    showApiError(error, '导出失败');
  }
};

const extractMappings = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.mappings)) return payload.mappings;
  if (payload && payload.request && payload.response) return [payload];
  return [];
};

// 导入映射：使用规范提供的 POST /__admin/mappings/import
export const handleImport = (file, fetchMappings) => {
  if (!file.type.includes('json') && !file.name.endsWith('.json')) {
    notification.error({ message: '文件类型错误', description: '请选择 JSON 格式的文件' });
    return false;
  }

  if (file.size > 10 * 1024 * 1024) {
    notification.error({ message: '文件过大', description: '文件大小不能超过 10MB' });
    return false;
  }

  const reader = new FileReader();
  reader.onload = async (e) => {
    let mappings;
    try {
      mappings = extractMappings(JSON.parse(e.target.result));
    } catch {
      notification.error({ message: '导入失败', description: '文件不是合法的 JSON' });
      return;
    }

    if (mappings.length === 0) {
      notification.error({ message: '导入失败', description: '文件中没有找到有效的映射数据' });
      return;
    }

    try {
      await stubMappingsApi.import({ mappings });
      notification.success({
        message: '导入完成',
        description: `已导入 ${mappings.length} 个映射`,
      });
      fetchMappings();
    } catch (error) {
      showApiError(error, '导入失败');
    }
  };

  reader.onerror = () => {
    notification.error({ message: '文件读取失败', description: '无法读取选择的文件' });
  };

  reader.readAsText(file);
  return false;
};

// 过滤映射
export const filterMappings = (mappings, searchText) => {
  if (!searchText) return mappings;

  const searchLower = searchText.toLowerCase();
  return mappings.filter((mapping) => {
    const request = mapping.request || {};
    const haystack = [
      request.url,
      request.urlPattern,
      request.urlPath,
      request.urlPathPattern,
      request.method,
      mapping.name,
      mapping.scenarioName,
      mapping.metadata?.wmui?.description,
      mapping.metadata ? JSON.stringify(mapping.metadata) : '',
    ];
    return haystack.some((value) => typeof value === 'string' && value.toLowerCase().includes(searchLower));
  });
};
