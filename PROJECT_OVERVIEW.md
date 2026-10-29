# WireMock UI 项目概览

## 项目简介

WireMock UI 是 WireMock 的 Web 管理界面，用 React + Ant Design 构建，把 Admin API 的常用操作图形化：stub 映射编辑、请求日志与 near-miss 排查、场景、录制、`__files` 管理、全局设置。

项目的设计前提是**契约先行**：仓库根目录的 `wiremock-admin-api.json`（WireMock 3.12.2 OpenAPI，`info.version = 3.12.2`）是全站请求形态的唯一来源，前端只发送契约允许的载荷；运行时与 WireMock 4.0.0-beta 的差异交给 `capabilities.js` 探测处理。

## 技术栈

- **语言**：JavaScript（`.js` / `.jsx`），**不使用 TypeScript**，没有 `tsconfig.json`，没有类型检查步骤
- **框架**：React 18（函数组件 + Hooks）
- **UI**：Ant Design 5、`@ant-design/icons`、`@monaco-editor/react`（JSON 编辑器）
- **路由**：React Router 6，`BrowserRouter` + 路由级 `lazy`
- **网络**：Axios
- **构建**：Vite 5（`manualChunks` 拆 `react` / `antd` / `vendor`）
- **包管理**：pnpm（`pnpm-lock.yaml`、`pnpm-workspace.yaml`）
- **测试支撑**：ajv（`pnpm test:contract` 用契约校验映射载荷）

## 架构设计

### 分层结构

```
页面组件 (src/components/*.jsx)
   │  表单模型 ⇄ 载荷转换：StubMappings/mappingModel.js
   ▼
services 层
   ├── wiremockApi.js     7 个能力分组，统一 axios 实例（baseURL=/__admin, timeout=15s）
   ├── capabilities.js    运行时能力探测（health/version/settings 信封），结果缓存于 sessionStorage
   └── wiremockErrors.js  解析 bad-request-entity，统一 notification 提示
   ▼
传输层
   ├── 开发：Vite dev server 代理 /__admin → VITE_WIREMOCK_TARGET（默认 http://localhost:8080）
   └── 生产：nginx 反向代理 /__admin/ → WIREMOCK_UPSTREAM（构建期注入）
   ▼
WireMock Admin API (/__admin/*)
```

### 数据流要点

1. 页面只调用 `wiremockApi.js` 暴露的方法，不直接建 axios 实例。
2. `capabilities.js` 在应用启动时探测一次（`GET /__admin/health` → 失败退回 `GET /__admin/version`；`GET /__admin/settings` 判断读能力与信封形态），之后每 30 秒静默重探；探测结果同时写入 `sessionStorage('wmui.capabilities')`，供设置页等组件同步读取。
3. 错误统一走 `showApiError()`：从 422 响应体的 `errors[].source.pointer` 拼成可读文案，并在 axios 拦截器里打一行 `WireMock API 错误: <method> <url> <status> <pointer>` 到控制台。
4. 表单只在提交时转换成 WireMock 载荷（`buildMappingPayload`），回读时转换成表单模型（`mapRecordToFormData`），两侧都做了旧字段兼容（如 `basicAuth` → `basicAuthCredentials`）。

## 目录结构

