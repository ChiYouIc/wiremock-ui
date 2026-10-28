import React from 'react';
import { Card, Descriptions, Space, Tag, Alert, Divider, Typography, Button } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, ApiOutlined, SearchOutlined } from '@ant-design/icons';
import {
  formatTime,
  getMatchedStubInfo,
  getStatusColor,
  getResponseStatus,
  isMatched,
} from '../requestUtils';

const { Text, Paragraph } = Typography;

const normalizeClientIp = (clientIp) => {
  if (Array.isArray(clientIp)) return clientIp.join(', ');
  return clientIp || '-';
};

const OverviewSection = ({ request, onFindNearMisses }) => {
  const matchedStub = getMatchedStubInfo(request);
  const matched = isMatched(request);
  const status = getResponseStatus(request);

  return (
    <Card
      title={
        <Space>
          <ApiOutlined />
          <span>请求概览</span>
          <Tag color={matched ? 'green' : 'red'}>{matched ? '已匹配' : '未匹配'}</Tag>
        </Space>
      }
      extra={
        <Button icon={<SearchOutlined />} onClick={onFindNearMisses}>
          查找相近映射
        </Button>
      }
      style={{ marginBottom: 16 }}
    >
      <Descriptions column={2} size="small">
        <Descriptions.Item label="请求 ID">
          <Text code>{request.id || '-'}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="请求时间">
          <Space>
            <ClockCircleOutlined />
            {formatTime(request.request?.loggedDate, request.request?.loggedDateString)}
          </Space>
        </Descriptions.Item>
        <Descriptions.Item label="请求方法">
          <Tag color="blue">{request.request?.method || '-'}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="响应状态">
          <Tag color={getStatusColor(status)}>{status ?? '-'}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="客户端 IP">
          <Text code>{normalizeClientIp(request.request?.clientIp)}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="是否经浏览器代理">
          <Text>{request.request?.browserProxyRequest ? '是' : '否'}</Text>
        </Descriptions.Item>
      </Descriptions>

      <Divider orientation="left" orientationMargin="0">
        URL 信息
      </Divider>
      <Descriptions column={1} size="small">
        <Descriptions.Item label="完整 URL">
          <Paragraph copyable style={{ margin: 0 }}>
            <Text code>{request.request?.absoluteUrl || request.request?.url}</Text>
          </Paragraph>
        </Descriptions.Item>
        <Descriptions.Item label="路径">
          <Text code>{request.request?.url}</Text>
        </Descriptions.Item>
      </Descriptions>

      {matchedStub && (
        <>
          <Divider orientation="left" orientationMargin="0">
            命中的映射
          </Divider>
          <Alert
            message={
              <Space>
                <CheckCircleOutlined />
                <strong>{matchedStub.name || matchedStub.id}</strong>
                {matchedStub.priority && <Tag color="blue">优先级: {matchedStub.priority}</Tag>}
                {matchedStub.scenario && <Tag color="purple">{matchedStub.scenario}</Tag>}
              </Space>
            }
            description={matchedStub.description}
            type="success"
            showIcon={false}
          />
        </>
      )}

      {request.timing && (
        <>
          <Divider orientation="left" orientationMargin="0">
            性能信息
          </Divider>
          <Descriptions column={3} size="small">
            <Descriptions.Item label="处理时间">
              <Text code>{request.timing.processTime || 0}ms</Text>
            </Descriptions.Item>
            <Descriptions.Item label="响应发送">
              <Text code>{request.timing.responseSendTime || 0}ms</Text>
            </Descriptions.Item>
            <Descriptions.Item label="总时间">
              <Text code>{request.timing.totalTime || 0}ms</Text>
            </Descriptions.Item>
          </Descriptions>
        </>
      )}
    </Card>
  );
};

export default OverviewSection;
