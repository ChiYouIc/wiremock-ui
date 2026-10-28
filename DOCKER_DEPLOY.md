# WireMock UI Docker 部署指南

本文档说明如何把 WireMock UI 部署到服务器。应用是纯静态前端，`/__admin` 需要由反向代理转发到真实的 WireMock 服务。

## 🐳 两种部署方案

仓库内有两套 Dockerfile，按需选择：

| 对比项 | `Dockerfile`（推荐） | `Dockerfile.simple` |
|--------|----------------------|---------------------|
| 构建镜像 | `node:20-alpine` | `node:18-alpine` |
| 构建命令 | pnpm（`corepack enable` + `pnpm install` + `pnpm build`） | npm（`npm install --legacy-peer-deps` + `npm run build`） |
| 运行镜像 | `nginx:alpine`，只托管 `dist/` | 复用构建镜像，`npm start` → `vite preview` |
| 容器端口 | `80` | `3000` |
| Compose 端口映射 | `3001:80`（`docker-compose.yml`） | `3001:3000`（`docker-compose.simple.yml`） |
| `/__admin` 代理 | nginx `proxy_pass`，构建期可注入目标 | Vite preview 不代理，浏览器直连当前 origin 的 `/__admin` |
| 可配置反代目标 | ✅ `WIREMOCK_UPSTREAM` build-arg | ❌ 需改 `vite.config.js` 重新构建 |
| 镜像体积 | 小（仅 nginx + 静态文件） | 大（含 node_modules 与构建工具链） |
| 适用场景 | 生产部署 | 内网试用 / 联调演示 |

### 架构说明（Dockerfile 方案）

```
┌─────────────┐   ┌──────────────────────────┐   ┌────────────────────────┐
│  浏览器      │──▶│  nginx:alpine (容器 80)   │──▶│  WireMock Admin API     │
│             │   │  - /            静态文件   │   │  ${WIREMOCK_UPSTREAM}   │
│             │   │  - /__admin/    反向代理   │   │  默认 wiremock:8080     │
│             │   │  - /health      健康检查   │   └────────────────────────┘
└─────────────┘   └──────────────────────────┘
```

## 📋 部署前准备

- Docker 与 Docker Compose（v2 的 `docker compose` 或旧版 `docker-compose` 均可）
- 一个可从容器网络访问到的 WireMock 服务（地址形如 `http://host:8080`）
- 服务器能访问 3001（或你改用的宿主端口）

## 🚀 方案一：nginx 多阶段（推荐）

### 1. 构建镜像

```bash
docker build -t wiremock-ui:latest .
```

构建过程：`node:20-alpine` 中执行 `corepack enable && pnpm install --frozen-lockfile`（失败时退回 `pnpm install`）→ `pnpm build` → 把 `dist/` 复制进 `nginx:alpine` → 用 `sed` 把 `nginx.conf` 中的上游地址替换为 `WIREMOCK_UPSTREAM`。

### 2. 指定 WireMock 上游地址

镜像默认反代到 `http://wiremock:8080`（即同一 compose 网络中名为 `wiremock` 的服务）。两种改法：

```bash
# 方式一：build-arg
docker build --build-arg WIREMOCK_UPSTREAM=http://192.168.1.10:8080 -t wiremock-ui:latest .

# 方式二：compose 的环境变量（docker-compose.yml 里已用 ${WIREMOCK_UPSTREAM:-http://wiremock:8080} 传入 build args）
WIREMOCK_UPSTREAM=http://192.168.1.10:8080 docker compose up -d --build
```

> ⚠️ 该值在**构建期**写入 `nginx.conf`，改完必须重建镜像（`--build`），仅 `restart` 不会生效。若上游是宿主机上的服务，Linux 下可用 `http://host.docker.internal:8080`（需 `extra_hosts` 或 Docker 20.10+）或宿主网桥地址。

### 3. 启动

```bash
docker compose up -d --build
# 或不用 compose：
docker run -d --name wiremock-ui -p 3001:80 wiremock-ui:latest
```

访问 `http://<服务器>:3001`。

## 🚀 方案二：Dockerfile.simple（vite preview）

```bash
docker compose -f docker-compose.simple.yml up -d --build
```

该方案在容器内以 `npm start`（`vite preview --host 0.0.0.0 --port 3000`）提供静态服务，宿主 3001 → 容器 3000。它**没有** nginx 反代：页面里的 `/__admin` 请求会打到 UI 自身的 origin，因此需要额外把 WireMock 或用外层反向代理挂在同一路径下，否则页面会显示"未连接"。

也可以直接用 simple 镜像起单容器：

```bash
docker build -f Dockerfile.simple -t wiremock-ui:simple .
docker run -d -p 3001:3000 wiremock-ui:simple
```

## ❤️ 健康检查

`nginx.conf` 提供了一个轻量端点：

```nginx
location /health {
    access_log off;
    return 200 "healthy\n";
}
```

`docker-compose.yml` 已配置 healthcheck：

