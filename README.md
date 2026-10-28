# WireMock UI - 可视化操作工具

一个 WireMock 的前端可视化管理工具，用于管理 stub 映射、查看请求记录、排查未匹配请求、管理场景与录制、维护 `__files` 以及调整全局设置。

前端不做任何"自造协议"：所有请求形态都以仓库根目录的 `wiremock-admin-api.json`（WireMock 3.12.2 的 OpenAPI 契约）为准，并兼容运行中的 WireMock 4.0.0-beta。

## 契约与版本兼容

- **契约基线**：`wiremock-admin-api.json`（`info.version = 3.12.2`）。`src/services/wiremockApi.js` 中的每个方法都对齐该文件中的路径与 schema。
- **运行时兼容**：WireMock 4.x 与 3.x 在 `/__admin/settings` 上有差异，由 `src/services/capabilities.js` 在启动时探测，而不是写死在代码里：

  | 能力 | 3.x | 4.x | 探测方式 |
  |------|-----|-----|----------|
  | `GET /__admin/health` | 有 | 有 | 探测失败则退回 `GET /__admin/version` |
  | `GET /__admin/settings` | 404 | 有 | 404 视为不支持读取 |
  | `GET /__admin/settings` 返回形态 | — | `{"settings": {...}}` 信封 | 检测响应中是否存在 `settings` 键 |

  探测结果写入 `sessionStorage`（`wmui.capabilities`），页面顶部徽章显示实际检测到的版本号，并每 30 秒静默重探一次。

## 技术栈

- **语言**：JavaScript（JSX）——项目不使用 TypeScript
- **前端框架**：React 18
- **UI 组件库**：Ant Design 5 + `@ant-design/icons`
- **路由**：React Router 6（`BrowserRouter`，路由级 `lazy` 懒加载）
- **HTTP 客户端**：Axios（`baseURL` 随实例切换：默认 `/__admin`，切到其他实例后为 `<target>/__admin`，超时 15s）
- **代码编辑器**：Monaco Editor（`@monaco-editor/react`）
- **构建工具**：Vite 5
- **包管理器**：pnpm（仓库内有 `pnpm-lock.yaml`）
- **样式**：CSS3 + Flexbox/Grid（`src/index.css`；卡片间距统一走 `--page-gap`，卡片网格用 `.card-flow` 多列流式布局）

## 快速开始

### 前置要求

- Node.js 18+（推荐 20，Docker 构建镜像使用 `node:20-alpine`）
- pnpm
- 一个正在运行的 WireMock 服务（默认 `http://localhost:8080`）

### 安装与启动

```bash
pnpm install
pnpm dev        # 开发服务器，http://localhost:3000
pnpm build      # 生产构建，输出 dist/
pnpm preview    # 预览构建产物
```

> 本项目使用 pnpm：请勿用 `npm install` / `npm run dev`，否则可能与 `pnpm-lock.yaml` 不一致。

### 启动 WireMock

```bash
java -jar wiremock-standalone-3.12.2.jar --port 8080 --verbose
```

或使用 Docker：

```bash
docker run -it --rm -p 8080:8080 wiremock/wiremock:3.12.2 --verbose
```

## 环境变量

| 变量 | 默认值 | 作用 |
|------|--------|------|
| `VITE_WIREMOCK_TARGET` | `http://localhost:8080` | **仅开发服务器**（`pnpm dev`）代理 `/__admin` 的目标地址，在 `vite.config.js` 中读取 |

用法：

```bash
# 方式一：命令行
VITE_WIREMOCK_TARGET=http://192.168.1.10:9090 pnpm dev

# 方式二：写入 .env.local（已被 .gitignore 忽略）
echo VITE_WIREMOCK_TARGET=http://192.168.1.10:9090 > .env.local
pnpm dev
```

生产构建不走这个变量：`pnpm build` 产出的是纯静态文件，`/__admin` 由部署层的反向代理转发（见 `DOCKER_DEPLOY.md`）。

## 多实例（相当于"工作空间"）

