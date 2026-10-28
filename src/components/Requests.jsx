import React, { useState, useEffect } from 'react';
import {
  Table,
  Button,
  Space,
  Typography,
  Input,
  Card,
  Drawer,
  Select,
  Switch,
  notification,
  Popconfirm,
} from 'antd';
import { ReloadOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import { requestsApi } from '../services/wiremockApi';
import { showApiError } from '../services/wiremockErrors';
import { createColumns } from './Requests/tableColumns.jsx';
import { filterRequests } from './Requests/filterUtils';
import RequestDetail from './Requests/RequestDetail';

const { Title, Text } = Typography;
const { Search } = Input;

const Requests = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [requests, setRequests] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [methodFilter, setMethodFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [onlyUnmatched, setOnlyUnmatched] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const response = await requestsApi.getAll();
      const list = Array.isArray(response.data?.requests) ? response.data.requests : [];
      setRequests(list);
      setTotal(response.data?.meta?.total ?? list.length);
    } catch (error) {
      showApiError(error, '获取请求记录失败');
      setRequests([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // 从仪表板的「最近请求」跳转过来时，自动打开对应详情
  const focusId = location.state?.focusRequestId;
  useEffect(() => {
    if (!focusId || requests.length === 0) return;
    const record = requests.find((item) => item.id === focusId);
    if (!record) return;
    setSelectedRequest(record);
    setDrawerVisible(true);
    navigate(location.pathname, { replace: true, state: {} });
  }, [focusId, requests, navigate, location.pathname]);

  const handleView = (record) => {
    setSelectedRequest(record);
    setDrawerVisible(true);
  };

  const handleClearAll = async () => {
    try {
      await requestsApi.removeAll();
      notification.success({ message: '清空成功', description: '所有请求记录已被删除' });
      fetchRequests();
    } catch (error) {
      showApiError(error, '清空失败');
    }
  };

  const columns = createColumns(handleView);
  const filteredRequests = filterRequests(
    requests,
    searchText,
    methodFilter,
    statusFilter,
    onlyUnmatched
  );

  return (
    <div className="fade-in page-stack">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              请求记录
            </Title>
            <Text type="secondary">查看和分析所有传入的 HTTP 请求</Text>
          </div>
        </div>
      </div>

      <div className="toolbar">
        <Space>
          <Search
            placeholder="搜索请求..."
            allowClear
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: 280 }}
            prefix={<SearchOutlined />}
          />
          <Select
            placeholder="方法"
            allowClear
            value={methodFilter || undefined}
            onChange={(value) => setMethodFilter(value || '')}
            style={{ width: 120 }}
            options={['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].map((m) => ({
              value: m,
              label: m,
            }))}
          />
          <Select
            placeholder="状态码"
            allowClear
            value={statusFilter || undefined}
            onChange={(value) => setStatusFilter(value || '')}
            style={{ width: 120 }}
            options={['2xx', '3xx', '4xx', '5xx'].map((value) => ({ value, label: value }))}
          />
          <Space size={4}>
            <Switch size="small" checked={onlyUnmatched} onChange={setOnlyUnmatched} />
            <Text type="secondary">仅未匹配</Text>
          </Space>
        </Space>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={fetchRequests} loading={loading}>
            刷新
          </Button>
          <Popconfirm
            title="确定要清空所有请求记录吗？此操作不可恢复！"
            onConfirm={handleClearAll}
            okText="确定"
            cancelText="取消"
          >
            <Button danger icon={<DeleteOutlined />}>
              清空记录
            </Button>
          </Popconfirm>
        </Space>
      </div>

      <Card className="content-card">
        <Table
          columns={columns}
          dataSource={filteredRequests}
          rowKey={(record) => record.id}
          loading={loading}
          pagination={{
            total: filteredRequests.length,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (count) => `共 ${count} 条记录（服务端 total=${total}）`,
          }}
        />
      </Card>

      <Drawer
        title="请求详情"
        placement="right"
        width={860}
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
      >
        <RequestDetail request={selectedRequest} />
      </Drawer>
    </div>
  );
};

export default Requests;
