# Docker 实战：构建完整的容器化应用

## 前言

本文将通过一个完整的博客项目，展示如何使用 Docker 构建、部署和管理容器化应用，包括多容器编排、镜像优化、安全实践等。

---

## 一、项目架构

### 1.1 应用架构

```
┌─────────────────────────────────────────────────┐
│              Internet                           │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│         Nginx Container                         │
│      (反向代理 + 静态文件)                      │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│      Blog App Container                         │
│    (Golang Gin 应用)                            │
└────────────────────┬────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
    ┌────────┐  ┌────────┐  ┌────────┐
    │ MySQL  │  │ Redis  │  │Volumes │
    │Container│ │Container│ │Storage │
    └────────┘  └────────┘  └────────┘
```

### 1.2 项目结构

```
blog-project/
├── app/
│   ├── cmd/
│   ├── internal/
│   ├── Dockerfile
│   └── go.mod
├── nginx/
│   ├── nginx.conf
│   ├── Dockerfile
│   └── ssl/
├── db/
│   ├── init.sql
│   └── migrations/
├── docker-compose.yml
├── docker-compose.prod.yml
├── .dockerignore
└── README.md
```

---

## 二、完整的 Docker Compose 配置

### 2.1 开发环境配置

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  # Golang 应用
  app:
    build:
      context: ./app
      dockerfile: Dockerfile
      target: development
    container_name: blog-app-dev
    ports:
      - "8080:8080"
    environment:
      DB_HOST: mysql
      DB_PORT: 3306
      DB_USER: blog
      DB_PASSWORD: blog123
      DB_NAME: blog
      REDIS_HOST: redis
      REDIS_PORT: 6379
      ENV: development
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./app:/app
      - /app/vendor
    networks:
      - blog-network
    restart: unless-stopped
    command: go run cmd/main.go

  # MySQL 数据库
  mysql:
    image: mysql:8.0
    container_name: blog-mysql-dev
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: blog
      MYSQL_USER: blog
      MYSQL_PASSWORD: blog123
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./db/init.sql:/docker-entrypoint-initdb.d/01-init.sql
      - ./db/migrations:/docker-entrypoint-initdb.d/migrations
    networks:
      - blog-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 3

  # Redis 缓存
  redis:
    image: redis:7-alpine
    container_name: blog-redis-dev
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    networks:
      - blog-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  # Nginx 反向代理
  nginx:
    build:
      context: ./nginx
      dockerfile: Dockerfile
    container_name: blog-nginx-dev
    ports:
      - "80:80"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./app/public:/var/www/blog/public:ro
    depends_on:
      - app
    networks:
      - blog-network
    restart: unless-stopped

volumes:
  mysql_data:
  redis_data:

networks:
  blog-network:
    driver: bridge
```

### 2.2 生产环境配置

创建 `docker-compose.prod.yml`：

```yaml
version: '3.8'

services:
  # Golang 应用
  app:
    image: myregistry/blog-app:latest
    container_name: blog-app-prod
    ports:
      - "8080:8080"
    environment:
      DB_HOST: mysql
      DB_PORT: 3306
      DB_USER: blog
      DB_PASSWORD: ${DB_PASSWORD}
      DB_NAME: blog
      REDIS_HOST: redis
      REDIS_PORT: 6379
      ENV: production
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    networks:
      - blog-network
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 512M
        reservations:
          cpus: '0.5'
          memory: 256M

  # MySQL 数据库
  mysql:
    image: mysql:8.0
    container_name: blog-mysql-prod
    environment:
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD}
      MYSQL_DATABASE: blog
      MYSQL_USER: blog
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - mysql_data:/var/lib/mysql
    networks:
      - blog-network
    restart: always
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 30s
      timeout: 10s
      retries: 3
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 1G

  # Redis 缓存
  redis:
    image: redis:7-alpine
    container_name: blog-redis-prod
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    networks:
      - blog-network
    restart: always
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Nginx 反向代理
  nginx:
    image: myregistry/blog-nginx:latest
    container_name: blog-nginx-prod
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./ssl:/etc/nginx/ssl:ro
      - nginx_cache:/var/cache/nginx
    depends_on:
      - app
    networks:
      - blog-network
    restart: always

