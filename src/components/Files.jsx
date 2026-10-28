import React, { useEffect, useState } from 'react';
import {
  Card,
  Button,
  Space,
  Typography,
  Table,
  Input,
  Upload,
  Modal,
  notification,
  Popconfirm,
} from 'antd';
import { UploadOutlined, ReloadOutlined, DeleteOutlined, EditOutlined, DownloadOutlined, PlusOutlined } from '@ant-design/icons';
import Editor from '@monaco-editor/react';
import { filesApi } from '../services/wiremockApi';
import { showApiError } from '../services/wiremockErrors';

const { Title, Text } = Typography;

const Files = () => {
  const [fileNames, setFileNames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(null);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editorContent, setEditorContent] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const response = await filesApi.list();
      setFileNames(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      showApiError(error, '获取文件列表失败');
      setFileNames([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const openEditor = async (name) => {
    try {
      const response = await filesApi.get(name);
      setEditing(name);
      setEditorContent(typeof response.data === 'string' ? response.data : JSON.stringify(response.data, null, 2));
      setEditorVisible(true);
    } catch (error) {
      showApiError(error, '读取文件失败');
    }
  };

  const handleSaveFile = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      await filesApi.put(editing, editorContent);
      notification.success({ message: '保存成功', description: editing });
      setEditorVisible(false);
      fetchFiles();
    } catch (error) {
      showApiError(error, '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (name) => {
    try {
      await filesApi.remove(name);
      notification.success({ message: '已删除', description: name });
      fetchFiles();
    } catch (error) {
      showApiError(error, '删除失败');
    }
  };

  // 下载走浏览器直链，保证二进制文件不被文本化
  const downloadUrl = (name) => `/__admin/files/${encodeURIComponent(name)}`;

  const handleUpload = (file) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        await filesApi.put(file.name, event.target.result);
        notification.success({ message: '上传成功', description: file.name });
        fetchFiles();
      } catch (error) {
        showApiError(error, '上传失败');
      }
    };
    reader.readAsText(file);
    return false;
  };

  const handleCreate = () => {
    const name = window.prompt('新文件名（相对 __files 目录）', 'payloads/new-file.json');
    if (!name) return;
    setEditing(name);
    setEditorContent('');
    setEditorVisible(true);
  };

  const columns = [
    {
      title: '文件名',
      dataIndex: 'name',
      key: 'name',
      render: (name) => <Text code>{name}</Text>,
    },
    {
      title: '操作',
      key: 'actions',
      width: 260,
      render: (_, record) => (
        <Space>
          <Button type="text" icon={<EditOutlined />} onClick={() => openEditor(record.name)}>
            编辑
          </Button>
          <Button type="link" icon={<DownloadOutlined />} href={downloadUrl(record.name)} target="_blank">
            下载
          </Button>
          <Popconfirm title={`删除 ${record.name}？`} onConfirm={() => handleDelete(record.name)}>
            <Button type="text" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div className="fade-in page-stack">
      <div className="page-header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>
              文件管理
            </Title>
            <Text type="secondary">
              维护 __files 目录，供映射的 bodyFileName 引用
            </Text>
          </div>
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchFiles} loading={loading}>
              刷新
            </Button>
            <Button icon={<PlusOutlined />} onClick={handleCreate}>
              新建文件
            </Button>
            <Upload showUploadList={false} beforeUpload={handleUpload}>
              <Button icon={<UploadOutlined />}>上传</Button>
            </Upload>
          </Space>
        </div>
      </div>

      <Card className="content-card">
        <Table
          columns={columns}
          dataSource={fileNames.map((name) => ({ name }))}
          rowKey="name"
          loading={loading}
          pagination={false}
          locale={{ emptyText: '当前没有文件' }}
        />
      </Card>

      <Modal
        title={`编辑：${editing || ''}`}
        open={editorVisible}
        onCancel={() => setEditorVisible(false)}
        onOk={handleSaveFile}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
        width={900}
      >
        <Editor
          height="420px"
          language={editing?.endsWith('.json') ? 'json' : 'plaintext'}
          value={editorContent}
          onChange={(value) => setEditorContent(value ?? '')}
          options={{ minimap: { enabled: false } }}
        />
      </Modal>
    </div>
  );
};

export default Files;
