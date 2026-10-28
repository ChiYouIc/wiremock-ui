import React, { useState, useEffect } from 'react';
import { Button, Typography, Form, notification, Row, Col } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { recordingsApi } from '../services/wiremockApi';
import { showApiError } from '../services/wiremockErrors';
import RecordingStatusCard from './Recording/RecordingStatusCard';
import StartRecordingCard from './Recording/StartRecordingCard';
import SnapshotRecordingCard from './Recording/SnapshotRecordingCard';
import RecordingInstructions from './Recording/RecordingInstructions';

const { Title, Text } = Typography;

const parseCaptureHeaders = (text) => {
  const names = String(text || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  if (names.length === 0) return undefined;
  return names.reduce((acc, name) => ({ ...acc, [name]: {} }), {});
};

const splitTransformers = (text) =>
  String(text || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

// filters 是 request-pattern：method 必须匹配 ^[A-Z]+$
const buildFilters = (values, withIds) => {
  const filters = {};
  if (values.urlPathPattern) filters.urlPathPattern = values.urlPathPattern;
  if (values.method && /^[A-Z]+$/.test(values.method.trim())) {
    filters.method = values.method.trim();
  }
  if (withIds) {
    const ids = String(values.ids || '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    if (ids.length > 0) filters.ids = ids;
  }
  return Object.keys(filters).length > 0 ? filters : undefined;
};

const Recording = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const fetchRecordingStatus = async () => {
    try {
      const response = await recordingsApi.status();
      setStatus(response.data?.status || 'NeverStarted');
    } catch {
      setStatus(null);
    }
  };

  useEffect(() => {
    fetchRecordingStatus();
  }, []);

  const handleStartRecording = async (values) => {
    setLoading(true);
    try {
      const config = {
        targetBaseUrl: values.targetBaseUrl,
        persist: values.persist !== false,
        repeatsAsScenarios: values.repeatsAsScenarios === true,
      };

      const filters = buildFilters(values, false);
      if (filters) config.filters = filters;

      const captureHeaders = parseCaptureHeaders(values.captureHeaders);
      if (captureHeaders) config.captureHeaders = captureHeaders;

      if (values.requestBodyPatternMatcher) {
        config.requestBodyPattern = {
          matcher: values.requestBodyPatternMatcher,
          ignoreArrayOrder: true,
          ignoreExtraElements: true,
        };
      }

      const transformers = splitTransformers(values.transformers);
      if (transformers.length > 0) config.transformers = transformers;

      await recordingsApi.start(config);
      notification.success({
        message: '录制已开始',
        description: '正在按 targetBaseUrl 代理并录制请求',
      });
      fetchRecordingStatus();
    } catch (error) {
      showApiError(error, '开始录制失败');
    } finally {
      setLoading(false);
    }
  };

  const handleStopRecording = async () => {
    setLoading(true);
    try {
      const response = await recordingsApi.stop();
      const count = Array.isArray(response.data?.mappings) ? response.data.mappings.length : 0;
      notification.success({
        message: '录制已停止',
        description: `共生成 ${count} 个映射`,
      });
      fetchRecordingStatus();
    } catch (error) {
      showApiError(error, '停止录制失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSnapshot = async (values) => {
    setLoading(true);
    try {
      const config = {
        persist: values.persist !== false,
        repeatsAsScenarios: values.repeatsAsScenarios === true,
      };

      const filters = buildFilters(values, true);
      if (filters) config.filters = filters;

      const captureHeaders = parseCaptureHeaders(values.captureHeaders);
      if (captureHeaders) config.captureHeaders = captureHeaders;

      const response = await recordingsApi.snapshot(config);
      const count = Array.isArray(response.data?.mappings) ? response.data.mappings.length : 0;
      notification.success({
        message: '快照录制完成',
        description: `共生成 ${count} 个映射`,
      });
    } catch (error) {
      showApiError(error, '快照录制失败');
    } finally {
      setLoading(false);
    }
  };

  const isRecording = status === 'Recording';

  return (
    <div className="fade-in page-stack">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              录制回放
            </Title>
            <Text type="secondary">录制真实 API 响应并生成 stub 映射</Text>
          </div>
          <Button icon={<ReloadOutlined />} onClick={fetchRecordingStatus}>
            刷新状态
          </Button>
        </div>
      </div>

      <RecordingStatusCard
        status={status}
        isRecording={isRecording}
        onStopRecording={handleStopRecording}
        loading={loading}
      />

      <Row gutter={16}>
        <Col xs={24} lg={12}>
          <StartRecordingCard
            form={form}
            onStartRecording={handleStartRecording}
            isRecording={isRecording}
            loading={loading}
          />
        </Col>

        <Col xs={24} lg={12}>
          <SnapshotRecordingCard onSnapshot={handleSnapshot} loading={loading} />
        </Col>
      </Row>

      <RecordingInstructions />
    </div>
  );
};

export default Recording;
