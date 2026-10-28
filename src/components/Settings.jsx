import React, { useEffect, useState } from 'react';
import { Button, Space, Typography, Form, notification, Tag, Alert } from 'antd';
import { ReloadOutlined, UndoOutlined, SaveOutlined } from '@ant-design/icons';
import { systemApi } from '../services/wiremockApi';
import { showApiError } from '../services/wiremockErrors';
import {
  getCapabilities,
  detectCapabilities,
  toSettingsPayload,
  unwrapSettings,
} from '../services/capabilities';
import BasicSettingsCard from './Settings/BasicSettingsCard';
import AdvancedSettingsCard from './Settings/AdvancedSettingsCard';
import MatchingSettingsCard from './Settings/MatchingSettingsCard';
import NetworkSettingsCard from './Settings/NetworkSettingsCard';
import SettingsInstructions from './Settings/SettingsInstructions';

const { Title, Text } = Typography;

// 与 WireMock GlobalSettings 对齐的字段；写入时只提交这些键
// delayDistribution 是对象，单独由 delayDistributionType 等扁平字段拼装
const SETTINGS_KEYS = [
  'fixedDelay',
  'requestJournalDisabled',
  'maxRequestJournalEntries',
  'proxyVia',
  'proxyTimeout',
  'proxyAll',
  'disableBanner',
  'enableBrowserProxying',
  'enableStubCors',
  'preserveHostHeader',
];

const buildSettings = (values) => {
  const settings = SETTINGS_KEYS.reduce((acc, key) => {
    if (values[key] !== undefined && values[key] !== '') {
      acc[key] = values[key];
    }
    return acc;
  }, {});

  if (values.delayDistributionType === 'uniform') {
    settings.delayDistribution = {
      type: 'uniform',
      lower: Number(values.delayLower) || 0,
      upper: Number(values.delayUpper) || 0,
    };
  } else if (values.delayDistributionType === 'lognormal') {
    settings.delayDistribution = {
      type: 'lognormal',
      median: Number(values.delayMedian) || 0,
      sigma: Number(values.delaySigma) || 0,
    };
  }

  return settings;
};

const applySettings = (settings) => {
  if (!settings) return {};
  const { delayDistribution, ...rest } = settings;
  const flat = { ...rest, delayDistributionType: delayDistribution?.type || 'none' };
  if (delayDistribution?.type === 'uniform') {
    flat.delayLower = delayDistribution.lower;
    flat.delayUpper = delayDistribution.upper;
  }
  if (delayDistribution?.type === 'lognormal') {
    flat.delayMedian = delayDistribution.median;
    flat.delaySigma = delayDistribution.sigma;
  }
  return flat;
};

const Settings = () => {
  const [loading, setLoading] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [canRead, setCanRead] = useState(getCapabilities().supportsSettingsRead);
  const [form] = Form.useForm();

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const caps = await detectCapabilities();
      setCanRead(caps.supportsSettingsRead);
      if (!caps.supportsSettingsRead) {
        notification.warning({
          message: '当前 WireMock 不支持读取全局设置',
          description: '该版本只提供 POST /__admin/settings，本页改为「只写」模式。',
        });
        return;
      }
      const response = await systemApi.getSettings();
      form.resetFields();
      form.setFieldsValue(applySettings(unwrapSettings(response.data)));
      setDirty(false);
    } catch (error) {
      showApiError(error, '获取设置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (values) => {
    setLoading(true);
    try {
      await systemApi.updateSettings(toSettingsPayload(buildSettings(values)));
      notification.success({
        message: '设置已保存',
        description: '全局设置已成功更新',
      });
      setDirty(false);
      if (canRead) fetchSettings();
      else form.resetFields();
    } catch (error) {
      showApiError(error, '保存设置失败');
    } finally {
      setLoading(false);
    }
  };

  // 撤销未保存的修改：能读就回到服务端值，只写模式则清空
  const handleRevert = () => {
    if (canRead) {
      fetchSettings();
    } else {
      form.resetFields();
      setDirty(false);
    }
    notification.info({ message: '已撤销未保存的修改' });
  };

  // Ctrl / ⌘ + S 保存
  useEffect(() => {
    const onKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        form.submit();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [form]);

  return (
    <div className="fade-in page-stack">
      <div className="page-header">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 16,
            flexWrap: 'wrap',
          }}
        >
          <div>
            <Space align="center" size={8}>
              <Title level={2} style={{ margin: 0 }}>
                系统设置
              </Title>
              {dirty && <Tag color="orange">有未保存的修改</Tag>}
            </Space>
            <div>
              <Text type="secondary">配置 WireMock 全局参数（GlobalSettings）</Text>
            </div>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchSettings} loading={loading}>
              刷新
            </Button>
            <Button icon={<UndoOutlined />} onClick={handleRevert} disabled={!dirty}>
              撤销修改
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              form="settings-form"
              icon={<SaveOutlined />}
              loading={loading}
            >
              保存设置
            </Button>
          </Space>
        </div>
      </div>

      {!canRead && (
        <Alert
          type="warning"
          showIcon
          message="只写模式"
          description="当前服务端没有提供 GET /__admin/settings，无法读取现有值；保存时将只提交你填写过的字段。"
        />
      )}

      <Form
        id="settings-form"
        form={form}
        layout="vertical"
        onFinish={handleSave}
        onValuesChange={() => setDirty(true)}
        className="page-stack"
      >
        <div className="card-flow">
          <BasicSettingsCard />
          <AdvancedSettingsCard />
          <MatchingSettingsCard />
          <NetworkSettingsCard />
        </div>
      </Form>

      <SettingsInstructions />
    </div>
  );
};

export default Settings;