volumes:
  mysql_data:
  redis_data:
  nginx_cache:

networks:
  blog-network:
    driver: bridge
```

---

## 三、Dockerfile 优化

### 3.1 应用 Dockerfile

创建 `app/Dockerfile`：

```dockerfile
# ============ 构建阶段 ============
FROM golang:1.21-alpine3.18 AS builder

# 安装构建工具
RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /app

# 复制 go.mod 和 go.sum
COPY go.mod go.sum ./

# 下载依赖（利用缓存）
RUN go mod download

# 复制源代码
COPY . .

# 构建应用
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build \
    -ldflags="-w -s -X main.Version=$(git describe --tags --always)" \
    -o blog-backend \
    cmd/main.go

# ============ 开发阶段 ============
FROM golang:1.21-alpine3.18 AS development

WORKDIR /app

RUN go install github.com/cosmtrek/air@latest

COPY . .

EXPOSE 8080

CMD ["air"]

# ============ 最终阶段 ============
FROM alpine:3.18

# 安装运行时依赖
RUN apk add --no-cache ca-certificates tzdata curl

# 创建非 root 用户
RUN addgroup -g 1000 appgroup && \
    adduser -D -u 1000 -G appgroup appuser

WORKDIR /app

# 复制构建好的应用
COPY --from=builder /app/blog-backend .

# 复制配置文件
COPY --chown=appuser:appgroup config ./config

# 切换用户
USER appuser

# 暴露端口
EXPOSE 8080

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# 启动应用
CMD ["./blog-backend"]
```

### 3.2 Nginx Dockerfile

创建 `nginx/Dockerfile`：

```dockerfile
FROM nginx:1.25-alpine

# 安装额外工具
RUN apk add --no-cache curl

# 删除默认配置
RUN rm /etc/nginx/conf.d/default.conf

# 复制自定义配置
COPY nginx.conf /etc/nginx/nginx.conf

# 创建缓存目录
RUN mkdir -p /var/cache/nginx && \
    chown -R nginx:nginx /var/cache/nginx

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

EXPOSE 80 443

CMD ["nginx", "-g", "daemon off;"]
```

---

## 四、镜像构建和推送

### 4.1 构建脚本

创建 `build.sh`：

```bash
#!/bin/bash

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置
REGISTRY="myregistry"
VERSION=${1:-latest}
BUILD_DATE=$(date -u +'%Y-%m-%dT%H:%M:%SZ')
GIT_COMMIT=$(git rev-parse --short HEAD)

echo -e "${YELLOW}Building Docker images...${NC}"

# 构建应用镜像
echo -e "${YELLOW}Building app image...${NC}"
docker build \
  --target development \
  --build-arg BUILD_DATE=$BUILD_DATE \
  --build-arg VCS_REF=$GIT_COMMIT \
  -t $REGISTRY/blog-app:$VERSION \
  -t $REGISTRY/blog-app:latest \
  ./app

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ App image built successfully${NC}"
else
  echo -e "${RED}✗ Failed to build app image${NC}"
  exit 1
fi

# 构建 Nginx 镜像
echo -e "${YELLOW}Building nginx image...${NC}"
docker build \
  --build-arg BUILD_DATE=$BUILD_DATE \
  --build-arg VCS_REF=$GIT_COMMIT \
  -t $REGISTRY/blog-nginx:$VERSION \
  -t $REGISTRY/blog-nginx:latest \
  ./nginx

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓ Nginx image built successfully${NC}"
else
  echo -e "${RED}✗ Failed to build nginx image${NC}"
  exit 1
fi

echo -e "${GREEN}All images built successfully!${NC}"
```

### 4.2 推送脚本

创建 `push.sh`：

```bash
#!/bin/bash

set -e

REGISTRY="myregistry"
VERSION=${1:-latest}

echo "Pushing images to registry..."

# 登录到仓库
docker login $REGISTRY

