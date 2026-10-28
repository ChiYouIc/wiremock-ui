import React from 'react';
import { Card, Typography, Space } from 'antd';

const { Title, Paragraph, Text } = Typography;

const RecordingInstructions = () => (
  <Card className="content-card" title="录制说明">
    <Space direction="vertical" size="small" style={{ width: '100%' }}>
      <div>
        <Title level={5}>代理录制</Title>
        <Paragraph type="secondary">
          把待测应用的上游地址指向 WireMock，WireMock 会按 <Text code>targetBaseUrl</Text> 转发请求，
          并在停止录制时把请求/响应转换成映射。
        </Paragraph>
      </div>
      <div>
        <Title level={5}>快照录制</Title>
        <Paragraph type="secondary">
          快照只处理请求日志里已有的记录，不会主动发起上游调用，因此不需要目标 URL。
        </Paragraph>
      </div>
      <div>
        <Title level={5}>过滤条件</Title>
        <Paragraph type="secondary">
          <Text code>filters</Text> 是一个 request-pattern：<Text code>method</Text> 必须是纯大写字母，
          不限方法时请留空而不是填 ANY。
        </Paragraph>
      </div>
    </Space>
  </Card>
);

export default RecordingInstructions;
