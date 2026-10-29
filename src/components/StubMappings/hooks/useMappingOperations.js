import { notification } from 'antd';
import { stubMappingsApi } from '../../../services/wiremockApi';
import { showApiError } from '../../../services/wiremockErrors';
import { buildMappingPayload, validateMappingForm } from '../mappingModel';

// 映射操作相关的逻辑
export const useMappingOperations = (fetchMappings) => {
  // 删除映射
  const handleDelete = async (id) => {
    try {
      await stubMappingsApi.remove(id);
      notification.success({
        message: '删除成功',
        description: '映射已成功删除',
      });
      await fetchMappings();
      return true;
    } catch (error) {
      showApiError(error, '删除失败');
      return false;
    }
  };

  // 保存映射：返回 { ok, errors, mapping }，校验不通过时把错误交给调用方定位字段
  const handleSave = async (values, selectedMapping) => {
    const errors = validateMappingForm(values);
    if (errors.length > 0) {
      return { ok: false, errors };
    }

    try {
      const payload = buildMappingPayload(values);
      const response = selectedMapping
        ? await stubMappingsApi.update(selectedMapping.id, payload)
        : await stubMappingsApi.create(payload);

      notification.success({
        message: selectedMapping ? '更新成功' : '创建成功',
        description: selectedMapping ? '映射已成功更新' : '映射已成功创建',
      });

      await fetchMappings();
      return { ok: true, errors: [], mapping: response.data || { id: selectedMapping?.id } };
    } catch (error) {
      showApiError(error, selectedMapping ? '更新失败' : '创建失败');
      return { ok: false, errors: [] };
    }
  };

  return {
    handleDelete,
    handleSave,
  };
};
