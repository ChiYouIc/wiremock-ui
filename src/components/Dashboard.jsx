import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Typography,
  Alert,
  Button,
  Space,
  message,
  Tag,
  Table,
  Progress,
  Switch,
  Empty,
  Tooltip,
} from 'antd';
import {
  ApiOutlined,
  HistoryOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  PlayCircleOutlined,
  FolderOpenOutlined,
  LinkOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  AimOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  stubMappingsApi,
  requestsApi,
  scenariosApi,
  filesApi,
  recordingsApi,
  systemApi,
} from '../services/wiremockApi';
import { showApiError } from '../services/wiremockErrors';

const { Title, Text, Paragraph } = Typography;

const RECENT_REQUEST_LIMIT = 200;

const METHOD_COLORS = {
  GET: '#1677ff',
  POST: '#52c41a',
  PUT: '#fa8c16',
  DELETE: '#ff4d4f',
  PATCH: '#722ed1',
  HEAD: '#13c2c2',
  OPTIONS: '#eb2f96',
};

const STATUS_COLORS = {
  '2xx': '#52c41a',
  '3xx': '#1677ff',
  '4xx': '#fa8c16',
  '5xx': '#ff4d4f',
  无响应: '#d9d9d9',
};

const formatUptime = (seconds) => {
  if (typeof seconds !== 'number') return '-';
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (days > 0) return `${days} 天 ${hours} 小时`;
  if (hours > 0) return `${hours} 小时 ${minutes} 分`;
  if (minutes > 0) return `${minutes} 分`;
  return `${seconds} 秒`;
};

const pathOf = (url = '') => url.split('?')[0] || '/';

const statusBucket = (status) => {
  if (!status) return '无响应';
  const bucket = Math.floor(status / 100);
  return bucket >= 2 && bucket <= 5 ? `${bucket}xx` : '无响应';
};

const DistBar = ({ label, value, total, color }) => {
  const percent = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="dist-row">
      <span className="dist-label">{label}</span>
      <div className="dist-track">
        <div className="dist-fill" style={{ width: `${percent}%`, background: color }} />
      </div>
      <span className="dist-value">
        {value}
        <Text type="secondary" style={{ fontSize: 12, marginLeft: 4 }}>
          {percent}%
        </Text>
      </span>
    </div>
  );
};

