import React from 'react';
import { Table, Tag, Typography, Progress, Space } from 'antd';
import Editor from '@monaco-editor/react';

const { Text } = Typography;

const summarizePattern = (pattern) => {
  if (!pattern) return '-';
  const url = pattern.url || pattern.urlPattern || pattern.urlPath || pattern.urlPathTemplate || pattern.urlPathPattern || '-';
  return `${pattern.method || 'ANY'} ${url}`;
};

const columns = [
  {
    title: '相似度',
    key: 'distance',
    width: 160,
    render: (_, record) => {
      const distance = record.matchResult?.distance;
      if (typeof distance !== 'number') return '-';
      const similarity = Math.max(0, Math.min(1, 1 - distance));
      return (
        <Space direction="vertical" size={0} style={{ width: '100%' }}>
          <Progress percent={Math.round(similarity * 100)} size="small" status="active" />
          <Text type="secondary" style={{ fontSize: 12 }}>
            distance={distance.toFixed(4)}
          </Text>
        </Space>
      );
    },
  },
  {
    title: '实际请求',
    key: 'request',
    render: (_, record) => {
      const request = record.request || {};
      return (
        <Space direction="vertical" size={0}>
          <Text code>
            {request.method || 'ANY'} {request.url || request.absoluteUrl || '-'}
          </Text>
          {request.headers && (
            <Text type="secondary" style={{ fontSize: 12 }}>
              {Object.keys(request.headers).length} 个请求头
            </Text>
          )}
        </Space>
      );
    },
  },
  {
    title: '最接近的映射',
    key: 'pattern',
    render: (_, record) => <Text code>{summarizePattern(record.requestPattern)}</Text>,
  },
  {
    title: '差距点',
    key: 'diff',
    render: (_, record) => {
      const diffs = record.matchResult?.diffs || [];
      return diffs.length > 0 ? <Tag color="orange">{diffs.length} 处差异</Tag> : <Tag>无明细</Tag>;
    },
  },
];

const expandedRowRender = (record) => (
  <div style={{ display: 'flex', gap: 16 }}>
    <div style={{ flex: 1 }}>
      <Text strong>实际请求</Text>
      <Editor
        height="180px"
        language="json"
        value={JSON.stringify(record.request || {}, null, 2)}
        options={{ readOnly: true, minimap: { enabled: false }, scrollBeyondLastLine: false }}
      />
    </div>
    <div style={{ flex: 1 }}>
      <Text strong>映射模式 / 匹配结果</Text>
      <Editor
        height="180px"
        language="json"
        value={JSON.stringify(
          { requestPattern: record.requestPattern, matchResult: record.matchResult },
          null,
          2
        )}
        options={{ readOnly: true, minimap: { enabled: false }, scrollBeyondLastLine: false }}
      />
    </div>
  </div>
);

const NearMissTable = ({ nearMisses, loading, emptyText }) => (
  <Table
    rowKey={(record) =>
      [
        record.request?.method,
        record.request?.url,
        record.requestPattern?.url ||
          record.requestPattern?.urlPath ||
          record.requestPattern?.urlPattern ||
          record.requestPattern?.urlPathTemplate ||
          record.requestPattern?.urlPathPattern,
        record.matchResult?.distance,
      ]
        .filter(Boolean)
        .join('|') || 'near-miss'
    }
    columns={columns}
    dataSource={nearMisses}
    loading={loading}
    pagination={false}
    size="small"
    expandable={{ expandedRowRender }}
    locale={{ emptyText: emptyText || '没有近似结果' }}
  />
);

export default NearMissTable;
