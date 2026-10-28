import React from 'react';
import { Card, Form, Input, Switch, Button, Row, Col, Space } from 'antd';
import { PlayCircleOutlined } from '@ant-design/icons';

const StartRecordingCard = ({ form, onStartRecording, isRecording, loading }) => {
  return (
    <Card
      title={
        <Space>
          <PlayCircleOutlined />
          开始录制（代理模式）
        </Space>
      }
      className="content-card"
    >
      <Form form={form} layout="vertical" onFinish={onStartRecording} disabled={isRecording}>
        <Form.Item
          label="目标服务 URL"
          name="targetBaseUrl"
          rules={[{ required: true, type: 'url', message: '请输入合法的目标 URL' }]}
          extra="对应 record-spec.targetBaseUrl，请求会被代理到该地址并生成映射"
        >
          <Input placeholder="https://api.example.com" />
        </Form.Item>

        <Form.Item
          label="URL 路径正则过滤"
          name="urlPathPattern"
          extra="对应 filters.urlPathPattern，留空表示全部录制"
        >
          <Input placeholder="/api/.*" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              label="HTTP 方法过滤"
              name="method"
              extra="留空表示不限；非法值（如 ANY）不会下发"
            >
              <Input placeholder="GET" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              label="请求体匹配器"
              name="requestBodyPatternMatcher"
              extra="对应 requestBodyPattern.matcher"
            >
              <Input placeholder="equalToJson" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="捕获的请求头"
          name="captureHeaders"
          extra="逗号分隔；对应 captureHeaders 对象，留空表示不捕获"
        >
          <Input placeholder="Accept, Content-Type" />
        </Form.Item>

        <Form.Item label="转换器" name="transformers" extra="逗号分隔的转换器名称">
          <Input placeholder="response-template,modify-response-header" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="持久化映射" name="persist" valuePropName="checked" initialValue={true}>
              <Switch />
            </Form.Item>
          </Col>
          <Col span={8}>
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
          <Button
            type="primary"
            htmlType="submit"
            icon={<PlayCircleOutlined />}
            loading={loading}
            disabled={isRecording}
            block
          >
            开始录制
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default StartRecordingCard;
