import React from 'react';
import { Form, Input, Select, Card, Row, Col, InputNumber, Alert } from 'antd';
import KeyValueEditor from '../KeyValueEditor';
import { HTTP_METHODS } from '../mappingModel';

const { TextArea } = Input;

const WebhookConfigTab = () => {
  const form = Form.useFormInstance();
  const webhookUrl = Form.useWatch(['webhook', 'url'], form);

  return (
    <>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="WireMock 的 postServeActions 是「扩展名 → 参数」的映射，因此一个映射只能挂一个 webhook。"
        description="留空 URL 即表示不配置 webhook。"
      />

      <Card title="Webhook 回调" size="small">
        <Form.Item
          label="URL"
          name={['webhook', 'url']}
          rules={[{ type: 'url', message: '请输入合法的 URL' }]}
        >
          <Input placeholder="https://example.com/callback" />
        </Form.Item>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="HTTP 方法" name={['webhook', 'method']} initialValue="POST">
              <Select options={HTTP_METHODS.map((m) => ({ value: m, label: m }))} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="延迟回调 (ms)" name={['webhook', 'delayMilliseconds']} initialValue={0}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label="请求头" name={['webhook', 'headers']}>
          <KeyValueEditor placeholder="请求头" />
        </Form.Item>

        <Form.Item label="请求体" name={['webhook', 'body']}>
          <TextArea rows={4} placeholder="请求体内容..." disabled={!webhookUrl} />
        </Form.Item>
      </Card>
    </>
  );
};

export default WebhookConfigTab;
