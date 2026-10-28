import React from 'react';
import { Button, Tag, Typography } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { getLoggedDate, getResponseStatus, isMatched } from './requestUtils';

const { Text } = Typography;

const getMethodTag = (method) => {
  const colors = {
    GET: 'blue',
    POST: 'green',
    PUT: 'orange',
    DELETE: 'red',
    PATCH: 'purple',
    HEAD: 'cyan',
    OPTIONS: 'magenta',
  };
  return <Tag color={colors[method] || 'default'}>{method}</Tag>;
};

const getStatusTag = (status) => {
  if (!status) return <Tag>未响应</Tag>;
  let color = 'default';
  if (status >= 200 && status < 300) color = 'green';
  else if (status >= 300 && status < 400) color = 'blue';
  else if (status >= 400 && status < 500) color = 'orange';
  else if (status >= 500) color = 'red';
  return <Tag color={color}>{status}</Tag>;
};

export const createColumns = (handleView) => [
  {
    title: '时间',
    key: 'time',
    width: 180,
    render: (_, record) => {
      const value = getLoggedDate(record);
      if (!value) return '-';
      return typeof value === 'number'
        ? dayjs(value).format('YYYY-MM-DD HH:mm:ss')
        : dayjs(value).format('YYYY-MM-DD HH:mm:ss');
    },
    sorter: (a, b) => {
      const timeA = getLoggedDate(a);
      const timeB = getLoggedDate(b);
      if (!timeA && !timeB) return 0;
      if (!timeA) return 1;
      if (!timeB) return -1;
      return new Date(timeB) - new Date(timeA);
    },
    defaultSortOrder: 'descend',
  },
  {
    title: '方法',
    dataIndex: ['request', 'method'],
    key: 'method',
    width: 80,
    render: (method) => getMethodTag(method),
  },
  {
    title: 'URL',
    key: 'url',
    render: (_, record) => (
      <Text code>{record.request?.url || record.request?.absoluteUrl || '-'}</Text>
    ),
  },
  {
    title: '状态码',
    key: 'status',
    width: 90,
    render: (_, record) => getStatusTag(getResponseStatus(record)),
  },
  {
    title: '匹配状态',
    key: 'matched',
    width: 110,
    render: (_, record) => {
      const matched = isMatched(record);
      return (
        <Tag color={matched ? 'green' : 'red'}>{matched ? '已匹配' : '未匹配'}</Tag>
      );
    },
  },
  {
    title: '操作',
    key: 'actions',
    width: 90,
    render: (_, record) => (
      <Button type="text" icon={<EyeOutlined />} onClick={() => handleView(record)} title="查看详情" />
    ),
  },
];
