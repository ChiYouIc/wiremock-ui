import React, { useEffect, useState } from 'react';
import { Form, Input, Select, Row, Col, Collapse, Button, Space, Checkbox } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import KeyValueEditor from '../KeyValueEditor';
import {
  URL_MATCH_TYPES,
  HTTP_METHODS,
  BODY_MATCHERS,
  PATH_PARAMETER_MATCH_TYPES,
  REGEX_MATCH_TYPES,
  looksLikePathTemplate,
} from '../mappingModel';

const { TextArea } = Input;

const PANEL_KEYS = ['pairs', 'auth', 'body', 'advanced'];

const RequestConfigTab = ({ revealSignal = 0 }) => {
  const form = Form.useFormInstance();
  const urlMatchType = Form.useWatch(['request', 'urlMatchType'], form) || 'urlPath';
  const urlValue = Form.useWatch(['request', 'urlValue'], form);
  const bodyMatchers = Form.useWatch(['request', 'bodyMatchers'], form) || [];
  const [activeKeys, setActiveKeys] = useState([]);

  // 校验失败时展开所有面板，否则错误提示藏在折叠面板里看不见
  useEffect(() => {
    if (revealSignal > 0) setActiveKeys(PANEL_KEYS);
  }, [revealSignal]);
  const urlTypeConfig =
    URL_MATCH_TYPES.find((item) => item.value === urlMatchType) || URL_MATCH_TYPES[0];
  const templateInRegex = REGEX_MATCH_TYPES.has(urlMatchType) && looksLikePathTemplate(urlValue);

  const urlExtra = templateInRegex
    ? '当前匹配方式按 Java 正则解析，{version} 这类占位符会被当成非法量词（Illegal repetition）；请改用「路径模板（urlPathTemplate）」'
    : '几种匹配方式互斥，只会下发当前选中的一种';

  const items = [
    {
      key: 'pairs',
      label: '查询参数 / 请求头 / Cookie / 表单参数',
      // 面板未展开时 Form.Item 不会注册，forceRender 保证值能参与提交
      forceRender: true,
      children: (
        <>
          <Form.Item label="查询参数" name={['request', 'queryParameters']}>
            <KeyValueEditor placeholder="查询参数" allowPredicate valueMode="pattern" />
          </Form.Item>
          <Form.Item label="请求头" name={['request', 'headers']}>
            <KeyValueEditor placeholder="请求头" allowPredicate valueMode="pattern" />
          </Form.Item>
          <Form.Item label="Cookie" name={['request', 'cookies']}>
            <KeyValueEditor placeholder="Cookie" allowPredicate valueMode="pattern" />
          </Form.Item>
          <Form.Item label="表单参数" name={['request', 'formParameters']}>
            <KeyValueEditor placeholder="表单参数" allowPredicate valueMode="pattern" />
          </Form.Item>
          {PATH_PARAMETER_MATCH_TYPES.has(urlMatchType) && (
            <Form.Item
              label="路径参数"
              name={['request', 'pathParameters']}
              extra="键需与路径中的变量名一致，例如 urlPathTemplate=/users/{id} 时填 id"
            >
              <KeyValueEditor placeholder="路径参数" allowPredicate valueMode="pattern" />
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
              {fields.map(({ key, name, ...restField }) => {
                const matcher = bodyMatchers[name]?.matcher;
                return (
                  <div key={key} style={{ marginBottom: 8 }}>
                    <Row gutter={8} align="top">
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
                    {(matcher === 'equalTo' || matcher === 'equalToJson') && (
                      <Space size={16} style={{ marginTop: 4, paddingLeft: 4 }}>
                        {matcher === 'equalTo' && (
                          <Form.Item name={[name, 'caseInsensitive']} valuePropName="checked" noStyle>
                            <Checkbox>忽略大小写</Checkbox>
                          </Form.Item>
                        )}
                        {matcher === 'equalToJson' && (
                          <>
                            <Form.Item
                              name={[name, 'ignoreArrayOrder']}
                              valuePropName="checked"
                              noStyle
                            >
                              <Checkbox>忽略数组顺序</Checkbox>
                            </Form.Item>
                            <Form.Item
                              name={[name, 'ignoreExtraElements']}
                              valuePropName="checked"
                              noStyle
                            >
                              <Checkbox>忽略多余字段</Checkbox>
                            </Form.Item>
                          </>
                        )}
                      </Space>
                    )}
                  </div>
                );
              })}
              <Space direction="vertical" style={{ width: '100%' }}>
                <Button
                  type="dashed"
                  block
                  icon={<PlusOutlined />}
                  onClick={() =>
                    add({
                      matcher: 'equalTo',
                      value: '',
                      caseInsensitive: false,
                      ignoreArrayOrder: true,
                      ignoreExtraElements: true,
                    })
                  }
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
            extra={urlExtra}
          >
            <Input placeholder={urlTypeConfig.placeholder} />
          </Form.Item>
        </Col>
      </Row>

      <Collapse items={items} activeKey={activeKeys} onChange={setActiveKeys} />
    </>
  );
};

export default RequestConfigTab;
