import React from 'react';
import { Card, Form, Input, InputNumber, Switch } from 'antd';

const NetworkSettingsCard = () => {
  return (
    <Card title="代理" className="content-card">
      <Form.Item
        label="开启全局代理"
        name="proxyAll"
        valuePropName="checked"
        extra="对应 GlobalSettings.proxyAll"
      >
        <Switch />
      </Form.Item>

      <Form.Item label="Via 头" name="proxyVia" extra="对应 GlobalSettings.proxyVia">
        <Input placeholder="WireMock" />
      </Form.Item>

      <Form.Item label="代理超时 (ms)" name="proxyTimeout" extra="对应 GlobalSettings.proxyTimeout">
        <InputNumber min={1000} placeholder="30000" style={{ width: '100%' }} />
      </Form.Item>
    </Card>
  );
};

export default NetworkSettingsCard;
