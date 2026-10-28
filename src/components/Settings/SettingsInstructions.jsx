import React from 'react';
import { Card, Typography, Divider, Space, Tag } from 'antd';

const { Title, Paragraph, Text } = Typography;

const SettingsInstructions = () => (
  <Card className="content-card" title="设置说明">
    <Space direction="vertical" size="small" style={{ width: '100%' }}>
      <div>
        <Title level={5}>写入接口</Title>
        <Paragraph type="secondary" style={{ marginBottom: 4 }}>
          统一通过 <Text code>POST /__admin/settings</Text> 提交，只提交本项目支持的
          GlobalSettings 字段，避免把前端未识别的键写进服务端。
        </Paragraph>
      </div>

      <div>
        <Title level={5}>读取接口</Title>
        <Paragraph type="secondary" style={{ marginBottom: 4 }}>
          WireMock 3.x 规范没有设置读取接口；4.x 提供 <Text code>GET /__admin/settings</Text> 并返回
          <Tag>{'{ settings: {...} }'}</Tag> 信封。本页会自动探测并按需解包，探测失败时进入只写模式。
        </Paragraph>
      </div>

      <Divider style={{ margin: '8px 0' }} />

      <div>
        <Title level={5}>字段对照</Title>
        <Paragraph type="secondary" style={{ marginBottom: 0 }}>
          固定延时的单位是毫秒；<Text code>delayDistribution</Text> 是对象，
          均匀分布用 lower/upper，对数正态分布必须用 median/sigma。
        </Paragraph>
      </div>
    </Space>
  </Card>
);

export default SettingsInstructions;
