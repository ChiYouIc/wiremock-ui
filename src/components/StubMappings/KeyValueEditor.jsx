import React, { useEffect, useRef, useState } from 'react';
import { Row, Col, Input, Button, Select, Tooltip } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { rowsToObject } from './mappingModel';

// 参数/请求头这类「多值断言」只支持下面这些操作；JSONPath / XPath / equalToJson 是请求体专用，
// 放到 query/header/path 参数上会被服务端拒绝，因此不在选项里。
const PREDICATE_OPTIONS = [
  { value: 'equalTo', label: 'equalTo' },
  { value: 'equalToIgnoreCase', label: 'equalToIgnoreCase' },
  { value: 'contains', label: 'contains' },
  { value: 'doesNotContain', label: 'doesNotContain' },
  { value: 'matches', label: 'matches（正则）' },
  { value: 'doesNotMatch', label: 'doesNotMatch' },
  { value: 'absent', label: 'absent' },
];

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const newRow = () => ({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}` });

const EMPTY_ROW = () => ({ ...newRow(), key: '', mode: 'text', predicate: 'equalTo', value: '' });

/**
 * 值既可以是字符串（等价于 equalTo），也可以是 content-pattern 断言对象。
 */
const toRows = (value) => {
  const entries = Object.entries(isPlainObject(value) ? value : {});
  if (entries.length === 0) {
    return [EMPTY_ROW()];
  }
  return entries.map(([key, raw]) => {
    if (isPlainObject(raw)) {
      const predicate = Object.keys(raw)[0] || 'equalTo';
      const predicateValue = raw[predicate];
      return {
        ...newRow(),
        key,
        mode: 'predicate',
        predicate,
        value: predicate === 'absent' ? '' : String(predicateValue ?? ''),
      };
    }
    return { ...newRow(), key, mode: 'text', predicate: 'equalTo', value: raw ?? '' };
  });
};

// WireMock 只接受断言对象（{"equalTo": "1"}），裸字符串会被拒：
// `"1" is not a valid match operation`，所以 pattern 模式要包成 equalTo；
// 但响应头 / webhook 头是纯字符串映射，必须保持原样。
const toObject = (rows, valueMode) => rowsToObject(rows, valueMode);

const KeyValueEditor = ({ value, onChange, placeholder, allowPredicate = false, valueMode = 'plain' }) => {
  const [rows, setRows] = useState(() => toRows(value));
  const lastEmitted = useRef(null);

  useEffect(() => {
    const incoming = JSON.stringify(isPlainObject(value) ? value : {});
    if (incoming === lastEmitted.current) return;
    setRows(toRows(value));
  }, [value]);

  const commit = (nextRows) => {
    setRows(nextRows);
    const obj = toObject(nextRows, valueMode);
    lastEmitted.current = JSON.stringify(obj);
    onChange?.(obj);
  };

  const updateRow = (id, patch) =>
    commit(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

  const hasIgnoredRow = rows.some(
    (row) => row.key?.trim() && row.mode !== 'predicate' && !row.value
  );

  return (
    <div>
      {rows.map((row) => (
        <Row key={row.id} gutter={8} style={{ marginBottom: 8 }} align="middle">
          <Col span={allowPredicate ? 8 : 10}>
            <Input
              placeholder="键"
              value={row.key}
              onChange={(e) => updateRow(row.id, { key: e.target.value })}
            />
          </Col>
          {allowPredicate && (
            <Col span={5}>
              <Select
                value={row.mode === 'predicate' ? row.predicate : 'equalTo'}
                options={PREDICATE_OPTIONS}
                style={{ width: '100%' }}
                onChange={(predicate) => updateRow(row.id, { mode: 'predicate', predicate })}
              />
            </Col>
          )}
          <Col span={allowPredicate ? 8 : 12}>
            <Input
              placeholder={
                row.mode === 'predicate' && row.predicate === 'absent' ? '（无需取值）' : '值'
              }
              value={row.value}
              disabled={row.mode === 'predicate' && row.predicate === 'absent'}
              onChange={(e) => updateRow(row.id, { value: e.target.value })}
            />
          </Col>
          <Col span={allowPredicate ? 3 : 2}>
            <Tooltip title="删除">
              <Button
                type="text"
                danger
                icon={<MinusCircleOutlined />}
                onClick={() => commit(rows.filter((item) => item.id !== row.id))}
              />
            </Tooltip>
          </Col>
        </Row>
      ))}
      <Button
        type="dashed"
        onClick={() => commit([...rows, EMPTY_ROW()])}
        block
        icon={<PlusOutlined />}
      >
        添加 {placeholder || '键值对'}
      </Button>
      {hasIgnoredRow && (
        <div style={{ color: '#d48806', fontSize: 12, marginTop: 4 }}>
          值为空的行会被忽略，不会下发到 WireMock
        </div>
      )}
    </div>
  );
};

export default KeyValueEditor;