# 推送应用镜像
echo "Pushing app image..."
docker push $REGISTRY/blog-app:$VERSION
docker push $REGISTRY/blog-app:latest

# 推送 Nginx 镜像
echo "Pushing nginx image..."
docker push $REGISTRY/blog-nginx:$VERSION
docker push $REGISTRY/blog-nginx:latest

echo "All images pushed successfully!"
```

---

## 五、.dockerignore 文件

创建 `.dockerignore`：

```
# Git
.git
.gitignore
.gitattributes

# IDE
.vscode
.idea
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Build
dist
build
*.o
*.a
*.so

# Dependencies
node_modules
vendor

# Logs
*.log
logs

# Test
coverage
.coverage
.pytest_cache

# Documentation
docs
*.md

# CI/CD
.github
.gitlab-ci.yml
.travis.yml

# Docker
Dockerfile
docker-compose*.yml
.dockerignore
```

---

## 六、容器监控和日志

### 6.1 日志配置

在 `docker-compose.yml` 中添加：

```yaml
services:
  app:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
        labels: "app=blog-app"
```

### 6.2 查看日志

```bash
# 查看特定容器日志
docker logs -f blog-app-dev

# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f app

# 查看最后 100 行
docker-compose logs --tail=100 app
```

### 6.3 监控容器资源

```bash
# 实时监控
docker stats

# 查看容器详情
docker inspect blog-app-dev

# 查看容器进程
docker top blog-app-dev
```

---

## 七、部署和更新

### 7.1 部署脚本

创建 `deploy.sh`：

```bash
#!/bin/bash

set -e

ENV=${1:-development}
VERSION=${2:-latest}

echo "Deploying to $ENV environment..."

if [ "$ENV" = "production" ]; then
  docker-compose -f docker-compose.prod.yml pull
  docker-compose -f docker-compose.prod.yml up -d
else
  docker-compose up -d
fi

# 等待服务启动
echo "Waiting for services to start..."
sleep 10

# 检查服务健康状态
echo "Checking service health..."
docker-compose ps

echo "Deployment completed!"
```

### 7.2 滚动更新

```bash
# 构建新镜像
docker build -t myregistry/blog-app:v1.1 ./app

# 推送新镜像
docker push myregistry/blog-app:v1.1

# 更新服务
docker-compose -f docker-compose.prod.yml up -d --no-deps --build app

# 验证更新
docker-compose ps
docker-compose logs app
```

---

## 八、安全最佳实践

### 8.1 镜像扫描

```bash
# 使用 Trivy 扫描镜像
trivy image myregistry/blog-app:latest

# 使用 Docker Scout 扫描
docker scout cves myregistry/blog-app:latest
```

### 8.2 安全配置

```yaml
services:
  app:
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    read_only: true
    tmpfs:
      - /tmp
      - /var/run
```

---

## 九、故障排查

### 9.1 常见问题

**问题 1：容器无法启动**

```bash
# 查看错误日志
docker logs blog-app-dev

# 进入容器调试
docker run -it --rm myregistry/blog-app:latest /bin/sh
```

**问题 2：网络连接问题**

```bash
# 检查网络
docker network inspect blog-network

# 测试容器间通信
docker exec blog-app-dev ping redis
```

**问题 3：磁盘空间不足**

```bash
# 清理未使用的镜像
docker image prune -a

# 清理未使用的容器
docker container prune

# 清理未使用的卷
docker volume prune
```

---

## 十、总结

通过完整的 Docker 实战，我们实现了：

1. **容器化应用**：将应用打包为镜像
2. **多容器编排**：使用 Docker Compose 管理多个服务
3. **镜像优化**：减小镜像大小，提高构建速度
4. **安全实践**：非 root 用户、资源限制、镜像扫描
5. **自动化部署**：脚本化构建、推送、部署流程

---

## 参考资源

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Compose 文档](https://docs.docker.com/compose/)
- [Dockerfile 最佳实践](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
- [Trivy 镜像扫描](https://github.com/aquasecurity/trivy)
