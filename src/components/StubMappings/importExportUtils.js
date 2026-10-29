import { notification, Modal } from 'antd';
import { stubMappingsApi } from '../../services/wiremockApi';
import { showApiError } from '../../services/wiremockErrors';
import { normalizeImportedMappings } from './mappingModel';

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

    const { mappings: normalized, converted, coerced, problems } =
      normalizeImportedMappings(mappings);
    if (problems.length > 0) {
      notification.error({
        message: '导入失败：URL 匹配写法不合法',
        description: `${problems
          .slice(0, 5)
          .map((item) => `${item.name}：${item.reason}`)
          .join('\n')}`,
        style: { whiteSpace: 'pre-line' },
        duration: 8,
      });
      return;
    }

    // 带 id 的映射会覆盖服务端同 id 的配置，导入前必须让用户知道
    const withId = normalized.filter((mapping) => mapping?.id || mapping?.uuid).length;
    const confirmed = await new Promise((resolve) => {
      Modal.confirm({
        title: `导入 ${normalized.length} 个映射？`,
        content:
          withId > 0
            ? `其中 ${withId} 个带 id，会覆盖服务端上同 id 的映射，且不可撤销。`
            : '导入后立即生效，不会删除其它映射。',
        okText: '导入',
        cancelText: '取消',
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (!confirmed) return;

    try {
      await stubMappingsApi.import({ mappings: normalized });
      const notes = [];
      if (converted.length > 0) {
        notes.push(`${converted.length} 个映射的 {变量} 路径已自动改为 urlPathTemplate`);
      }
      if (coerced.length > 0) {
        notes.push(`${coerced.length} 处键值已补成 { equalTo: ... } 断言`);
      }
      const convertedNote = notes.length > 0 ? `；其中 ${notes.join('、')}` : '';
      notification.success({
        message: '导入完成',
        description: `已导入 ${normalized.length} 个映射${convertedNote}`,
        duration: notes.length > 0 ? 8 : 4.5,
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
      request.urlPathTemplate,
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
