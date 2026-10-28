import React from 'react';
import { Space, Card, Table, Typography, Descriptions } from 'antd';
import Editor from '@monaco-editor/react';
import { formatJson, parseHeaders, getTableColumns } from '../requestUtils';

const { Text } = Typography;

const ResponseDetailsSection = ({ request }) => {
  const response = request.response;
  const definition = request.responseDefinition;
  const body = response?.body ?? definition?.body;
  const headers = response?.headers ?? definition?.headers;

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Card title="响应定义" size="small">
        <Descriptions column={3} size="small">
          <Descriptions.Item label="状态码">
            {response?.status ?? definition?.status ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="来源">
            {definition?.fromConfiguredStub === false ? '默认未匹配响应' : '映射响应'}
          </Descriptions.Item>
          <Descriptions.Item label="fault">{definition?.fault || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      {headers && Object.keys(headers).length > 0 && (
        <Card title="响应头" size="small">
          <Table
            dataSource={parseHeaders(headers)}
            columns={getTableColumns()}
            pagination={false}
            size="small"
          />
        </Card>
      )}

      <Card title="响应体" size="small">
        {body ? (
          <Editor
            height="320px"
            language="json"
            value={formatJson(body)}
            options={{ readOnly: true, minimap: { enabled: false }, scrollBeyondLastLine: false }}
          />
        ) : (
          <Text type="secondary">（空）</Text>
        )}
      </Card>
    </Space>
  );
};

export default ResponseDetailsSection;