WireMock 开源版一个进程只有一套映射/日志/文件，没有 Cloud 那样的 workspace。要真正隔离，就多开实例（如 8080、8081），然后在页面右上角的下拉里切换：

- 默认条目「本机（同源代理）」使用 `VITE_WIREMOCK_TARGET` 指定的目标
- 「管理实例…」可登记任意 `http://host:port`，切换后所有请求直连该实例，且页面会按新实例重新加载
- 直连依赖 WireMock Admin API 的 CORS（4.x 默认开启）；若目标关闭了 CORS，请改为同源反向代理并在实例配置里留空地址
- 实例列表保存在浏览器 `localStorage`（`wmui.targets` / `wmui.activeTarget`）

## 功能页面

侧边栏共 8 个页面，路由与 `src/components` 下的文件一一对应：

| 页面 | 路由 | 组件 | 说明 |
|------|------|------|------|
| 仪表板 | `/dashboard` | `Dashboard.jsx` | 4 项核心指标 + 运行状态 + 需要关注 + 最近请求 + 请求分布 + Top 命中映射，可开 15 秒自动刷新 |
| Stub 映射 | `/stub-mappings` | `StubMappings.jsx` | 左列表 + 右表单的主从编辑、实时载荷预览、分组（筛选/按组导出/按组删除）、导入导出、清理未匹配 |
| 请求记录 | `/requests` | `Requests.jsx` | 请求日志列表、多维过滤（含"仅未匹配"）、请求/响应详情、单条请求 near-miss、清空日志 |
| Near-Miss 调试 | `/near-misses` | `NearMisses.jsx` | 按"请求模式"或"未匹配请求"查询最接近的映射及差异 |
| 场景管理 | `/scenarios` | `Scenarios.jsx` | 场景列表与状态展示，支持**全量**重置 |
| 录制回放 | `/recording` | `Recording.jsx` | 开始/停止录制、快照录制、录制状态查看 |
| 文件管理 | `/files` | `Files.jsx` | `__files` 列表、Monaco 编辑、上传、下载、删除 |
| 系统设置 | `/settings` | `Settings.jsx` | 读取/写入全局设置；操作按钮在页头（刷新/撤销修改/保存），不支持读取时进入"只写模式" |

### 主要功能说明

#### 1. 仪表板
- **核心指标**：映射数、请求数、未匹配请求（有值时标红）、匹配率（按 journal 总数与未匹配数计算）
- **运行状态**：版本、运行时长（`/health`）、录制状态、请求日志开关（`/requests/count` 返回的 `requestJournalDisabled`）、场景数（含已流转数量）、`__files` 文件数、Mock 地址复制
- **需要关注**：从未命中的映射（可一键清理）、未匹配请求及其 Top URL（跳转 Near-Miss 调试）、已离开初始状态的场景（跳转场景管理）
- **最近请求**：最近 8 条日志，点击任意行会跳到请求记录页并自动打开该请求详情
- **请求分布**：按 HTTP 方法与状态码区间（2xx/3xx/4xx/5xx/无响应）的条形分布，不依赖图表库
- **Top 命中映射**：按请求日志聚合出最常命中的映射
- **刷新**：手动刷新 + 可开关的 15 秒自动刷新（页面隐藏时暂停），显示最后更新时间
- 连接失败时给出重试入口

