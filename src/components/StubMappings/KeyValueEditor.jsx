import React, { useEffect, useRef, useState } from 'react';
import { Row, Col, Input, Button, Select, Tooltip } from 'antd';
import { MinusCircleOutlined, PlusOutlined } from '@ant-design/icons';

const PREDICATE_OPTIONS = [
  { value: 'equalTo', label: 'equalTo' },
  { value: 'contains', label: 'contains' },
  { value: 'doesNotContain', label: 'doesNotContain' },
  { value: 'matches', label: 'matches（正则）' },
  { value: 'doesNotMatch', label: 'doesNotMatch' },
  { value: 'matchesJsonPath', label: 'matchesJsonPath' },
  { value: 'matchesXPath', label: 'matchesXPath' },
  { value: 'equalToJson', label: 'equalToJson' },
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

const toObject = (rows) => {
  const result = {};
  rows.forEach((row) => {
    const key = row.key?.trim();
    if (!key) return;
    if (row.mode === 'predicate') {
      result[key] = row.predicate === 'absent' ? { absent: true } : { [row.predicate]: row.value ?? '' };
    } else {
      result[key] = row.value ?? '';
    }
  });
  return result;
};

const KeyValueEditor = ({ value, onChange, placeholder, allowPredicate = false }) => {
  const [rows, setRows] = useState(() => toRows(value));
  const lastEmitted = useRef(null);

  useEffect(() => {
    const incoming = JSON.stringify(isPlainObject(value) ? value : {});
    if (incoming === lastEmitted.current) return;
    setRows(toRows(value));
  }, [value]);

  const commit = (nextRows) => {
    setRows(nextRows);
    const obj = toObject(nextRows);
    lastEmitted.current = JSON.stringify(obj);
    onChange?.(obj);
  };

  const updateRow = (id, patch) =>
    commit(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));

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
    </div>
  );
};

export default KeyValueEditor;
