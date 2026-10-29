import React, { useEffect, useRef } from 'react';
import { Tag, Typography, Empty, Spin, Tooltip, Button, Input, Select, Space } from 'antd';
import {
  CopyOutlined,
  DeleteOutlined,
  ApiOutlined,
  PlusOutlined,
  SearchOutlined,
  ExportOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

export const ALL_GROUPS = '__all__';
export const NO_GROUP = '__none__';

const METHOD_COLORS = {
  GET: 'blue',
  POST: 'green',
  PUT: 'orange',
  DELETE: 'red',
  PATCH: 'purple',
  HEAD: 'cyan',
  OPTIONS: 'magenta',
};

const getUrl = (record) => {
  const request = record.request || {};
  return (
    request.url ||
    request.urlPattern ||
    request.urlPath ||
    request.urlPathTemplate ||
    request.urlPathPattern ||
    '(未配置 URL)'
  );
};

const matchKind = (record) => {
  const request = record.request || {};
  if (request.urlPathTemplate) return '模板';
  if (request.urlPattern || request.urlPathPattern) return '正则';
  return null;
};

const statusColor = (status) => {
  if (!status) return 'default';
  if (status < 300) return 'green';
  if (status < 400) return 'blue';
  if (status < 500) return 'orange';
  return 'red';
};

const MappingList = ({
  records,
  total,
  selectedId,
  loading,
  searchText,
  onSearch,
  onCreate,
  onSelect,
  onDuplicate,
  onDelete,
  groups = [],
  groupFilter = ALL_GROUPS,
  ungroupedTotal = 0,
  onGroupFilterChange,
  onExportGroup,
  onDeleteGroup,
}) => {
  const isRealGroup = groupFilter !== ALL_GROUPS && groupFilter !== NO_GROUP;
  const listRef = useRef(null);

  // 保存/选中后把对应项滚到可视区，长列表里不至于迷路
  useEffect(() => {
    if (!selectedId) return;
    const item = listRef.current?.querySelector(`[data-mapping-id="${selectedId}"]`);
    item?.scrollIntoView({ block: 'nearest' });
  }, [selectedId, records]);

  return (
    <aside className="mapping-list-pane">
      <div className="mapping-list-pane__header">
        <Button type="primary" icon={<PlusOutlined />} block onClick={onCreate}>
          新建映射
        </Button>

        <div style={{ marginTop: 8 }}>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="搜索名称 / URL / 备注"
            value={searchText}
            onChange={(event) => onSearch(event.target.value)}
          />
        </div>

        <Select
          style={{ width: '100%', marginTop: 8 }}
          value={groupFilter}
          onChange={onGroupFilterChange}
          options={[
            { value: ALL_GROUPS, label: `全部分组（${total}）` },
            { value: NO_GROUP, label: `未分组（${ungroupedTotal}）` },
            ...groups.map((group) => ({ value: group, label: group })),
          ]}
        />

        <div className="mapping-list-count">
          共 {total} 个映射{searchText ? `，匹配 ${records.length} 个` : ''}
          {isRealGroup && (
            <Space size={0} style={{ marginLeft: 6 }}>
              <Tooltip title="导出该分组的映射">
                <Button
                  type="link"
                  size="small"
                  icon={<ExportOutlined />}
                  style={{ padding: '0 4px', height: 20 }}
                  onClick={() => onExportGroup?.(groupFilter)}
                >
                  导出本组
                </Button>
              </Tooltip>
              <Button
                type="link"
                size="small"
                danger
                style={{ padding: '0 4px', height: 20 }}
                onClick={() => onDeleteGroup?.(groupFilter)}
              >
                删除本组
              </Button>
            </Space>
          )}
        </div>
      </div>

      <div className="mapping-list" ref={listRef}>
        {loading && records.length === 0 && (
          <div className="loading-spinner">
            <Spin />
          </div>
        )}

        {!loading && records.length === 0 && (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={searchText || isRealGroup ? '没有匹配的映射' : '还没有映射'}
            style={{ marginTop: 40 }}
          />
        )}

        {records.map((record) => {
          const url = getUrl(record);
          const description = record.metadata?.wmui?.description;
          const group = record.metadata?.wmui?.group;
          return (
            <div
              key={record.id}
              data-mapping-id={record.id}
              role="button"
              tabIndex={0}
              className={`mapping-item${selectedId === record.id ? ' mapping-item--active' : ''}`}
              onClick={() => onSelect(record)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onSelect(record);
                }
              }}
            >
              <div className="mapping-item__top">
                <Tag
                  color={METHOD_COLORS[record.request?.method] || 'default'}
                  className="mapping-item__method"
                >
                  {record.request?.method || 'ANY'}
                </Tag>
                <span className="mapping-item__url" title={url}>
                  {url}
                </span>
                <Tag color={statusColor(record.response?.status)} className="mapping-item__status">
                  {record.response?.status ?? '-'}
                </Tag>
              </div>

              <div className="mapping-item__sub">
                {record.name || description || <Text type="secondary">未命名</Text>}
                {group && (
                  <Tag bordered={false} color="gold" style={{ marginLeft: 6 }}>
                    {group}
                  </Tag>
                )}
                {matchKind(record) && (
                  <Tag bordered={false} color="geekblue" style={{ marginLeft: 6 }}>
                    {matchKind(record)}
                  </Tag>
                )}
                {record.scenarioName && (
                  <Tag bordered={false} color="purple" style={{ marginLeft: 6 }}>
                    {record.scenarioName}
                  </Tag>
                )}
                {record.postServeActions && (
                  <Tag bordered={false} color="cyan" style={{ marginLeft: 6 }}>
                    webhook
                  </Tag>
                )}
              </div>

              <div className="mapping-item__actions">
                <Tooltip title="复制">
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDuplicate(record);
                    }}
                  />
                </Tooltip>
                <Tooltip title="删除">
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(record);
                    }}
                  />
                </Tooltip>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mapping-list-pane__footer">
        <ApiOutlined /> 点击列表项即可在右侧编辑，无需打开弹窗
      </div>
    </aside>
  );
};

export default MappingList;
