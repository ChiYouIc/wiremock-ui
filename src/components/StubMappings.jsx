import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Space, Typography, Card, Form, Modal, Upload, Empty, message, notification, Alert } from 'antd';
import {
  ReloadOutlined,
  DownloadOutlined,
  UploadOutlined,
  ClearOutlined,
  ApiOutlined,
} from '@ant-design/icons';
import { stubMappingsApi } from '../services/wiremockApi';
import { showApiError } from '../services/wiremockErrors';
import { handleExport, handleImport, filterMappings } from './StubMappings/importExportUtils';
import { getDefaultFormValues, mapRecordToFormData } from './StubMappings/mappingModel';
import { useMappingOperations } from './StubMappings/hooks/useMappingOperations';
import MappingList, { ALL_GROUPS, NO_GROUP } from './StubMappings/MappingList';
import MappingEditor from './StubMappings/MappingEditor';

const { Title, Text } = Typography;

const NEW_KEY = '__new__';

const StubMappings = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [groupFilter, setGroupFilter] = useState(ALL_GROUPS);
  const [selectedKey, setSelectedKey] = useState(null);
  const [editorRecord, setEditorRecord] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [liveValues, setLiveValues] = useState(null);
  const [revealSignal, setRevealSignal] = useState(0);
  const [form] = Form.useForm();

  const fetchMappings = useCallback(async () => {
    setLoading(true);
    try {
      const response = await stubMappingsApi.getAll();
      const list = Array.isArray(response.data?.mappings) ? response.data.mappings : [];
      setRecords(list);
      return list;
    } catch (error) {
      showApiError(error, '获取映射失败');
      setRecords([]);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMappings();
  }, [fetchMappings]);

  const { handleDelete, handleSave } = useMappingOperations(fetchMappings);

  const filteredRecords = useMemo(() => {
    const byGroup =
      groupFilter === ALL_GROUPS
        ? records
        : groupFilter === NO_GROUP
          ? records.filter((record) => !record.metadata?.wmui?.group)
          : records.filter((record) => record.metadata?.wmui?.group === groupFilter);
    return filterMappings(byGroup, searchText);
  }, [records, groupFilter, searchText]);

  const groups = useMemo(() => {
    const set = new Set();
    records.forEach((record) => {
      const group = record.metadata?.wmui?.group;
      if (group) set.add(group);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [records]);

  const isNew = selectedKey === NEW_KEY;

  const selectedHidden = Boolean(
    selectedKey && !isNew && !filteredRecords.some((record) => record.id === selectedKey)
  );

  const applyRecord = useCallback(
    (record) => {
      const values = mapRecordToFormData(record);
      form.resetFields();
      form.setFieldsValue(values);
      setLiveValues(values);
      setEditorRecord(record);
      setSelectedKey(record.id);
      setDirty(false);
    },
    [form]
  );

  const askDiscard = useCallback(() => {
    if (!dirty) return Promise.resolve(true);
    return new Promise((resolve) => {
      Modal.confirm({
        title: '放弃未保存的修改？',
        content: '当前编辑内容还没有保存，切换后会丢失。',
        okText: '放弃修改',
        cancelText: '继续编辑',
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
  }, [dirty]);

  const handleCreate = async () => {
    if (!(await askDiscard())) return;
    const values = getDefaultFormValues();
    form.resetFields();
    form.setFieldsValue(values);
    setLiveValues(values);
    setEditorRecord(null);
    setSelectedKey(NEW_KEY);
    setDirty(false);
  };

  const handleSelect = async (record) => {
    if (record.id === selectedKey) return;
    if (!(await askDiscard())) return;
    applyRecord(record);
  };

  // 刷新：先保护未保存修改，再回填服务端最新值（否则表单会停留在旧数据上）
  const handleRefresh = async () => {
    if (!(await askDiscard())) return;
    const list = await fetchMappings();

    if (isNew) {
      // 放弃的是草稿，重置回默认值
      const values = getDefaultFormValues();
      form.resetFields();
      form.setFieldsValue(values);
      setLiveValues(values);
      setDirty(false);
      return;
    }
    if (!selectedKey) return;

    const latest = list.find((item) => item.id === selectedKey);
    if (latest) {
      applyRecord(latest);
      notification.info({
        message: '已同步服务端配置',
        description: '右侧表单已回填最新值',
        duration: 3,
      });
      return;
    }
    setSelectedKey(null);
    setEditorRecord(null);
    setDirty(false);
    setLiveValues(null);
    form.resetFields();
    notification.warning({
      message: '该映射已不存在',
      description: '服务端已找不到当前编辑的映射，可能是被其他客户端删除。',
      duration: 6,
    });
  };

  const handleDuplicate = async (record) => {
    if (!record) return;
    if (!(await askDiscard())) return;
    const values = mapRecordToFormData(record);
    const originalName =
      record.name ||
      `${record.request?.method || 'GET'} ${
        record.request?.urlPathTemplate ||
        record.request?.urlPath ||
        record.request?.url ||
        record.request?.urlPattern ||
        record.request?.urlPathPattern ||
        '/'
      }`;
    const timestamp = new Date().toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
    values.name = `${originalName} - 副本 (${timestamp})`;

    form.resetFields();
    form.setFieldsValue(values);
    setLiveValues(values);
    setEditorRecord(null);
    setSelectedKey(NEW_KEY);
    setDirty(true);
  };

  const handleRemove = async (record) => {
    const confirmed = await new Promise((resolve) => {
      Modal.confirm({
        title: '确定删除这个映射？',
        content:
          record.name ||
          record.request?.urlPathTemplate ||
          record.request?.urlPath ||
          record.id,
        okText: '删除',
        okButtonProps: { danger: true },
        cancelText: '取消',
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (!confirmed) return;

    const success = await handleDelete(record.id);
    if (success && selectedKey === record.id) {
      setSelectedKey(null);
      setEditorRecord(null);
      setDirty(false);
      form.resetFields();
      setLiveValues(null);
    }
  };

  const handleSubmit = async (values) => {
    setSaving(true);
    const result = await handleSave(values, isNew ? null : editorRecord);
    setSaving(false);

    if (!result.ok) {
      if (result.errors?.length) {
        form.setFields(
          result.errors.map((item) => ({ name: item.path, errors: [item.message] }))
        );
        setRevealSignal((value) => value + 1);
        notification.error({
          message: '配置校验未通过',
          description: result.errors.map((item) => item.message).join('\n'),
          style: { whiteSpace: 'pre-line' },
        });
        const [first] = result.errors;
        if (first?.path) {
          // 等折叠面板展开、错误渲染完成后再滚动
          setTimeout(() => form.scrollToField(first.path, { behavior: 'smooth', block: 'center' }), 150);
        }
      }
      return;
    }

    if (isNew) {
      applyRecord(result.mapping);
    } else {
      setEditorRecord({ ...editorRecord, ...result.mapping });
      setDirty(false);
    }
  };

  const handleReset = () => {
    const values = isNew ? getDefaultFormValues() : mapRecordToFormData(editorRecord);
    form.resetFields();
    form.setFieldsValue(values);
    setLiveValues(values);
    setDirty(false);
  };

  const handleClearUnmatched = async () => {
    if (!(await askDiscard())) return;
    const confirmed = await new Promise((resolve) => {
      Modal.confirm({
        title: '清理所有未匹配的映射？',
        content: '只删除从未命中过请求的映射，操作不可撤销，建议先「导出全部」备份。',
        okText: '清理',
        okButtonProps: { danger: true },
        cancelText: '取消',
        onOk: () => resolve(true),
        onCancel: () => resolve(false),
      });
    });
    if (!confirmed) return;

    try {
      await stubMappingsApi.removeUnmatched();
      await fetchMappings();
      setSelectedKey(null);
      setEditorRecord(null);
      setDirty(false);
      setLiveValues(null);
      form.resetFields();
      message.success('已清理未匹配的映射');
    } catch (error) {
      showApiError(error, '清理失败');
    }
  };

  const handleExportGroup = (group) => {
    const list = records.filter((record) => record.metadata?.wmui?.group === group);
    handleExport(list, []);
  };

  // 导入前先保护未保存的修改
  const handleImportFile = async (file) => {
    if (!(await askDiscard())) return false;
    return handleImport(file, fetchMappings);
  };

  const handleDeleteGroup = async (group) => {
    if (!(await askDiscard())) return;
    Modal.confirm({
      title: `删除分组「${group}」下的所有映射？`,
      content: '会调用 POST /__admin/mappings/remove-by-metadata，操作不可撤销。',
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      onOk: async () => {
        try {
          await stubMappingsApi.removeByMetadata({
            matchesJsonPath: { expression: '$.wmui.group', equalTo: group },
          });
          message.success(`已删除分组「${group}」下的映射`);
          await fetchMappings();
          setSelectedKey(null);
          setEditorRecord(null);
          setDirty(false);
          form.resetFields();
        } catch (error) {
          showApiError(error, '删除分组失败');
        }
      },
    });
  };

  // Ctrl / ⌘ + S 保存
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's' && selectedKey) {
        event.preventDefault();
        form.submit();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedKey, form]);

  return (
    <div className="fade-in page-stack">
      <div className="page-header mapping-page-header">
        <div>
          <Title level={2} style={{ margin: 0 }}>
            Stub 映射管理
          </Title>
          <Text type="secondary">左侧选择、右侧编辑，保存后立即生效</Text>
        </div>
        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={loading}>
            刷新
          </Button>
          <Button icon={<ClearOutlined />} onClick={handleClearUnmatched}>
            清理未匹配
          </Button>
          <Button icon={<DownloadOutlined />} onClick={() => handleExport(records, [])}>
            导出全部
          </Button>
          <Upload
            accept=".json"
            showUploadList={false}
            beforeUpload={(file) => handleImportFile(file)}
          >
            <Button icon={<UploadOutlined />}>导入</Button>
          </Upload>
        </Space>
      </div>

      <div className="mapping-workspace">
        <MappingList
          records={filteredRecords}
          total={records.length}
          selectedId={selectedKey}
          loading={loading}
          searchText={searchText}
          onSearch={setSearchText}
          onSelect={handleSelect}
          onCreate={handleCreate}
          onDuplicate={handleDuplicate}
          onDelete={handleRemove}
          groups={groups}
          groupFilter={groupFilter}
          ungroupedTotal={records.filter((record) => !record.metadata?.wmui?.group).length}
          onGroupFilterChange={setGroupFilter}
          onExportGroup={handleExportGroup}
          onDeleteGroup={handleDeleteGroup}
        />

        {selectedKey ? (
          <MappingEditor
            form={form}
            record={editorRecord}
            isNew={isNew}
            dirty={dirty}
            saving={saving}
            liveValues={liveValues}
            groupOptions={groups}
            revealSignal={revealSignal}
            notice={
              selectedHidden ? (
                <Alert
                  type="warning"
                  showIcon
                  style={{ marginBottom: 16 }}
                  message="当前编辑的映射不在左侧筛选结果里"
                  description="它仍处于编辑状态，只是被搜索关键词或分组条件隐藏了。"
                  action={
                    <Button
                      size="small"
                      onClick={() => {
                        setSearchText('');
                        setGroupFilter(ALL_GROUPS);
                      }}
                    >
                      清除筛选
                    </Button>
                  }
                />
              ) : null
            }
            onDirty={(allValues) => {
              setDirty(true);
              setLiveValues(allValues);
            }}
            onSave={handleSubmit}
            onReset={handleReset}
            onDuplicate={() => handleDuplicate(editorRecord)}
            onDelete={() => handleRemove(editorRecord)}
          />
        ) : (
          <Card className="mapping-editor mapping-editor--empty">
            <Empty
              image={<ApiOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />}
              description={
                <span>
                  从左侧选择一个映射开始编辑，或
                  <Button type="link" onClick={handleCreate} style={{ padding: '0 4px' }}>
                    新建一个
                  </Button>
                </span>
              }
            />
          </Card>
        )}
      </div>
    </div>
  );
};

export default StubMappings;
