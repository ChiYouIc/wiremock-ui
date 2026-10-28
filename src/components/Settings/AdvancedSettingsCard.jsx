import React from 'react';
import { Card, Form, InputNumber, Switch } from 'antd';

const AdvancedSettingsCard = () => {
  return (
    <Card title="请求日志" className="content-card">
      <Form.Item
        label="禁用请求日志"
        name="requestJournalDisabled"
        valuePropName="checked"
        extra="对应 GlobalSettings.requestJournalDisabled，开启后不再记录任何请求"
      >
        <Switch />
      </Form.Item>

      <Form.Item
        label="请求日志最大条数"
        name="maxRequestJournalEntries"
        extra="对应 GlobalSettings.maxRequestJournalEntries"
      >
        <InputNumber min={0} placeholder="不限制" style={{ width: '100%' }} />
      </Form.Item>

      <Form.Item
        label="隐藏启动横幅"
        name="disableBanner"
        valuePropName="checked"
        extra="对应 GlobalSettings.disableBanner"
      >
        <Switch />
      </Form.Item>
    </Card>
  );
};

export default AdvancedSettingsCard;
