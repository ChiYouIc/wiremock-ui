import React from 'react';
import { Form, Input, Row, Col, InputNumber, Switch, AutoComplete } from 'antd';

const { TextArea } = Input;

const BasicInfoTab = ({ groupOptions = [] }) => {
  return (
    <>
      <Row gutter={16}>
        <Col span={9}>
          <Form.Item label="映射名称" name="name">
            <Input placeholder="输入映射名称" />
          </Form.Item>
        </Col>
        <Col span={5}>
          <Form.Item label="分组" name={['metadata', 'wmui', 'group']} extra="仅本工具内的分类标签">
            <AutoComplete
              allowClear
              placeholder="如 team-a"
              options={groupOptions.map((group) => ({ value: group }))}
              filterOption={(input, option) =>
                String(option?.value || '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </Form.Item>
        </Col>
        <Col span={4}>
          <Form.Item label="优先级" name="priority" extra="1 最高">
            <InputNumber min={1} style={{ width: '100%' }} />
          </Form.Item>
        </Col>
        <Col span={3}>
          <Form.Item label="场景名称" name="scenarioName">
            <Input placeholder="场景" />
          </Form.Item>
        </Col>
        <Col span={3}>
          <Form.Item label="持久化" name="persistent" valuePropName="checked">
            <Switch />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="所需场景状态" name="requiredScenarioState">
            <Input placeholder="例如 Started" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="命中后的新状态" name="newScenarioState">
            <Input placeholder="例如 step2" />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item label="备注（写入 metadata.wmui.description）" name={['metadata', 'wmui', 'description']}>
        <TextArea rows={2} placeholder="输入映射的详细说明..." />
      </Form.Item>
    </>
  );
};

export default BasicInfoTab;