#### 2. Stub 映射
- **主从布局**：左侧为映射列表（搜索、新建、复制、删除、点击即选中），右侧为配置表单，无需弹窗；字段按「基本信息 / 请求匹配 / 响应配置 / Webhook」分节平铺，滚动即可，底部固定保存栏（支持 Ctrl / ⌘ + S）
- **实时载荷预览**：表单底部展示即将提交的 stub-mapping JSON，改动即时更新
- **未保存保护**：切换映射或新建前会提示放弃未保存的修改
- URL 匹配四选一：`urlPath`（路径精确）、`urlPathPattern`（路径正则）、`url`（含查询串精确）、`urlPattern`（含查询串正则）
- 请求匹配支持 query 参数、header、cookie、form 参数、path 参数、Basic Auth、请求体匹配器（`bodyPatterns`）
- 响应支持状态码/状态消息/headers、`body` / `jsonBody` / `base64Body` / `bodyFileName`、fault、固定延时、延时分布、chunked 延时、反向代理、响应转换器
- 请求体校验（JSON 合法性、延时上下限、lognormal 参数等）在提交前完成，减少服务端 422
- **分组（伪工作空间）**：WireMock 开源版没有工作空间概念，本工具用 `metadata.wmui.group` 做分组标签——左侧可切换分组、按组导出、按组删除（`POST /__admin/mappings/remove-by-metadata`）；注意分组只用于分类，不构成隔离
- 列表级操作：导出全部为 JSON、从 JSON 导入、清理未匹配映射

##### 导入文件的三种合法形态

`POST /__admin/mappings/import` 只接受**映射**，不接受请求日志。以下三种都能被「导入」按钮识别：

```json
{ "mappings": [ { "request": {}, "response": {} } ] }   // 推荐，与「导出全部」产物一致
[ { "request": {}, "response": {} } ]                   // 纯数组
{ "request": {}, "response": {} }                       // 单个映射
```

几个容易踩的点：

- `GET /__admin/requests/{id}` 导出的**请求日志**不能直接导入（含 `wasMatched` / `timing` / `subEvents` 等日志字段）。要复用它，取内部的 `stubMapping` 字段再包成 `{ "mappings": [...] }`。
- 响应体里用了 `{{request.query.xxx}}` 之类的模板时，映射必须带 `"transformers": ["response-template"]`，否则占位符会被原样返回。
- `postServeActions` 用对象形态 `{"webhook": {...}}`；WireMock 4.x 回读时会归一化成数组，不影响再次导入。
- 映射自带的 `id` 会保留：重复导入同一个文件是「更新」而不是「新增」，需要副本时先去掉 `id`/`uuid`。

#### 3. 请求记录
- 请求列表 + 过滤（搜索、方法、状态码区间、仅未匹配）
- 详情抽屉：请求概览、请求详情、响应详情、webhook 事件
- 对单条请求查询 near-miss（`POST /__admin/near-misses/request`）
- 清空请求日志

#### 4. Near-Miss 调试
- **按请求模式**：输入方法 / URL / URL 正则 / 请求体匹配器，调用 `POST /__admin/near-misses/request-pattern`，返回最接近的映射与差异，适合排查"为什么这条映射不生效"
- **按未匹配请求**：调用 `GET /__admin/requests/unmatched/near-misses`，一次性列出所有未匹配请求的近似候选

#### 5. 场景管理
- 展示每个场景的名称、当前状态、可用状态
- **只支持全量重置**（`POST /__admin/scenarios/reset`）。规范与运行时都没有"单场景重置"端点，调用只会得到 404

#### 6. 录制回放
- 开始录制：目标 `targetBaseUrl`、可选 `filters`（`urlPathPattern`、必须为大写字母的 `method`）、`captureHeaders`、`requestBodyPattern`、`transformers`、`persist`、`repeatsAsScenarios`
- 停止录制 / 查询状态（`NeverStarted` / `Recording` 等）
- 快照录制：可额外用 `filters.ids` 限定已记录的请求

#### 7. 文件管理
- 列出 `GET /__admin/files`
- Monaco 编辑器打开并保存（`PUT /__admin/files/{name}`，`Content-Type: application/octet-stream`）
- 下载走浏览器直连 `/__admin/files/{name}`，删除为 `DELETE /__admin/files/{name}`

