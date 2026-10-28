import React from 'react';
import { Card, Form, Switch } from 'antd';

const MatchingSettingsCard = () => {
  return (
    <Card title="CORS 与代理行为" className="content-card">
      <Form.Item
        label="启用浏览器代理"
        name="enableBrowserProxying"
        valuePropName="checked"
        extra="对应 GlobalSettings.enableBrowserProxying"
      >
        <Switch />
      </Form.Item>

      <Form.Item
        label="为存根响应启用 CORS"
        name="enableStubCors"
        valuePropName="checked"
        extra="对应 GlobalSettings.enableStubCors"
      >
        <Switch />
      </Form.Item>

      <Form.Item
        label="保留 Host 头"
        name="preserveHostHeader"
        valuePropName="checked"
        extra="对应 GlobalSettings.preserveHostHeader"
      >
        <Switch />
      </Form.Item>
    </Card>
  );
};

export default MatchingSettingsCard;
