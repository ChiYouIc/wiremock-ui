import React, { useEffect, useState } from 'react';
import { Modal, Input, Button, Space, Typography, Tag, Divider } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { DEFAULT_TARGET, isValidBaseUrl } from '../services/targets';

const { Text } = Typography;

const emptyRow = () => ({
  id: `t-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
  name: '',
  baseUrl: '',
});

const TargetsModal = ({ open, targets, activeId, onClose, onSave, onActivate }) => {
  const [draft, setDraft] = useState(targets);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setDraft(targets);
      setError('');
    }
  }, [open, targets]);

  const update = (id, patch) =>
    setDraft((rows) => rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const remove = (id) => {
    if (id === DEFAULT_TARGET.id) return;
    setDraft((rows) => rows.filter((row) => row.id !== id));
  };

  const handleSave = () => {
    const invalid = draft.find((row) => row.id !== DEFAULT_TARGET.id && !isValidBaseUrl(row.baseUrl));
    if (invalid) {
      setError(`「${invalid.name || '未命名实例'}」的地址不合法，需要以 http:// 或 https:// 开头`);
      return;
    }
    const named = draft.find((row) => row.id !== DEFAULT_TARGET.id && !row.name.trim() && row.baseUrl.trim());
    if (named) {
      setError('请为新增的实例填写名称');
      return;
    }
    const cleaned = draft.filter(
      (row) => row.id === DEFAULT_TARGET.id || row.name.trim() || row.baseUrl.trim()
    );
    onSave(cleaned);
  };

  return (
    <Modal
      title="管理 WireMock 实例"
      open={open}
      onCancel={onClose}
      onOk={handleSave}
      okText="保存"
      cancelText="取消"
      width={720}
      destroyOnHidden
    >
      <Text type="secondary">
        WireMock 开源版没有「工作空间」概念，一个实例就是一套独立的映射/日志/文件。
        本地多实例相当于多个工作空间：分别启动在不同端口（如 8080、8081），在这里登记即可切换。
      </Text>

      <Divider style={{ margin: '16px 0' }} />

      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        {draft.map((row) => {
          const isDefault = row.id === DEFAULT_TARGET.id;
          return (
            <Space.Compact key={row.id} style={{ width: '100%' }}>
              <Input
                style={{ width: 180 }}
                placeholder="名称"
                value={row.name}
                disabled={isDefault}
                onChange={(event) => update(row.id, { name: event.target.value })}
              />
              <Input
                placeholder={isDefault ? '留空 = 同源反向代理' : 'http://localhost:8081'}
                value={row.baseUrl}
                disabled={isDefault}
                onChange={(event) => update(row.id, { baseUrl: event.target.value })}
              />
              {activeId === row.id ? (
                <Button disabled style={{ width: 88 }}>
                  <Tag color="green" bordered={false}>
                    当前
                  </Tag>
                </Button>
              ) : (
                <Button style={{ width: 88 }} onClick={() => onActivate(row.id)}>
                  切换
                </Button>
              )}
              <Button
                danger
                icon={<DeleteOutlined />}
                disabled={isDefault}
                onClick={() => remove(row.id)}
              />
            </Space.Compact>
          );
        })}
      </Space>

      {error && (
        <div style={{ color: '#cf1322', marginTop: 12, fontSize: 12 }}>{error}</div>
      )}

      <Button
        type="dashed"
        block
        icon={<PlusOutlined />}
        style={{ marginTop: 12 }}
        onClick={() => setDraft((rows) => [...rows, emptyRow()])}
      >
        添加实例
      </Button>

      <div style={{ marginTop: 12, fontSize: 12, color: '#8c8c8c' }}>
        直连其它实例依赖 WireMock Admin API 的 CORS（4.x 默认开启）。若目标版本关闭了 CORS，
        请改用同源反向代理并在这里留空地址。
      </div>
    </Modal>
  );
};

export default TargetsModal;