#### 8. 系统设置
- 写入统一走 `POST /__admin/settings`
- 读取依赖 `GET /__admin/settings`：**只有 WireMock 4.x 提供**，且返回 `{"settings": {...}}` 信封
- 3.x 探测到 404 时页面进入"只写模式"：表单仍可提交，但不会回填服务端现值
- 操作按钮集中在**页头右侧**：刷新 / 撤销修改 / 保存设置（`Ctrl / ⌘ + S` 同效）；有改动时标题旁会出现「有未保存的修改」
- 规范里**没有** `/__admin/settings/reset`：「撤销修改」只是重新拉取服务端值（只写模式则清空表单），不会向服务端发送重置请求

## API 覆盖表

`src/services/wiremockApi.js` 中的 7 个能力分组，共 42 个端点。表内"页面"列标注了当前 UI 实际调用方；标 `—` 表示已按契约封装、暂未接入界面。

### mappings

| 方法 | 端点 | 页面 |
|------|------|------|
| GET | `/__admin/mappings` | 仪表板 / Stub 映射 |
| GET | `/__admin/mappings/{id}` | — |
| POST | `/__admin/mappings` | Stub 映射 |
| PUT | `/__admin/mappings/{id}` | Stub 映射 |
| DELETE | `/__admin/mappings/{id}` | Stub 映射 |
| DELETE | `/__admin/mappings` | — |
| POST | `/__admin/mappings/reset` | — |
| POST | `/__admin/mappings/save` | — |
| POST | `/__admin/mappings/import` | Stub 映射（导入） |
| POST | `/__admin/mappings/find-by-metadata` | — |
| POST | `/__admin/mappings/remove-by-metadata` | Stub 映射（按分组删除） |
| GET | `/__admin/mappings/unmatched` | 仪表板（死桩统计） |
| DELETE | `/__admin/mappings/unmatched` | 仪表板 / Stub 映射（清理未匹配） |

### requests

| 方法 | 端点 | 页面 |
|------|------|------|
| GET | `/__admin/requests` | 仪表板 / 请求记录 |
| GET | `/__admin/requests/{id}` | —（详情复用列表数据） |
| DELETE | `/__admin/requests/{id}` | — |
| DELETE | `/__admin/requests` | 请求记录（清空日志） |
| POST | `/__admin/requests/reset` | — |
| POST | `/__admin/requests/count` | 仪表板（journal 计数与日志开关状态） |
| POST | `/__admin/requests/remove` | — |
| POST | `/__admin/requests/remove-by-metadata` | — |
| POST | `/__admin/requests/find` | — |
| GET | `/__admin/requests/unmatched` | 仪表板（未匹配计数） |
| GET | `/__admin/requests/unmatched/near-misses` | Near-Miss 调试 |

### near-misses

| 方法 | 端点 | 页面 |
|------|------|------|
| POST | `/__admin/near-misses/request` | 请求记录（单条请求分析） |
| POST | `/__admin/near-misses/request-pattern` | Near-Miss 调试 |

### recordings

| 方法 | 端点 | 页面 |
|------|------|------|
| POST | `/__admin/recordings/start` | 录制回放 |
| POST | `/__admin/recordings/stop` | 录制回放 |
| GET | `/__admin/recordings/status` | 录制回放 |
| POST | `/__admin/recordings/snapshot` | 录制回放 |

### scenarios

| 方法 | 端点 | 页面 |
|------|------|------|
| GET | `/__admin/scenarios` | 场景管理 |
| POST | `/__admin/scenarios/reset` | 场景管理（全量重置） |

### files

| 方法 | 端点 | 页面 |
|------|------|------|
| GET | `/__admin/files` | 文件管理 |
| GET | `/__admin/files/{name}` | 文件管理（编辑器加载） |
| PUT | `/__admin/files/{name}` | 文件管理（保存，`application/octet-stream`） |
| DELETE | `/__admin/files/{name}` | 文件管理 |

### system

| 方法 | 端点 | 页面 |
|------|------|------|
| GET | `/__admin/version` | capabilities 探测 |
| GET | `/__admin/health` | capabilities 探测 |
| GET | `/__admin/settings` | 系统设置（仅 4.x） |
| POST | `/__admin/settings` | 系统设置 |
| POST | `/__admin/reset` | —（危险操作，界面未暴露） |
| POST | `/__admin/shutdown` | —（危险操作，界面未暴露） |