```
.
├── index.html                  # 入口 HTML（favicon 为内联 SVG data URI）
├── vite.config.js              # dev server 3000 端口 + /__admin 代理 + 构建分包
├── package.json                # pnpm 脚本：dev / build / preview / start / test:contract
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
├── wiremock-admin-api.json     # 契约来源：WireMock 3.12.2 OpenAPI
├── scripts/
│   └── contract-test.mjs       # ajv 契约校验 + 可选真实服务冒烟
├── Dockerfile                  # node:20-alpine 构建 → nginx:alpine 运行（80）
├── Dockerfile.simple           # node:18-alpine + vite preview（3000）
├── docker-compose.yml          # 使用 Dockerfile，3001 → 80
├── docker-compose.simple.yml   # 使用 Dockerfile.simple，3001 → 3000
├── nginx.conf                  # 静态托管 + /__admin 反代 + /health
└── src/
    ├── main.jsx                # ReactDOM 挂载
    ├── App.jsx                 # Layout / 菜单 / 路由 / 连接探测与 30s 轮询
    ├── index.css               # 全局样式（含 --page-gap / .page-stack 统一间距）
    ├── services/
    │   ├── wiremockApi.js
    │   ├── capabilities.js
    │   └── wiremockErrors.js
    └── components/
        ├── Dashboard.jsx             # 统计、连接状态、Mock 地址复制
        ├── StubMappings.jsx          # 列表 + 导入导出 + 清理未匹配映射
        │   ├── mappingModel.js       # 表单 ⇄ 载荷；校验规则
        │   ├── MappingForm.jsx       # 4 个页签
        │   ├── MappingForm/
        │   │   ├── BasicInfoTab.jsx
        │   │   ├── RequestConfigTab.jsx
        │   │   ├── ResponseConfigTab.jsx
        │   │   └── WebhookConfigTab.jsx
        │   ├── MappingDetail.jsx
        │   ├── tableColumns.jsx
        │   ├── KeyValueEditor.jsx
        │   ├── importExportUtils.js
        │   ├── useMappingHandlers.js
        │   └── hooks/                # useFormInitialization / useMappingOperations
        ├── Requests.jsx
        │   ├── filterUtils.js
        │   ├── requestUtils.js
        │   ├── tableColumns.jsx
        │   ├── RequestDetail.jsx
        │   ├── WebhookEventCard.jsx
        │   └── RequestDetail/        # Overview / RequestDetails / ResponseDetails / WebhookEvents
        ├── NearMisses.jsx
        │   └── NearMissTable.jsx
        ├── Scenarios.jsx
        ├── Recording.jsx
        │   ├── RecordingStatusCard.jsx
        │   ├── StartRecordingCard.jsx
        │   ├── SnapshotRecordingCard.jsx
        │   └── RecordingInstructions.jsx
        ├── Files.jsx
        ├── Settings.jsx
        │   └── Settings/             # Basic / Matching / Network / Advanced / Instructions
```

## 页面模块

| 页面 | 路由 | 主要能力 |
|------|------|----------|
| 仪表板 | `/dashboard` | 4 项核心指标（含匹配率）、运行状态（uptime/录制/日志开关/场景/文件）、需要关注（死桩/未匹配 Top URL/流转中场景）、最近请求、方法与状态分布、Top 命中映射、15s 自动刷新 |
| Stub 映射 | `/stub-mappings` | 左列表 + 右表单的主从编辑、实时载荷预览、Ctrl/⌘+S 保存、`metadata.wmui.group` 分组（筛选/按组导出/按组删除）、导入导出、清理未匹配映射 |
| 请求记录 | `/requests` | 列表过滤、详情分节（请求/响应/webhook 事件）、单条请求 near-miss、清空日志 |
| Near-Miss 调试 | `/near-misses` | `near-misses/request-pattern` 与 `requests/unmatched/near-misses` 两个视图 |
| 场景管理 | `/scenarios` | 场景状态浏览、**全量**重置 |
| 录制回放 | `/recording` | 开始/停止录制、快照录制、状态查询 |
| 文件管理 | `/files` | 列出、Monaco 编辑保存、上传、下载、删除 `__files` 内容 |
| 系统设置 | `/settings` | 写入 `POST /__admin/settings`；4.x 可读并回填，3.x 为只写模式 |

## 契约与版本兼容策略

### 为什么以 3.12.2 契约做基线

- 3.12.2 的 schema 是"最小公约数"：`POST /__admin/mappings` 等写端点在 4.0.0-beta 上同样被接受。
- 4.x 的变化主要是**读**侧的（`GET /__admin/settings` 新增、返回 `{"settings": {...}}` 信封、`postServeActions` 回读归一化为数组），把差异收敛到适配函数里比在页面里写版本分支更稳。

### 差异清单与处理位置

