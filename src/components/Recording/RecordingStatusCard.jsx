import React from 'react';
import { Card, Button, Tag, Typography } from 'antd';
import { StopOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

// GET /__admin/recordings/status 只返回 { status: 'NeverStarted' | 'Recording' | 'Stopped' }
const STATUS_LABELS = {
  NeverStarted: { text: '从未开始', color: 'default' },
  Recording: { text: '正在录制', color: 'red' },
  Stopped: { text: '已停止', color: 'default' },
};

const RecordingStatusCard = ({ status, isRecording, onStopRecording, loading }) => {
  const label = STATUS_LABELS[status] || { text: status || '未知', color: 'default' };

  return (
    <Card className="content-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>
            录制状态
          </Title>
          <div style={{ marginTop: 8 }}>
            <Tag color={label.color} style={{ fontSize: '14px' }}>
              {label.text}
            </Tag>
            <Text type="secondary" style={{ marginLeft: 16 }}>
              状态值: {status || '未知'}
            </Text>
          </div>
        </div>
        {isRecording && (
          <Button danger icon={<StopOutlined />} onClick={onStopRecording} loading={loading}>
            停止录制
          </Button>
        )}
      </div>
    </Card>
  );
};

export default RecordingStatusCard;