## 项目结构

```
src/
├── App.jsx                     # 布局、菜单、路由、连接探测
├── main.jsx                    # 应用入口
├── index.css                   # 全局样式（--page-gap 间距令牌、.page-stack / .card-flow 布局类）
├── services/
│   ├── wiremockApi.js          # 全部 Admin API 封装（7 个能力分组）
│   ├── targets.js              # 多实例（工作空间）配置，localStorage 持久化
│   ├── capabilities.js         # 运行时能力探测 + settings 信封适配
│   └── wiremockErrors.js       # 422/400 等错误解析与统一提示
└── components/
    ├── Dashboard.jsx
    ├── TargetsModal.jsx        # 多实例管理弹窗
    ├── StubMappings.jsx
    ├── StubMappings/           # mappingModel.js（表单 ⇄ 载荷）、MappingList/MappingEditor（主从布局）、表单分节、导入导出
    ├── Requests.jsx
    ├── Requests/               # 过滤、列定义、详情分节、webhook 事件
    ├── NearMisses.jsx
    ├── NearMisses/
    ├── Scenarios.jsx
    ├── Recording.jsx
    ├── Recording/              # 状态卡、开始录制卡、快照卡
    ├── Files.jsx
    ├── Settings.jsx
    └── Settings/               # 基础/匹配/网络/高级设置卡
```

## 契约测试

```bash
pnpm test:contract        # 离线：用 wiremock-admin-api.json 校验前端生成的载荷
WM_URL=http://localhost:8080 pnpm test:contract:live   # 额外对真实服务做写入冒烟
```

`scripts/contract-test.mjs` 用 `ajv` 加载 `wiremock-admin-api.json`，按其中的 `stub-mapping` / `request-pattern` / `response-definition` schema 校验 `buildMappingPayload()` 的产物，并覆盖 8 组用例：默认表单、URL 匹配互斥、请求体匹配、Basic Auth、Webhook、延时分布、响应体来源、回读/回写一致性。`--live`（或用 `WM_URL` 指定地址）时会再对运行中的 WireMock 做一次真实写入。

## 开发指南

- 新增端点：先确认它存在于 `wiremock-admin-api.json`，再在 `src/services/wiremockApi.js` 对应分组中添加方法
- 新增页面：在 `src/components/` 建组件 → 在 `src/App.jsx` 的 `MENU_ITEMS` 与 `Routes` 中各加一项
- 版本差异：不要用 `if (version >= 4)` 之类的硬编码判断，统一走 `capabilities.js` 的探测结果
- 错误提示：一律通过 `showApiError(error, '操作失败')`，它会解析 `bad-request-entity` 的 `errors[].source.pointer`
- 请求一律走 `services/wiremockApi.js` 里的 axios 实例，不要在组件里另建 axios —— 否则切换实例后该请求不会跟随
- 样式约定：页面根节点用 `fade-in page-stack`；卡片用 `content-card`；多张卡片并排用 `.card-flow`（多列流式，窄屏自动单列）；间距只使用 `--page-gap`，不要写死 `margin`

## 常见问题

### 1. 页面提示"无法连接到 WireMock 服务"

- 确认 WireMock 已启动：`curl http://localhost:8080/__admin/health`
- 目标地址不对时设置 `VITE_WIREMOCK_TARGET` 后重启 `pnpm dev`（Vite 只在启动时读取该变量）
- 徽章显示"未连接"时，仪表板的内容不会加载；连接成功后会每 30 秒自动重探

### 2. 保存映射时报 422（WireMock 校验失败）

422 响应体是 `{"errors": [{"code", "source": {"pointer"}, "title", "detail"}]}`，本工具的 `wiremockErrors.js` 会把前 5 条按 `pointer: detail` 显示在通知里，同时打印到浏览器控制台。按 `pointer` 定位即可，最常见的几类原因：

