import React, { useState, useEffect } from 'react';
import { Card, Button, Space, Typography, Table, Tag, notification, Popconfirm } from 'antd';
import { ReloadOutlined, ClearOutlined } from '@ant-design/icons';
import { scenariosApi } from '../services/wiremockApi';
import { showApiError } from '../services/wiremockErrors';

const { Title, Text } = Typography;

const columns = [
  {
    title: '场景名称',
    dataIndex: 'name',
    key: 'name',
    render: (name) => <Text strong>{name}</Text>,
  },
  {
    title: '当前状态',
    dataIndex: 'state',
    key: 'state',
    width: 200,
    render: (state) => <Tag color="blue">{state || 'Started'}</Tag>,
  },
  {
    title: '可用状态',
    dataIndex: 'possibleStates',
    key: 'possibleStates',
    render: (states) =>
      Array.isArray(states) && states.length > 0
        ? states.map((state) => <Tag key={state}>{state}</Tag>)
        : '-',
  },
];

const Scenarios = () => {
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchScenarios = async () => {
    setLoading(true);
    try {
      const response = await scenariosApi.getAll();
      setScenarios(Array.isArray(response.data?.scenarios) ? response.data.scenarios : []);
    } catch (error) {
      showApiError(error, '获取场景失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScenarios();
  }, []);

  // 规范只提供全量重置：POST /__admin/scenarios/reset
  const handleResetAll = async () => {
    try {
      await scenariosApi.resetAll();
      notification.success({
        message: '重置成功',
        description: '所有场景已重置到初始状态',
      });
      fetchScenarios();
    } catch (error) {
      showApiError(error, '重置失败');
    }
  };

  return (
    <div className="fade-in page-stack">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              场景管理
            </Title>
            <Text type="secondary">查看有状态模拟场景的当前状态</Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchScenarios} loading={loading}>
              刷新
            </Button>
            <Popconfirm
              title="确定要重置所有场景状态吗？"
              onConfirm={handleResetAll}
              okText="确定"
              cancelText="取消"
            >
              <Button danger icon={<ClearOutlined />}>
                重置所有场景
              </Button>
            </Popconfirm>
          </Space>
        </div>
      </div>

      <Card className="content-card">
        <Table
          columns={columns}
          dataSource={scenarios}
          rowKey={(record) => record.id || record.name}
          loading={loading}
          locale={{ emptyText: '当前没有场景。在映射中设置 scenarioName 后会出现。' }}
          pagination={false}
        />
      </Card>
    </div>
  );
};

export default Scenarios;