```yaml
healthcheck:
  test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

手动校验：

```bash
curl -i http://localhost:3001/health          # 期望 200 healthy
docker inspect --format '{{.State.Health.Status}}' wiremock-ui
curl -i http://localhost:3001/__admin/health  # 期望拿到 WireMock 的健康响应
```

前端侧的连接状态由首页右上角徽章反映：显示"已连接"表示 `/__admin` 代理链路正常；显示"未连接"通常是反代目标不可达，而不是静态资源问题。

## 🔧 配置说明

### 端口

- 默认宿主端口 **3001**（`3001:80`），改 `docker-compose.yml` 的 `ports` 即可，例如 `"8080:80"`
- 容器内 nginx 固定监听 80

### nginx 反代

`nginx.conf` 中 `location /__admin/` 的 `proxy_pass` 在构建时被 `WIREMOCK_UPSTREAM` 替换（源文件里预留的占位值是 `http://os.wiremock.server.qa.17u.cn`）。代理同时附带 CORS 头与 OPTIONS 预检处理（返回 204）。

其它已启用的能力：
- gzip（`text/*`、`application/javascript`、`application/json` 等）
- 静态资源 1 年缓存 + `immutable`
- React Router 回退：`try_files $uri $uri/ /index.html`，并对 404 回 `index.html`
- 安全头：`X-Frame-Options`、`X-Content-Type-Options`、`X-XSS-Protection`、`Referrer-Policy`

### 环境变量一览

| 位置 | 变量 | 说明 |
|------|------|------|
| 构建期 | `WIREMOCK_UPSTREAM` | 写入 nginx 的反代目标，默认 `http://wiremock:8080` |
| 本地开发 | `VITE_WIREMOCK_TARGET` | Vite dev server 的代理目标，默认 `http://localhost:8080`（Docker 构建不会用到） |

`docker-compose.yml` 里设置的 `NODE_ENV=production` 对 nginx 镜像没有实际作用（镜像里不跑 Node），保留仅为兼容写法。

## 🐛 常见问题

### 1. 页面能打开，但显示"未连接"

```bash
# 容器内测试上游是否可达
docker compose exec wiremock-ui wget -qO- http://<上游地址>/__admin/health

# 检查 nginx 是否真的用了你给的上游
docker compose exec wiremock-ui grep proxy_pass /etc/nginx/nginx.conf
```

- 若第二行仍显示旧地址，说明镜像没重建：`docker compose up -d --build`
- 若上游是宿主机服务，`localhost` 在容器内指容器自身，必须换成可达地址

### 2. 改了 `WIREMOCK_UPSTREAM` 不生效

该值在构建期 `sed` 进配置，属于镜像内容。`docker compose restart` 无效，需要 `--build` 重建。

### 3. 容器启动失败 / 不断重启

```bash
docker compose logs wiremock-ui
docker images | grep wiremock-ui
```

`nginx.conf` 语法错误会在容器启动时立即报 `[emerg]`；本地可先用 `docker run --rm -v ${PWD}/nginx.conf:/etc/nginx/nginx.conf nginx:alpine nginx -t` 校验。

### 4. 构建阶段失败

- `pnpm install --frozen-lockfile` 失败：`pnpm-lock.yaml` 与 `package.json` 不一致，本地跑一次 `pnpm install` 提交 lock 文件
- 网络受限：可先在本机 `pnpm build`，再基于 `nginx:alpine` 手写只 COPY `dist/` 的镜像
- 清缓存重建：`docker build --no-cache -t wiremock-ui:latest .`

### 5. 宿主端口被占用

```bash
# Linux
ss -tlnp | grep 3001
# Windows
Get-NetTCPConnection -LocalPort 3001
```

改 `docker-compose.yml` 的 `ports` 为其他宿主端口。

### 6. 深层链接刷新 404

已由 `try_files $uri $uri/ /index.html` 处理。如果你在 nginx 前面又套了一层网关，需要保证网关同样把未知路径回落到 `index.html`。

### 7. 上传/下载 `__files` 异常

`/__admin/` 反代未设置请求体大小与超时限制，大文件可能受 nginx 默认值影响；如有需要可在 `location /__admin/` 中增加 `client_max_body_size`。

## 📈 性能与安全建议

- 资源限制（compose 中按需添加）：

  ```yaml
  deploy:
    resources:
      limits:
        memory: 256M
        cpus: '0.5'
  ```

- 生产环境建议在外层网关终止 TLS，并把 `Access-Control-Allow-Origin` 从 `*` 收紧到实际域名
- `POST /__admin/reset`、`POST /__admin/shutdown` 等破坏性端点在界面中未暴露，但仍可通过代理直达；对外网暴露时请在网关层按路径/IP 限制
- 需要限制访问来源时，在 `location /` 中加入 `allow` / `deny`

## ✅ 部署检查清单

- [ ] 镜像已构建（含最新的 `WIREMOCK_UPSTREAM`）
- [ ] `docker compose ps` 显示容器 `healthy`
- [ ] `curl http://localhost:3001/health` 返回 200
- [ ] 页面右上角徽章显示"已连接"及 WireMock 版本号
- [ ] 仪表板能加载映射/请求统计
- [ ] 任选一个页面完成一次写操作（如保存映射、保存设置），确认无 422
- [ ] 刷新深层路由（如 `/near-misses`）不出现 404