| 差异点 | 3.12.2 契约 | 4.0.0-beta 实测 | 处理位置 |
|--------|-------------|-----------------|----------|
| `GET /__admin/settings` | 不存在 | 存在，返回 `{settings:{...}}` | `capabilities.js` 探测 `supportsSettingsRead` / `settingsEnvelope`；`unwrapSettings()` |
| `POST /__admin/settings` 请求体 | 扁平对象 | 期望 `{settings:{...}}` 信封 | `toSettingsPayload()` 按探测结果包装 |
| `postServeActions` | 对象：`{"webhook": {...}}` | 回读为数组 | `normalizePostServeActions()` 同时兼容两种形态 |
| `GET /__admin/health` | 存在 | 存在 | 失败时退回 `GET /__admin/version` |
| 单场景重置 | 无此端点 | 无此端点 | 仅提供 `POST /__admin/scenarios/reset` |

写请求**永远**使用契约形态（探测只影响读能力与信封包装），这样同一份代码在 3.x / 4.x 上都能提交成功。

### 契约测试

`pnpm test:contract`（`scripts/contract-test.mjs`）用 ajv 加载 `wiremock-admin-api.json`，校验前端生成的映射载荷是否符合 `stub-mapping` / `request-pattern` / `response-definition` schema；`pnpm test:contract:live`（或设置 `WM_URL`）时再对真实 WireMock 做写入冒烟。它的价值在于把"字段拼错/形态不对"的 422 提前到本地暴露。

## 数据模型要点（Stub 映射）

表单模型集中在 `mappingModel.js`，加载项与 WireMock 的 `stub-mapping` schema 1:1 对齐。以下几点最容易踩坑，也是文档必须说明的部分：

### 1. URL 匹配五选一（互斥）

| 表单 `urlMatchType` | 载荷字段 | 语义 |
|---------------------|----------|------|
| `urlPath` | `request.urlPath` | 路径精确匹配（`{变量}` 会被当成普通字符） |
| `urlPathTemplate` | `request.urlPathTemplate` | RFC 6570 路径模板，`{变量}` 可配合 `pathParameters` 断言 |
| `urlPathPattern` | `request.urlPathPattern` | 路径正则匹配（此时也可用 `pathParameters` 校验命名组） |
| `url` | `request.url` | 含查询串的 URL 精确匹配 |
| `urlPattern` | `request.urlPattern` | 含查询串的 URL 正则匹配 |

同时给出多个字段会被 WireMock 拒绝，因此 `buildMappingPayload` 只写选中项对应的那一个键。带 `{变量}` 的路径必须用 `urlPathTemplate`：写进正则字段会被 Java 正则引擎当成量词（`Illegal repetition`），写进精确字段则永远匹配不到真实请求，两种情况都会被 `validateMappingForm` 在提交前拦下。

### 2. 请求体匹配写 `request.bodyPatterns`

旧的 `request.body` 字段会被服务端 422 拒绝。表单用"匹配器 + 值"的列表编辑，最终生成 `bodyPatterns` 数组，支持 `equalTo`（含 `caseInsensitive`）、`equalToJson`（含 `ignoreArrayOrder` / `ignoreExtraElements`）、`equalToXml`、`contains`、`matches`、`matchesJsonPath`、`matchesXPath`、`matchesJsonSchema`、`equalToDateTime`、`before`、`after`、`absent`。

### 3. Basic Auth 字段名

载荷字段是 `request.basicAuthCredentials: { username, password }`。回读时兼容历史数据里的 `request.basicAuth`。

### 4. Webhook 通过 `postServeActions` 下发

- 形态是"扩展名 → 参数"的对象：`{"webhook": { url, method, headers?, body?, delay? }}`
- 一个映射只能挂一个 webhook，因此表单只有一份 webhook 配置
- 延时用 `delay: { type: 'fixed', milliseconds }`
- 4.x 回读会归一化为 `[{name, parameters}]` 数组，`normalizePostServeActions()` 负责兼容

### 5. 延时分布

| 类型 | 字段 |
|------|------|
| `uniform` | `delayDistribution: { type, lower, upper }`，且 `upper >= lower` |
| `lognormal` | `delayDistribution: { type, median, sigma }`，两者必须大于 0，**不接受** `lower`/`upper` |

另有固定延时 `response.fixedDelayMilliseconds` 与 chunked 延时 `response.chunkedDribbleDelay { numberOfChunks, totalDuration }`。