const Dashboard = ({ capabilities }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [data, setData] = useState({
    mappings: [],
    unmatchedMappings: 0,
    requests: [],
    unmatchedRequests: [],
    journal: { count: 0, requestJournalDisabled: false },
    scenarios: [],
    files: [],
    recordingStatus: null,
    health: null,
  });

  const mockServiceUrl = window.location.origin;

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const [mappings, unmatchedMappings, requests, unmatched, journal, scenarios, files, recording, health] =
      await Promise.allSettled([
        stubMappingsApi.getAll(),
        stubMappingsApi.getUnmatched(),
        requestsApi.getAll({ limit: RECENT_REQUEST_LIMIT }),
        requestsApi.getUnmatched(),
        requestsApi.count(),
        scenariosApi.getAll(),
        filesApi.list(),
        recordingsApi.status(),
        systemApi.getHealth(),
      ]);

    const pick = (result, fallback) =>
      result.status === 'fulfilled' ? result.value.data : fallback;
    const arrayOf = (result, key) => {
      const value = pick(result, null);
      return Array.isArray(value?.[key]) ? value[key] : [];
    };

    const filesData = pick(files, []);

    setData({
      mappings: arrayOf(mappings, 'mappings'),
      unmatchedMappings: pick(unmatchedMappings, { meta: {} })?.meta?.total ?? 0,
      requests: arrayOf(requests, 'requests'),
      unmatchedRequests: arrayOf(unmatched, 'requests'),
      journal: pick(journal, { count: 0, requestJournalDisabled: false }) || {},
      scenarios: arrayOf(scenarios, 'scenarios'),
      files: Array.isArray(filesData) ? filesData : [],
      recordingStatus: pick(recording, null)?.status || null,
      health: pick(health, null),
    });
    setUpdatedAt(new Date());
    setLoading(false);

    const failed = [mappings, unmatchedMappings, requests, journal].filter(
      (result) => result.status === 'rejected'
    );
    if (failed.length > 0) {
      showApiError(failed[0].reason, '部分数据获取失败');
    }
  }, []);

  useEffect(() => {
    if (!capabilities?.reachable) return;
    fetchAll();
  }, [capabilities?.reachable, fetchAll]);

  useEffect(() => {
    if (!autoRefresh || !capabilities?.reachable) return undefined;
    const timer = setInterval(() => {
      if (!document.hidden) fetchAll();
    }, 15000);
    return () => clearInterval(timer);
  }, [autoRefresh, capabilities?.reachable, fetchAll]);

  const stats = useMemo(() => {
    const totalRequests = data.journal?.count ?? data.requests.length;
    const unmatchedCount = data.unmatchedRequests.length;
    const matchedRate =
      totalRequests > 0
        ? Math.max(0, ((totalRequests - unmatchedCount) / totalRequests) * 100)
        : null;

    const methodCounts = {};
    data.requests.forEach((record) => {
      const method = record.request?.method || 'OTHER';
      methodCounts[method] = (methodCounts[method] || 0) + 1;
    });

    const statusCounts = { '2xx': 0, '3xx': 0, '4xx': 0, '5xx': 0, 无响应: 0 };
    data.requests.forEach((record) => {
      const status = record.response?.status ?? record.responseDefinition?.status;
      statusCounts[statusBucket(status)] += 1;
    });

    const mappingNames = {};
    data.mappings.forEach((mapping) => {
      const request = mapping.request || {};
      mappingNames[mapping.id] =
        mapping.name ||
        `${request.method || ''} ${request.urlPath || request.urlPathTemplate || request.urlPathPattern || request.url || ''}`.trim();
    });

    const stubHits = {};
    data.requests.forEach((record) => {
      const stub = record.stubMapping;
      if (!stub?.id) return;
      // 未命中时 WireMock 会塞一个 response.fromConfiguredStub=false 的占位映射，需要排除
      const matched =
        typeof record.wasMatched === 'boolean'
          ? record.wasMatched
          : stub.response?.fromConfiguredStub !== false;
      if (!matched) return;

      if (!stubHits[stub.id]) {
        const request = stub.request || {};
        stubHits[stub.id] = {
          id: stub.id,
          name:
            mappingNames[stub.id] ||
            stub.name ||
            `${request.method || ''} ${request.urlPath || request.urlPathTemplate || request.urlPathPattern || request.url || ''}`.trim() ||
            stub.id.slice(0, 8),
          count: 0,
        };
      }
      stubHits[stub.id].count += 1;
    });

    const unmatchedUrls = {};
    data.unmatchedRequests.forEach((record) => {
      // /requests/unmatched 返回的是扁平的 logged request，而不是 { request: ... } 包装
      const request = record.request || record;
      const key = `${request.method || 'ANY'} ${pathOf(request.url)}`;
      unmatchedUrls[key] = (unmatchedUrls[key] || 0) + 1;
    });

    const nonStartedScenarios = data.scenarios.filter(
      (scenario) => scenario.state && scenario.state !== 'Started'
    );

    return {
      totalMappings: data.mappings.length,
      totalRequests,
      unmatchedCount,
      matchedRate,
      methodCounts,
      statusCounts,
      sampleSize: data.requests.length,
      topStubs: Object.values(stubHits)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      topUnmatchedUrls: Object.entries(unmatchedUrls)
        .map(([key, count]) => ({ key, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5),
      staleStubs: data.unmatchedMappings,
      scenarioCount: data.scenarios.length,
      nonStartedCount: nonStartedScenarios.length,
      fileCount: data.files.length,
      isRecording: data.recordingStatus === 'Recording',
      journalDisabled: Boolean(data.journal?.requestJournalDisabled),
    };
  }, [data]);

  const handleCopyUrl = () => {
    navigator.clipboard
      .writeText(mockServiceUrl)
      .then(() => message.success('Mock 服务地址已复制'))
      .catch(() => message.error('复制失败，请手动复制'));
  };

  const handleClearStaleStubs = async () => {
    try {
      await stubMappingsApi.removeUnmatched();
      message.success('已清理从未命中的映射');
      fetchAll();
    } catch (error) {
      showApiError(error, '清理失败');
    }
  };

  if (!capabilities?.reachable) {
    return (
      <div className="fade-in">
        <Alert
          type="error"
          showIcon
          message="未连接到 WireMock"
          description="请确认 WireMock 已在 8080 端口启动，且 /__admin 代理可用。"
          action={
            <Button size="small" onClick={() => window.location.reload()}>
              重试
            </Button>
          }
        />
      </div>
    );
  }

  const recentColumns = [
    {
      title: '方法',
      dataIndex: ['request', 'method'],
      key: 'method',
      width: 74,
      render: (method) => <Tag color={METHOD_COLORS[method] || 'default'}>{method || 'ANY'}</Tag>,
    },
    {
      title: 'URL',
      key: 'url',
      ellipsis: true,
      render: (_, record) => <Text code>{record.request?.url || '-'}</Text>,
    },
    {
      title: '状态',
      key: 'status',
      width: 74,
      render: (_, record) => {
        const status = record.response?.status ?? record.responseDefinition?.status;
        const color = status >= 400 ? 'red' : status >= 300 ? 'blue' : 'green';
        return status ? <Tag color={color}>{status}</Tag> : <Tag>无</Tag>;
      },
    },
    {
      title: '命中',
      key: 'matched',
      width: 74,
      render: (_, record) => {
        const matched =
          typeof record.wasMatched === 'boolean'
            ? record.wasMatched
            : Boolean(record.stubMapping?.id);
        return <Tag color={matched ? 'green' : 'red'}>{matched ? '是' : '否'}</Tag>;
      },
    },
  ];

  const attention =
    stats.staleStubs > 0 || stats.unmatchedCount > 0 || stats.nonStartedCount > 0;

  return (
    <div className="fade-in page-stack">
      <div className="page-header dashboard-header">
        <div>
          <Title level={2} style={{ margin: 0 }}>
            仪表板
          </Title>
          <Text type="secondary">
            WireMock 服务总览
            {updatedAt && ` · 最后更新 ${updatedAt.toLocaleTimeString('zh-CN')}`}
          </Text>
        </div>
        <Space wrap>
          <Space size={6}>
            <Switch size="small" checked={autoRefresh} onChange={setAutoRefresh} />
            <Text type="secondary">自动刷新 15s</Text>
          </Space>
          <Button icon={<ReloadOutlined />} onClick={fetchAll} loading={loading}>
            刷新
          </Button>
        </Space>
      </div>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} xl={6}>
          <Card className="content-card">
            <Statistic
              title="Stub 映射"
              value={stats.totalMappings}
              prefix={<ApiOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="content-card">
            <Statistic
              title="请求记录"
              value={stats.totalRequests}
              prefix={<HistoryOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="content-card">
            <Statistic
              title="未匹配请求"
              value={stats.unmatchedCount}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: stats.unmatchedCount > 0 ? '#cf1322' : '#3f8600' }}
              loading={loading}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <Card className="content-card">
            <Statistic
              title="匹配率"
              value={stats.matchedRate === null ? '-' : stats.matchedRate}
              precision={stats.matchedRate === null ? undefined : 1}
              suffix={stats.matchedRate === null ? '' : '%'}
              prefix={<CheckCircleOutlined />}
              valueStyle={{
                color:
                  stats.matchedRate === null
                    ? undefined
                    : stats.matchedRate >= 90
                      ? '#3f8600'
                      : stats.matchedRate >= 60
                        ? '#d48806'
                        : '#cf1322',
              }}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      <div className="card-flow">
          <Card title="运行状态" className="content-card" loading={loading}>
            <div className="status-grid">
              <div>
                <Text type="secondary">版本</Text>
                <div>
                  <Tag color="blue">{capabilities.version || data.health?.version || '未知'}</Tag>
                </div>
              </div>
              <div>
                <Text type="secondary">运行时长</Text>
                <div>
                  <ClockCircleOutlined /> {formatUptime(data.health?.uptimeInSeconds)}
                </div>
              </div>
              <div>
                <Text type="secondary">录制</Text>
                <div>{stats.isRecording ? <Tag color="red">录制中</Tag> : <Tag>未录制</Tag>}</div>
              </div>
              <div>
                <Text type="secondary">请求日志</Text>
                <div>
                  {stats.journalDisabled ? (
                    <Tag color="orange">已关闭</Tag>
                  ) : (
                    <Tag color="green">记录中</Tag>
                  )}
                </div>
              </div>
              <div>
                <Text type="secondary">场景</Text>
                <div>
                  {stats.scenarioCount} 个
                  {stats.nonStartedCount > 0 && (
                    <Tag color="purple" style={{ marginLeft: 6 }}>
                      {stats.nonStartedCount} 个已流转
                    </Tag>
                  )}
                </div>
              </div>
              <div>
                <Text type="secondary">文件（__files）</Text>
                <div>{stats.fileCount} 个</div>
              </div>
            </div>
            <div className="status-url">
              <Text type="secondary">Mock 地址</Text>
              <Space>
                <Text code>{mockServiceUrl}</Text>
                <Button size="small" type="text" icon={<CopyOutlined />} onClick={handleCopyUrl} />
              </Space>
            </div>
          </Card>

          <Card
            title={
              <Space>
                需要关注
                {attention && <Tag color="orange">有待处理项</Tag>}
              </Space>
            }
            className="content-card"
            loading={loading}
          >
            {!attention ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="一切正常：没有未匹配请求，也没有从未命中的映射"
              />
            ) : (
              <Space direction="vertical" size={12} style={{ width: '100%' }}>
                {stats.staleStubs > 0 && (
                  <div className="attention-row">
                    <div>
                      <Text strong>{stats.staleStubs}</Text> 个映射从未命中过请求
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          可能是配置有误，或已过期的旧桩
                        </Text>
                      </div>
                    </div>
                    <Button size="small" icon={<DeleteOutlined />} onClick={handleClearStaleStubs}>
                      清理
                    </Button>
                  </div>
                )}

                {stats.unmatchedCount > 0 && (
                  <div className="attention-row">
                    <div>
                      <Text strong>{stats.unmatchedCount}</Text> 个请求没有命中任何映射
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          Top 未匹配：
                          {stats.topUnmatchedUrls.length > 0
                            ? stats.topUnmatchedUrls.map((item) => item.key).join('、')
                            : '—'}
                        </Text>
                      </div>
                    </div>
                    <Button size="small" icon={<AimOutlined />} onClick={() => navigate('/near-misses')}>
                      去排查
                    </Button>
                  </div>
                )}

                {stats.nonStartedCount > 0 && (
                  <div className="attention-row">
                    <div>
                      <Text strong>{stats.nonStartedCount}</Text> 个场景已离开初始状态
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          状态机仍在流转，必要时可重置
                        </Text>
                      </div>
                    </div>
                    <Button size="small" onClick={() => navigate('/scenarios')}>
                      查看
                    </Button>
                  </div>
                )}
              </Space>
            )}
          </Card>

          <Card
            title="最近请求"
            className="content-card"
            extra={
              <Button type="link" size="small" onClick={() => navigate('/requests')}>
                查看全部
              </Button>
            }
            loading={loading}
          >
            <Table
              size="small"
              rowKey="id"
              columns={recentColumns}
              dataSource={data.requests.slice(0, 8)}
              pagination={false}
              locale={{ emptyText: '还没有请求记录' }}
              onRow={(record) => ({
                onClick: () => navigate('/requests', { state: { focusRequestId: record.id } }),
                style: { cursor: 'pointer' },
              })}
            />
          </Card>

          <Card
            title="请求分布"
            className="content-card"
            loading={loading}
            extra={
              <Tooltip title="基于最近拉取的请求日志样本">
                <Text type="secondary" style={{ fontSize: 12 }}>
                  样本 {stats.sampleSize} 条
                </Text>
              </Tooltip>
            }
          >
            <div className="dist-section">
              <Text strong>按方法</Text>
              {Object.keys(METHOD_COLORS).map((method) => (
                <DistBar
                  key={method}
                  label={method}
                  value={stats.methodCounts[method] || 0}
                  total={stats.sampleSize}
                  color={METHOD_COLORS[method]}
                />
              ))}
            </div>
            <div className="dist-section">
              <Text strong>按状态码</Text>
              {Object.keys(STATUS_COLORS).map((bucket) => (
                <DistBar
                  key={bucket}
                  label={bucket}
                  value={stats.statusCounts[bucket] || 0}
                  total={stats.sampleSize}
                  color={STATUS_COLORS[bucket]}
                />
              ))}
            </div>
          </Card>

          <Card title="Top 命中映射" className="content-card" loading={loading}>
            {stats.topStubs.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无命中记录" />
            ) : (
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {stats.topStubs.map((stub) => (
                  <div key={stub.id} className="top-stub">
                    <Text ellipsis style={{ maxWidth: '60%' }}>
                      {stub.name}
                    </Text>
                    <Progress
                      percent={Math.round((stub.count / stats.topStubs[0].count) * 100)}
                      showInfo={false}
                      size="small"
                      style={{ width: 120 }}
                    />
                    <Text strong>{stub.count}</Text>
                  </div>
                ))}
              </Space>
            )}
          </Card>

          <Card title="快捷操作" className="content-card">
            <Space wrap>
              <Button icon={<ApiOutlined />} onClick={() => navigate('/stub-mappings')}>
                映射管理
              </Button>
              <Button icon={<HistoryOutlined />} onClick={() => navigate('/requests')}>
                请求记录
              </Button>
              <Button icon={<AimOutlined />} onClick={() => navigate('/near-misses')}>
                Near-Miss 调试
              </Button>
              <Button icon={<PlayCircleOutlined />} onClick={() => navigate('/recording')}>
                录制回放
              </Button>
              <Button icon={<FolderOpenOutlined />} onClick={() => navigate('/files')}>
                文件管理
              </Button>
              <Button
                icon={<LinkOutlined />}
                href={`${mockServiceUrl}/__admin/mappings`}
                target="_blank"
              >
                原始 Admin API
              </Button>
            </Space>
            <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0, fontSize: 12 }}>
              数据来自 Admin API 的实时聚合；「请求分布」与「Top 命中映射」基于最近{' '}
              {RECENT_REQUEST_LIMIT} 条请求日志。
            </Paragraph>
          </Card>
      </div>
    </div>
  );
};

export default Dashboard;
