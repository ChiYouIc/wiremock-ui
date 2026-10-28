# ---- 构建阶段 ----
FROM node:20-alpine AS build
WORKDIR /app

COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
RUN corepack enable && (pnpm install --frozen-lockfile || pnpm install)

COPY index.html vite.config.js ./
COPY src/ ./src/
RUN pnpm build

# ---- 运行阶段 ----
FROM nginx:alpine

# 反向代理目标，可在 docker compose 中通过 build args 覆盖
ARG WIREMOCK_UPSTREAM=http://wiremock:8080

COPY nginx.conf /etc/nginx/nginx.conf
RUN sed -i "s|http://os.wiremock.server.qa.17u.cn|${WIREMOCK_UPSTREAM}|g" /etc/nginx/nginx.conf

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
