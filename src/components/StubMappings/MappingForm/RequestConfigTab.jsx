import React from 'react';
import { Form, Input, Select, Row, Col, Collapse, Button, Space } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import KeyValueEditor from '../KeyValueEditor';
import { URL_MATCH_TYPES, HTTP_METHODS, BODY_MATCHERS } from '../mappingModel';

const { TextArea } = Input;

const RequestConfigTab = () => {
  const form = Form.useFormInstance();
  const urlMatchType = Form.useWatch(['request', 'urlMatchType'], form) || 'urlPath';
  const urlTypeConfig =
    URL_MATCH_TYPES.find((item) => item.value === urlMatchType) || URL_MATCH_TYPES[0];

  const items = [
    {
      key: 'pairs',
      label: '查询参数 / 请求头 / Cookie / 表单参数',
      // 面板未展开时 Form.Item 不会注册，forceRender 保证值能参与提交
      forceRender: true,
      children: (
        <>
          <Form.Item label="查询参数" name={['request', 'queryParameters']}>
            <KeyValueEditor placeholder="查询参数" allowPredicate />
          </Form.Item>
          <Form.Item label="请求头" name={['request', 'headers']}>
            <KeyValueEditor placeholder="请求头" allowPredicate />
          </Form.Item>
          <Form.Item label="Cookie" name={['request', 'cookies']}>
            <KeyValueEditor placeholder="Cookie" allowPredicate />
          </Form.Item>
          <Form.Item label="表单参数" name={['request', 'formParameters']}>
            <KeyValueEditor placeholder="表单参数" allowPredicate />
          </Form.Item>
          {urlMatchType === 'urlPathPattern' && (
            <Form.Item
              label="路径参数"
              name={['request', 'pathParameters']}
              extra="仅在 urlPathPattern 下生效，键需与路径模板中的变量一致"
            >
              <KeyValueEditor placeholder="路径参数" allowPredicate />
            </Form.Item>
          )}
        </>
      ),
    },
    {
      key: 'auth',
      label: '身份验证',
      forceRender: true,
      children: (
        <>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item label="用户名" name={['request', 'basicAuth', 'username']}>
                <Input placeholder="用户名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="密码" name={['request', 'basicAuth', 'password']}>
                <Input.Password placeholder="密码" />
              </Form.Item>
            </Col>
          </Row>
          <div style={{ color: '#888', fontSize: 12 }}>
            提交时会转换为 WireMock 的 basicAuthCredentials 字段
          </div>
        </>
      ),
    },
    {
      key: 'body',
      label: '请求体匹配（bodyPatterns）',
      forceRender: true,
      children: (
        <Form.List name={['request', 'bodyMatchers']}>
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, name, ...restField }) => (
                <Row gutter={8} key={key} align="top" style={{ marginBottom: 8 }}>
                  <Col span={6}>
                    <Form.Item
                      {...restField}
                      name={[name, 'matcher']}
                      rules={[{ required: true, message: '选择匹配器' }]}
                      style={{ marginBottom: 0 }}
                    >
                      <Select
                        options={BODY_MATCHERS.map((item) => ({
                          value: item.value,
                          label: item.label,
                        }))}
                      />
                    </Form.Item>
                  </Col>
                  <Col span={15}>
                    <Form.Item {...restField} name={[name, 'value']} style={{ marginBottom: 0 }}>
                      <TextArea autoSize={{ minRows: 1, maxRows: 6 }} placeholder="匹配值" />
                    </Form.Item>
                  </Col>
                  <Col span={3}>
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={() => remove(name)}
                    />
                  </Col>
                </Row>
              ))}
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  onClick={() => add({ matcher: 'equalTo', value: '' })}
                >
                  添加请求体匹配器
                </Button>
                <div style={{ color: '#888', fontSize: 12 }}>
                  多个匹配器之间是「与」关系；提交时写入 request.bodyPatterns
                </div>
              </Space>
            </>
          )}
        </Form.List>
      ),
    },
    {
      key: 'advanced',
      label: '高级：scheme / host / port',
      forceRender: true,
      children: (
        <Row gutter={16}>
          <Col span={8}>
            <Form.Item label="scheme" name={['request', 'scheme']}>
              <Select
                allowClear
                placeholder="不限制"
                options={[
                  { value: 'http', label: 'http' },
                  { value: 'https', label: 'https' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="host" name={['request', 'host']}>
              <Input placeholder="不限制" />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="port" name={['request', 'port']}>
              <Input type="number" placeholder="不限制" />
            </Form.Item>
          </Col>
        </Row>
      ),
    },
  ];

  return (
    <>
      <Row gutter={16}>
        <Col span={6}>
          <Form.Item
            label="HTTP 方法"
            name={['request', 'method']}
            rules={[{ required: true, message: '请选择 HTTP 方法' }]}
          >
            <Select options={HTTP_METHODS.map((m) => ({ value: m, label: m }))} />
          </Form.Item>
        </Col>
        <Col span={7}>
          <Form.Item label="URL 匹配方式" name={['request', 'urlMatchType']}>
            <Select
              options={URL_MATCH_TYPES.map((item) => ({ value: item.value, label: item.label }))}
            />
          </Form.Item>
        </Col>
        <Col span={11}>
          <Form.Item
            label="URL 匹配值"
            name={['request', 'urlValue']}
            rules={[{ required: true, message: '请填写 URL 匹配值' }]}
            extra="四种匹配方式互斥，只会下发当前选中的一种"
          >
            <Input placeholder={urlTypeConfig.placeholder} />
          </Form.Item>
        </Col>
      </Row>

      <Collapse items={items} />
    </>
  );
};

export default RequestConfigTab;