### 6. 映射不存在"启用/禁用"

WireMock 没有启用/禁用映射的能力，`response.fromConfiguredStub` 是服务端只读的匹配标记。界面已移除相关开关；`persist` 只影响是否写入 `mappings/` 目录，与启用状态无关。

### 7. 元数据

`metadata` 原样透传，本工具额外用 `metadata.wmui.description` 存一条备注；备注为空时会从载荷中剔除，避免产生空对象。该字段可用于 `mappings/find-by-metadata`、`mappings/remove-by-metadata` 等端点。

### 8. 全局设置模型

只提交 `SETTINGS_KEYS` 白名单里的键：`fixedDelay`、`requestJournalDisabled`、`maxRequestJournalEntries`、`proxyVia`、`proxyTimeout`、`proxyAll`、`disableBanner`、`enableBrowserProxying`、`enableStubCors`、`preserveHostHeader`，外加对象形态的 `delayDistribution`。表单里的 `delayDistributionType` / `delayLower` 等只是扁平化的 UI 字段，提交前会被折叠回 `delayDistribution`。

## API 集成

`wiremockApi.js` 按能力分组导出，共 42 个端点：

| 分组 | 端点数 | 覆盖内容 |
|------|--------|----------|
| `stubMappingsApi` | 13 | 列表/详情/增删改、批量删除、reset、save、import、find-by-metadata、remove-by-metadata、unmatched 查询与清理 |
| `requestsApi` | 11 | 列表/详情/单条删除/全量删除、resetJournal、count、remove、remove-by-metadata、find、unmatched、unmatched near-misses |
| `nearMissesApi` | 2 | 按 logged request、按 request pattern |
| `recordingsApi` | 4 | start / stop / status / snapshot |
| `scenariosApi` | 2 | 列表、全量重置 |
| `filesApi` | 4 | 列表、读取、写入（`application/octet-stream`）、删除 |
| `systemApi` | 6 | version、health、settings（读/写）、reset、shutdown |

`systemApi.resetAll` 与 `systemApi.shutdown` 已封装但未在界面暴露——它们是破坏性/停机操作，避免误触。

### 错误处理策略

- **无响应**：提示"无法连接到 WireMock 服务"
- **422 / 400**：解析 `errors[].source.pointer`，最多展示 5 条
- **404**：用于能力探测（`GET /__admin/settings` 不存在 → 只写模式）
- **其它状态**：按状态码映射中文标题（400/404/405/415/422/500）
- 前端在提交前做校验（JSON 合法性、延时上下限、缺失匹配值），把可预见的 422 提前拦下

## 开发规范

- 文件/组件命名：组件 PascalCase（`StubMappings.jsx`），工具函数 camelCase（`filterUtils.js`、`requestUtils.js`）
- 页面组件放 `src/components/X.jsx`，其子组件放同名目录 `src/components/X/`
- 状态：React Hooks + 组件本地状态，无全局状态库
- 新增端点前先确认 `wiremock-admin-api.json` 中存在该路径与 schema
- 版本差异只能通过 `capabilities.js` 的探测结果判断，不要硬编码版本号

## 部署方案

```bash
pnpm install
pnpm dev        # 开发：http://localhost:3000
pnpm build      # 生产构建：dist/
pnpm preview    # 本地预览构建产物
```

容器化有两种方案（详见 `DOCKER_DEPLOY.md`）：nginx 多阶段的 `Dockerfile`（80 端口，反代目标由 `WIREMOCK_UPSTREAM` 构建参数注入）与 `Dockerfile.simple`（`npm start` 跑 `vite preview`，3000 端口）。

## 性能与扩展

- **路由级懒加载**：`App.jsx` 对 8 个页面全部使用 `React.lazy` + `Suspense`
- **构建分包**：`react` / `antd` / `vendor` 三个 chunk，`chunkSizeWarningLimit: 900`
- **静态资源缓存**：nginx 对 `js|css|png|...` 设 1 年 immutable，并开启 gzip
- **连接探测节流**：30 秒一次静默探测，避免频繁打扰