| pointer 指向 | 原因 | 正确做法 |
|--------------|------|----------|
| `/request/body` | 使用了旧的 `request.body` | 请求体匹配必须写进 `request.bodyPatterns` 数组 |
| `/request` | 同时给了多个 URL 匹配字段 | `url` / `urlPath` / `urlPathPattern` / `urlPattern` 只能四选一 |
| `/request/basicAuth` | 字段名写错 | 契约字段是 `basicAuthCredentials` |
| `/response/delayDistribution` | 参数与类型不匹配 | `uniform` 用 `lower`/`upper`；`lognormal` 必须用 `median`/`sigma`（不支持 lower/upper） |
| `/postServeActions` | 形态不对 | 必须是"扩展名 → 参数"的对象，例如 `{"webhook": {...}}`，不能是数组 |
| `/filters/method` | 录制过滤器方法非法 | 必须匹配 `^[A-Z]+$`（如 `GET`），不能是小写或正则 |

排查顺序建议：先看控制台里 `WireMock API 错误: <method> <url> <status> <pointer>` 这行日志拿到状态码与 pointer，再对照 `wiremock-admin-api.json` 中对应该路径的 schema。也可以运行 `pnpm test:contract` 在提交前发现同类问题。

### 3. 场景为什么只能"重置所有"？

规范中不存在单场景重置端点（`POST /__admin/scenarios/{name}/reset` 会 404），因此页面只提供 `POST /__admin/scenarios/reset`。

### 4. 系统设置页显示"只写模式"

说明 `GET /__admin/settings` 返回 404 —— WireMock 3.x 没有这个读端点。此时页面不会回填服务端现值，但 `POST /__admin/settings` 依然可用；保存后表单会清空而不是重新加载。

### 5. webhook 配置保存后再打开变成数组了

写入时 `postServeActions` 是对象形态（`{"webhook": {...}}`），WireMock 4.x 回读时会归一化成数组。`mappingModel.js` 的 `normalizePostServeActions()` 同时兼容两种形态；一个映射只能挂一个 webhook。

### 6. 映射的"启用/禁用"开关去哪了？

已移除。WireMock 没有启用/禁用映射的能力，`response.fromConfiguredStub` 是只读的匹配标志，不是开关。

### 7. CORS / 跨域问题

开发环境由 Vite 代理 `/__admin`，正常不会跨域。右上角切到其它实例时浏览器会直连目标：

- WireMock 4.x 的 `/__admin` 默认返回 CORS 头（回显 `Origin`，预检放行常用方法与头），已实测可用
- 若目标实例不返回这些头（例如某些 3.x 配置），请改用同源反向代理，并在「管理实例」里把地址留空（走当前站点代理）
- 部署层反向代理的写法见 `DOCKER_DEPLOY.md`

### 8. 录制没有生成映射

- 确认目标 API 可访问、`targetBaseUrl` 正确
- `filters.method` 必须是大写方法名，否则会被前端丢弃
- 若 `persist=false`，录制结果只存在于内存日志，不会落盘到 `mappings/`

### 9. 导入 JSON 失败

先确认文件形态：只接受 `{ "mappings": [...] }`、数组、或单个 `{request, response}`（详见"导入文件的三种合法形态"）。

最常见的错误来源是把 `GET /__admin/requests/{id}` 的**请求日志**当映射导入——它顶层也有 `request`/`response` 字段，但那是"已发生的请求"而不是匹配规则。正确做法是取其中的 `stubMapping` 字段。

### 10. 分组会把映射隔离开吗？

不会。分组只是写在 `metadata.wmui.group` 的标签，用来筛选、按组导出、按组删除；同一实例内所有映射依然共享同一个匹配空间。需要真正的隔离请用多实例（见"多实例"一节）。

## 相关链接

- [WireMock 官方文档](https://wiremock.org/docs/)
- [WireMock Admin API（OpenAPI）](https://wiremock.org/docs/standalone/admin-api-reference/)
- [Ant Design](https://ant.design/)
- [Vite](https://vitejs.dev/)
