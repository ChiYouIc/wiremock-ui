import React, { useMemo } from 'react';
import { Card, Form, Space, Button, Tag, Typography, Popconfirm } from 'antd';
import {
  SaveOutlined,
  UndoOutlined,
  CopyOutlined,
  DeleteOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import BasicInfoTab from './MappingForm/BasicInfoTab';
import RequestConfigTab from './MappingForm/RequestConfigTab';
import ResponseConfigTab from './MappingForm/ResponseConfigTab';
import WebhookConfigTab from './MappingForm/WebhookConfigTab';
import { buildMappingPayload } from './mappingModel';

const { Title, Text } = Typography;

const EditorSection = ({ title, extra, children }) => (
  <Card size="small" title={title} extra={extra} className="editor-section">
    {children}
  </Card>
);

const describe = (record) => {
  if (!record) return { method: 'GET', url: '/' };
  const request = record.request || {};
  return {
    method: request.method || 'ANY',
    url: request.url || request.urlPattern || request.urlPath || request.urlPathPattern || '/',
  };
};

const MappingEditor = ({
  form,
  record,
  isNew,
  dirty,
  saving,
  liveValues,
  groupOptions,
  onDirty,
  onSave,
  onReset,
  onDuplicate,
  onDelete,
}) => {
  const { method, url } = describe(record);

  const preview = useMemo(() => {
    try {
      return JSON.stringify(buildMappingPayload(liveValues || {}), null, 2);
    } catch {
      return '// 当前表单还无法生成载荷';
    }
  }, [liveValues]);

  return (
    <Form
      form={form}
      layout="vertical"
      // onFinish 的值只包含已注册字段，这里统一读取完整表单值，避免折叠面板内的字段被丢弃
      onFinish={() => onSave(form.getFieldsValue(true))}
      onValuesChange={() => onDirty(form.getFieldsValue(true))}
      className="mapping-editor"
    >
      <div className="mapping-editor__header">
        <div style={{ minWidth: 0 }}>
          <Space size={8} wrap>
            <Title level={4} style={{ margin: 0 }}>
              {isNew ? '新建映射' : record?.name || `${method} ${url}`}
            </Title>
            {dirty && <Tag color="orange">未保存</Tag>}
            {saving && (
              <Tag icon={<LoadingOutlined />} color="processing">
                保存中
              </Tag>
            )}
          </Space>
          <div className="mapping-editor__subtitle">
            <Text code>{method}</Text> <Text>{url}</Text>
            {!isNew && record?.id && (
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>
                {record.id}
              </Text>
            )}
          </div>
        </div>

        {!isNew && (
          <Space>
            <Button icon={<CopyOutlined />} onClick={onDuplicate}>
              复制
            </Button>
            <Popconfirm title="确定删除这个映射？" okText="删除" cancelText="取消" onConfirm={onDelete}>
              <Button danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </Space>
        )}
      </div>

      <div className="mapping-editor__body">
        <EditorSection title="基本信息">
          <BasicInfoTab groupOptions={groupOptions} />
        </EditorSection>

        <EditorSection title="请求匹配">
          <RequestConfigTab />
        </EditorSection>

        <EditorSection title="响应配置">
          <ResponseConfigTab />
        </EditorSection>

        <EditorSection title="Webhook（可选）">
          <WebhookConfigTab />
        </EditorSection>

        <EditorSection title="载荷预览" extra={<Text type="secondary">随表单实时更新</Text>}>
          <pre className="mapping-preview">{preview}</pre>
        </EditorSection>
      </div>

      <div className="mapping-editor__footer">
        <Space>
          <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving}>
            保存
          </Button>
          <Button icon={<UndoOutlined />} onClick={onReset} disabled={!dirty}>
            放弃修改
          </Button>
          <Text type="secondary" style={{ fontSize: 12 }}>
            Ctrl / ⌘ + S 保存
          </Text>
        </Space>
      </div>
    </Form>
  );
};

export default MappingEditor;
