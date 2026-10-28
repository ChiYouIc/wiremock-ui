import React, { useState } from 'react';
import { Card, Tabs, Space, Button, Modal, Alert } from 'antd';
import { SendOutlined, ArrowDownOutlined, LinkOutlined, SearchOutlined } from '@ant-design/icons';
import { nearMissesApi } from '../../services/wiremockApi';
import { showApiError } from '../../services/wiremockErrors';
import { getWebhookEvents } from './requestUtils';
import NearMissTable from '../NearMisses/NearMissTable';
import OverviewSection from './RequestDetail/OverviewSection';
import RequestDetailsSection from './RequestDetail/RequestDetailsSection';
import ResponseDetailsSection from './RequestDetail/ResponseDetailsSection';
import WebhookEventsSection from './RequestDetail/WebhookEventsSection';

const RequestDetail = ({ request }) => {
  const [nearMissVisible, setNearMissVisible] = useState(false);
  const [nearMisses, setNearMisses] = useState([]);
  const [nearMissLoading, setNearMissLoading] = useState(false);

  if (!request) return null;

  const webhookEvents = getWebhookEvents(request);

  const handleFindNearMisses = async () => {
    setNearMissVisible(true);
    setNearMissLoading(true);
    try {
      const response = await nearMissesApi.forRequest(request.request);
      setNearMisses(response.data?.nearMisses || []);
    } catch (error) {
      showApiError(error, '查找相近映射失败');
      setNearMisses([]);
    } finally {
      setNearMissLoading(false);
    }
  };

  const requestTab = <RequestDetailsSection request={request} />;
  const responseTab = <ResponseDetailsSection request={request} />;

  const items = [
    {
      key: 'request',
      label: (
        <Space>
          <SendOutlined />
          请求详情
        </Space>
      ),
      children: requestTab,
    },
    {
      key: 'response',
      label: (
        <Space>
          <ArrowDownOutlined />
          响应详情
        </Space>
      ),
      children: responseTab,
    },
  ];

  if (webhookEvents.length > 0) {
    items.push({
      key: 'webhooks',
      label: (
        <Space>
          <LinkOutlined />
          Webhook 事件 ({webhookEvents.length})
        </Space>
      ),
      children: <WebhookEventsSection webhookEvents={webhookEvents} />,
    });
  }

  return (
    <div style={{ padding: '16px 0' }}>
      <OverviewSection request={request} onFindNearMisses={handleFindNearMisses} />

      <Card>
        <Tabs items={items} />
      </Card>

      <Modal
        title="最接近的映射（near-misses）"
        open={nearMissVisible}
        onCancel={() => setNearMissVisible(false)}
        footer={null}
        width={1000}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message="该请求没有命中映射时，这里会列出最接近的候选映射以及距离（distance 越小越接近）。"
        />
        <Space style={{ marginBottom: 12 }}>
          <Button icon={<SearchOutlined />} onClick={handleFindNearMisses} loading={nearMissLoading}>
            重新查询
          </Button>
        </Space>
        <NearMissTable nearMisses={nearMisses} loading={nearMissLoading} />
      </Modal>
    </div>
  );
};

export default RequestDetail;
