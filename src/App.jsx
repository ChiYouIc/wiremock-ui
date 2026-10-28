import React, { Suspense, lazy, useEffect, useRef, useState } from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { Layout, Menu, Typography, notification, Spin, Dropdown, Button, Tag } from 'antd';
import {
  ApiOutlined,
  HistoryOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  DashboardOutlined,
  FileTextOutlined,
  FolderOpenOutlined,
  AimOutlined,
  DownOutlined,
  SwapOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import { detectCapabilities } from './services/capabilities';
import {
  loadTargets,
  getActiveTarget,
  getActiveTargetId,
  setActiveTargetId,
  saveTargets,
} from './services/targets';
import { applyTarget } from './services/wiremockApi';
import TargetsModal from './components/TargetsModal';

const Dashboard = lazy(() => import('./components/Dashboard'));
const StubMappings = lazy(() => import('./components/StubMappings'));
const Requests = lazy(() => import('./components/Requests'));
const Scenarios = lazy(() => import('./components/Scenarios'));
const Recording = lazy(() => import('./components/Recording'));
const Settings = lazy(() => import('./components/Settings'));
const Files = lazy(() => import('./components/Files'));
const NearMisses = lazy(() => import('./components/NearMisses'));

const { Header, Sider, Content } = Layout;
const { Title } = Typography;

const MENU_ITEMS = [
  { key: 'dashboard', icon: <DashboardOutlined />, label: '仪表板', path: '/dashboard' },
  { key: 'stub-mappings', icon: <ApiOutlined />, label: 'Stub 映射', path: '/stub-mappings' },
  { key: 'requests', icon: <HistoryOutlined />, label: '请求记录', path: '/requests' },
  { key: 'near-misses', icon: <AimOutlined />, label: 'Near-Miss 调试', path: '/near-misses' },
  { key: 'scenarios', icon: <FileTextOutlined />, label: '场景管理', path: '/scenarios' },
  { key: 'recording', icon: <PlayCircleOutlined />, label: '录制回放', path: '/recording' },
  { key: 'files', icon: <FolderOpenOutlined />, label: '文件管理', path: '/files' },
  { key: 'settings', icon: <SettingOutlined />, label: '系统设置', path: '/settings' },
];

const getSelectedKey = (pathname) =>
  MENU_ITEMS.find((item) => pathname.startsWith(item.path))?.key || 'dashboard';

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [capabilities, setCapabilities] = useState(null);
  const [loading, setLoading] = useState(true);
  const [targets, setTargets] = useState(() => loadTargets());
  const [activeTargetId, setActiveTargetIdState] = useState(() => getActiveTargetId());
  const [targetsOpen, setTargetsOpen] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const initRef = useRef(false);

  const activeTarget = targets.find((item) => item.id === activeTargetId) || targets[0];

  const checkConnection = async (silent = false) => {
    const caps = await detectCapabilities();
    setCapabilities(caps);
    setLoading(false);

    if (silent) return;

    if (caps.reachable) {
      notification.success({
        message: '连接成功',
        description: `WireMock ${caps.version || ''} 已连接`,
        duration: 2,
      });
    } else {
      notification.error({
        message: '连接失败',
        description: '无法连接到 WireMock 服务，请确认服务已在 8080 端口启动',
        duration: 4,
      });
    }
  };

  useEffect(() => {
    // StrictMode 下 effect 会执行两次，避免重复弹出连接结果
    if (initRef.current) return;
    initRef.current = true;

    // 先应用已保存的实例地址，再做能力探测
    applyTarget(getActiveTarget());
    checkConnection();
    const interval = setInterval(() => checkConnection(true), 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSwitchTarget = async (id) => {
    const target = targets.find((item) => item.id === id);
    if (!target || id === activeTargetId) return;
    setActiveTargetId(target.id);
    setActiveTargetIdState(target.id);
    applyTarget(target);
    // 让各页面重新挂载并按新实例拉取数据
    setSessionKey((key) => key + 1);
    await checkConnection(false);
  };

  const handleSaveTargets = (list) => {
    const saved = saveTargets(list);
    setTargets(saved);
    setTargetsOpen(false);

    if (!saved.some((item) => item.id === activeTargetId)) {
      const fallback = saved[0];
      setActiveTargetId(fallback.id);
      setActiveTargetIdState(fallback.id);
      applyTarget(fallback);
      setSessionKey((key) => key + 1);
      checkConnection(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <Spin size="large" />
        <div style={{ marginTop: 12, color: '#666' }}>正在连接 WireMock 服务...</div>
      </div>
    );
  }

  const reachable = Boolean(capabilities?.reachable);

  return (
    <Layout>
      <Header
        style={{
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ApiOutlined style={{ fontSize: '24px', color: '#fff', marginRight: '12px' }} />
          <Title level={3} style={{ color: '#fff', margin: 0 }}>
            WireMock UI
          </Title>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                ...targets.map((item) => ({
                  key: item.id,
                  icon: item.id === activeTargetId ? <CheckOutlined /> : <span style={{ width: 14, display: 'inline-block' }} />,
                  label: item.baseUrl ? `${item.name} · ${item.baseUrl}` : `${item.name} · 同源代理`,
                })),
                { type: 'divider' },
                { key: '__manage', icon: <SettingOutlined />, label: '管理实例…' },
              ],
              onClick: ({ key }) => {
                if (key === '__manage') {
                  setTargetsOpen(true);
                  return;
                }
                handleSwitchTarget(key);
              },
            }}
          >
            <Button
              ghost
              icon={<SwapOutlined />}
              style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.45)' }}
            >
              {activeTarget?.name}
              <DownOutlined style={{ fontSize: 10 }} />
            </Button>
          </Dropdown>

          <div className="header-status">
            <span
              className={`status-dot status-dot--${reachable ? 'success' : 'error'}`}
              title={reachable ? 'WireMock 服务可达' : 'WireMock 服务不可达'}
            />
            <span className="header-status__version">
              {capabilities?.version ? `v${capabilities.version}` : 'WireMock'}
            </span>
            <span className="header-status__sep">·</span>
            <span className="header-status__text">{reachable ? '已连接' : '未连接'}</span>
          </div>
        </div>
      </Header>

      <Layout>
        <Sider collapsible collapsed={collapsed} onCollapse={setCollapsed} width={230} theme="light">
          <Menu
            mode="inline"
            selectedKeys={[getSelectedKey(location.pathname)]}
            items={MENU_ITEMS.map(({ key, icon, label }) => ({ key, icon, label }))}
            style={{ height: '100%', borderRight: 0 }}
            onClick={({ key }) => {
              const target = MENU_ITEMS.find((item) => item.key === key);
              if (target) navigate(target.path);
            }}
          />
        </Sider>

        <Layout>
          <Content>
            <Suspense
              fallback={
                <div className="loading-spinner">
                  <Spin />
                </div>
              }
            >
              <Routes key={`${activeTargetId}:${sessionKey}`}>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route
                  path="/dashboard"
                  element={<Dashboard capabilities={capabilities} />}
                />
                <Route path="/stub-mappings" element={<StubMappings />} />
                <Route path="/requests" element={<Requests />} />
                <Route path="/near-misses" element={<NearMisses />} />
                <Route path="/scenarios" element={<Scenarios />} />
                <Route path="/recording" element={<Recording />} />
                <Route path="/files" element={<Files />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </Suspense>
          </Content>
        </Layout>
      </Layout>

      <TargetsModal
        open={targetsOpen}
        targets={targets}
        activeId={activeTargetId}
        onClose={() => setTargetsOpen(false)}
        onSave={handleSaveTargets}
        onActivate={handleSwitchTarget}
      />
    </Layout>
  );
}

function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AppContent />
    </Router>
  );
}

export default App;
