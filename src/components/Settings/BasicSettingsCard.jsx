import React from 'react';
import { Card, Form, InputNumber, Select, Row, Col } from 'antd';

const BasicSettingsCard = () => {
  const form = Form.useFormInstance();
  const delayType = Form.useWatch('delayDistributionType', form) || 'none';

  return (
    <Card title="响应延时" className="content-card">
      <Form.Item
        label="全局固定延时 (ms)"
        name="fixedDelay"
        extra="对应 GlobalSettings.fixedDelay"
      >
        <InputNumber min={0} placeholder="0" style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item
        label="全局随机延时分布"
        name="delayDistributionType"
        extra="对应 GlobalSettings.delayDistribution（对象形态）"
      >
        <Select
          options={[
            { value: 'none', label: '不使用' },
            { value: 'uniform', label: '均匀分布（lower/upper）' },
            { value: 'lognormal', label: '对数正态（median/sigma）' },
          ]}
        />
      </Form.Item>

      {delayType === 'uniform' && (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="下限 (ms)" name="delayLower">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="上限 (ms)" name="delayUpper">
              <InputNumber min={0} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
      )}

      {delayType === 'lognormal' && (
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="median" name="delayMedian">
              <InputNumber min={1} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="sigma" name="delaySigma">
              <InputNumber min={0.01} step={0.01} style={{ width: '100%' }} />
            </Form.Item>
          </Col>
        </Row>
      )}
    </Card>
  );
};

export default BasicSettingsCard;
