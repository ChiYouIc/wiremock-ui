import React from 'react';
import { Space, Card, Table, Typography } from 'antd';
import Editor from '@monaco-editor/react';
import { formatJson, parseHeaders, parseQueryParams, getTableColumns, getParamTableColumns } from '../requestUtils';

const { Text } = Typography;

const RequestDetailsSection = ({ request }) => {
  const logged = request.request || {};
  const queryParams = logged.queryParams;

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      {queryParams && Object.keys(queryParams).length > 0 && (
        <Card title="查询参数" size="small">
          <Table
            dataSource={parseQueryParams(queryParams)}
            columns={getParamTableColumns()}
            pagination={false}
            size="small"
          />
        </Card>
      )}

      {logged.headers && Object.keys(logged.headers).length > 0 && (
        <Card title="请求头" size="small">
          <Table
            dataSource={parseHeaders(logged.headers)}
            columns={getTableColumns()}
            pagination={false}
            size="small"
          />
        </Card>
      )}

      {logged.cookies && Object.keys(logged.cookies).length > 0 && (
        <Card title="Cookie" size="small">
          <Table
            dataSource={parseHeaders(logged.cookies)}
            columns={getTableColumns()}
            pagination={false}
            size="small"
          />
        </Card>
      )}

      <Card title="请求体" size="small">
        {logged.body ? (
          <Editor
            height="200px"
            language="json"
            value={formatJson(logged.body)}
            options={{ readOnly: true, minimap: { enabled: false }, scrollBeyondLastLine: false }}
          />
        ) : (
          <Text type="secondary">（空）</Text>
        )}
      </Card>
    </Space>
  );
};

export default RequestDetailsSection;
