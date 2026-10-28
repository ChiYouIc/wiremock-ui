import React, { useState } from 'react';
import { Card, Form, Input, Button, Space, Row, Col, Alert, Tabs, Typography } from 'antd';
import { SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import { nearMissesApi, requestsApi } from '../services/wiremockApi';
import { showApiError } from '../services/wiremockErrors';
import NearMissTable from './NearMisses/NearMissTable';

const { Title, Text, Paragraph } = Typography;

const NearMisses = () => {
  const [patternResults, setPatternResults] = useState([]);
  const [patternLoading, setPatternLoading] = useState(false);
  const [unmatchedResults, setUnmatchedResults] = useState([]);
  const [unmatchedLoading, setUnmatchedLoading] = useState(false);
  const [patternForm] = Form.useForm();

  const handleSearchPattern = async (values) => {
    setPatternLoading(true);
    try {
      const pattern = { method: values.method || 'GET' };
      if (values.urlPathPattern) pattern.urlPathPattern = values.urlPathPattern;
      else if (values.url) pattern.url = values.url;

      if (values.body) {
        pattern.bodyPatterns = [{ [values.bodyMatcher || 'equalTo']: values.body }];
      }

      const response = await nearMissesApi.forRequestPattern(pattern);
      setPatternResults(response.data?.nearMisses || []);
    } catch (error) {
      showApiError(error, '查询失败');
      setPatternResults([]);
    } finally {
      setPatternLoading(false);
    }
  };

  const handleLoadUnmatched = async () => {
    setUnmatchedLoading(true);
    try {
      const response = await requestsApi.getNearMissesForUnmatched();
      setUnmatchedResults(response.data?.nearMisses || []);
    } catch (error) {
      showApiError(error, '查询失败');
      setUnmatchedResults([]);
    } finally {
      setUnmatchedLoading(false);
    }
  };

  const patternTab = (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        message="near-misses/request-pattern"
        description="给出一条「你以为会命中」的请求模式，WireMock 会返回最接近的若干映射及差异。适合排查为什么某条映射不生效。"
      />
      <Form form={patternForm} layout="vertical" onFinish={handleSearchPattern}>
        <Row gutter={16}>
          <Col span={5}>
            <Form.Item label="方法" name="method" initialValue="GET">
              <Input placeholder="GET" />
            </Form.Item>
          </Col>
          <Col span={10}>
            <Form.Item label="URL 路径" name="url">
              <Input placeholder="/some/path" />
            </Form.Item>
          </Col>
          <Col span={9}>
            <Form.Item label="URL 路径正则" name="urlPathPattern">
              <Input placeholder="/some/.*" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={6}>
            <Form.Item label="请求体匹配器" name="bodyMatcher" initialValue="equalTo">
              <Input placeholder="equalTo" />
            </Form.Item>
          </Col>
          <Col span={18}>
            <Form.Item label="请求体" name="body">
              <Input placeholder='{"message": "hello"}' />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item>
          <Button type="primary" htmlType="submit" icon={<SearchOutlined />} loading={patternLoading}>
            查找最接近的映射
          </Button>
        </Form.Item>
      </Form>
      <NearMissTable nearMisses={patternResults} loading={patternLoading} />
    </Space>
  );

  const unmatchedTab = (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Alert
        type="info"
        showIcon
        message="requests/unmatched/near-misses"
        description="一次性列出所有「未匹配请求」与最接近映射的差距。"
      />
      <div>
        <Button icon={<ReloadOutlined />} onClick={handleLoadUnmatched} loading={unmatchedLoading}>
          加载未匹配请求的近似结果
        </Button>
      </div>
      <NearMissTable nearMisses={unmatchedResults} loading={unmatchedLoading} />
    </Space>
  );

  return (
    <div className="fade-in page-stack">
      <div className="page-header">
        <Title level={2} style={{ margin: 0 }}>
          Near-Miss 调试
        </Title>
        <Text type="secondary">
          <Paragraph type="secondary" style={{ margin: 0 }}>
            distance 越小表示越接近；相似度 = 1 - distance。
          </Paragraph>
        </Text>
      </div>

      <Card className="content-card">
        <Tabs
          items={[
            { key: 'unmatched', label: '未匹配请求', children: unmatchedTab },
            { key: 'pattern', label: '按请求模式', children: patternTab },
          ]}
        />
      </Card>
    </div>
  );
};

export default NearMisses;
