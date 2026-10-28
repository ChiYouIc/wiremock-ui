import React from 'react';
import { Card, Form, Input, Switch, Button, Row, Col, Space, Typography } from 'antd';
import { CameraOutlined } from '@ant-design/icons';

const { Paragraph } = Typography;

const SnapshotRecordingCard = ({ onSnapshot, loading }) => {
  return (
    <Card
      title={
        <Space>
          <CameraOutlined />
          快照录制
        </Space>
      }
      className="content-card"
    >
      <Paragraph type="secondary">
        快照不会访问目标服务，而是把「请求日志」里已记录的请求/响应转换成映射。
        因此这里只需要指定日志过滤条件。
      </Paragraph>

      <Form layout="vertical" onFinish={onSnapshot}>
        <Form.Item label="URL 路径正则过滤" name="urlPathPattern" extra="对应 filters.urlPathPattern">
          <Input placeholder="/api/.*" />
        </Form.Item>

        <Form.Item
          label="只处理指定请求 ID"
          name="ids"
          extra="逗号分隔；对应 filters.ids，留空表示全部"
        >
          <Input placeholder="3a9a787c-cc22-46c8-bcc9-debba2a60399" />
        </Form.Item>

        <Form.Item
          label="捕获的请求头"
          name="captureHeaders"
          extra="逗号分隔；对应 captureHeaders 对象"
        >
          <Input placeholder="Accept, Content-Type" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="持久化映射" name="persist" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="重复请求转场景"
              name="repeatsAsScenarios"
              valuePropName="checked"
              initialValue={false}
            >
              <Switch />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item>
          <Button type="primary" htmlType="submit" icon={<CameraOutlined />} loading={loading} block>
            创建快照
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default SnapshotRecordingCard;
