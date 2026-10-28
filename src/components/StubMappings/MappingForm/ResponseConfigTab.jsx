import React from 'react';
import { Form, Input, Row, Col, InputNumber, Select, Collapse, Switch } from 'antd';
import Editor from '@monaco-editor/react';
import KeyValueEditor from '../KeyValueEditor';
import { FAULTS } from '../mappingModel';

const BODY_SOURCES = [
  { value: 'body', label: 'body（文本）' },
  { value: 'jsonBody', label: 'jsonBody（JSON 对象）' },
  { value: 'base64Body', label: 'base64Body（Base64）' },
  { value: 'bodyFileName', label: 'bodyFileName（引用 __files 文件）' },
];

const ResponseConfigTab = () => {
  const form = Form.useFormInstance();
  const bodySource = Form.useWatch(['response', 'bodySource'], form) || 'body';
  const delayType = Form.useWatch(['response', 'delayType'], form) || 'none';
  const chunkedEnabled = Form.useWatch(['response', 'chunkedEnabled'], form);
  const fault = Form.useWatch(['response', 'fault'], form);

  const items = [
    {
      key: 'chunked',
      label: '分片延时（chunkedDribbleDelay）',
      forceRender: true,
      children: (
        <>
          <Form.Item label="启用" name={['response', 'chunkedEnabled']} valuePropName="checked">
            <Switch />
          </Form.Item>
          {chunkedEnabled && (
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="分片数" name={['response', 'numberOfChunks']}>
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="总时长 (ms)" name={['response', 'totalDuration']}>
                  <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>
          )}
        </>
      ),
    },
    {
      key: 'proxy',
      label: '代理与模板',
      forceRender: true,
      children: (
        <>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="代理目标 (proxyBaseUrl)" name={['response', 'proxyBaseUrl']}>
                <Input placeholder="http://real-service:8080" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="代理时移除前缀" name={['response', 'proxyUrlPrefixToRemove']}>
                <Input placeholder="/api" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item label="响应转换器（逗号分隔）" name={['response', 'transformers']}>
            <Input placeholder="response-template, modify-response-header" />
          </Form.Item>
          <Form.Item
            label="转换器参数（JSON 对象）"
            name={['response', 'transformerParameters']}
            extra='例如 {"headerValue": "123"}'
          >
            <Input.TextArea rows={3} placeholder='{"key": "value"}' />
          </Form.Item>
        </>
      ),
    },
  ];

  return (
    <>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            label="状态码"
            name={['response', 'status']}
            rules={[{ required: true, message: '请输入状态码' }]}
          >
            <InputNumber min={100} max={599} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={10}>
          <Form.Item label="状态消息" name={['response', 'statusMessage']}>
            <Input placeholder="OK" />
          </Form.Item>
        </Col>
        <Col span={6}>
          <Form.Item label="故障注入" name={['response', 'fault']} extra="设置后忽略响应体">
            <Select allowClear placeholder="不注入" options={FAULTS.map((f) => ({ value: f, label: f }))} />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item label="响应头" name={['response', 'headers']}>
        <KeyValueEditor placeholder="响应头" />
      </Form.Item>

      <Row gutter={16}>
        <Col span={10}>
          <Form.Item label="响应体来源" name={['response', 'bodySource']}>
            <Select options={BODY_SOURCES} disabled={Boolean(fault)} />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item label="响应体" name={['response', 'bodyValue']}>
        {bodySource === 'bodyFileName' ? (
          <Input placeholder="例如 payloads/user1.json（相对 __files 目录）" />
        ) : (
          <Editor
            height="200px"
            language={bodySource === 'jsonBody' ? 'json' : 'plaintext'}
            options={{ minimap: { enabled: false } }}
          />
        )}
      </Form.Item>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="固定延时 (ms)" name={['response', 'fixedDelayMilliseconds']}>
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="随机延时分布" name={['response', 'delayType']}>
            <Select
              options={[
                { value: 'none', label: '不使用' },
                { value: 'uniform', label: '均匀分布（lower/upper）' },
                { value: 'lognormal', label: '对数正态（median/sigma）' },
              ]}
            />
          </Form.Item>
        </Col>
      </Row>

      {delayType === 'uniform' && (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="下限 (ms)" name={['response', 'delayLower']}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="上限 (ms)" name={['response', 'delayUpper']}>
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
      )}

      {delayType === 'lognormal' && (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="median" name={['response', 'delayMedian']}>
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="sigma" name={['response', 'delaySigma']}>
              <InputNumber min={0.01} step={0.01} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
      )}

      <Collapse items={items} />
    </>
  );
};

export default ResponseConfigTab;
