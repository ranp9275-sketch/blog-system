# Docker 基础：容器化应用完全指南

## 前言

Docker 是现代应用开发和部署的标准工具。本文将深入讲解 Docker 的核心概念、常用命令、Dockerfile 编写，以及在实际项目中的应用。

---

## 一、Docker 核心概念

### 1.1 什么是 Docker？

Docker 是一个开源的容器化平台，允许开发者将应用程序及其依赖打包到一个标准化的单元中运行。

**核心特点：**
- **轻量级**：比虚拟机更轻量，启动速度快
- **可移植**：一次构建，处处运行
- **隔离性**：应用之间相互隔离
- **易于扩展**：快速部署和扩展

### 1.2 Docker 架构

```
┌─────────────────────────────────────────────────┐
│              Docker Client                      │
│         (docker 命令行工具)                     │
└────────────────────┬────────────────────────────┘
                     │ (REST API)
                     ▼
┌─────────────────────────────────────────────────┐
│           Docker Daemon                         │
│      (dockerd - 后台服务)                       │
│  ┌────────────────────────────────────────┐    │
│  │     Container Runtime                  │    │
│  │  (containerd, runc)                    │    │
│  └────────────────────────────────────────┘    │
└────────────────────┬────────────────────────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
    ┌────────┐  ┌────────┐  ┌────────┐
    │Container│ │Container│ │Container│
    │   1    │  │   2    │  │   3    │
    └────────┘  └────────┘  └────────┘
```

### 1.3 镜像 vs 容器

| 概念 | 说明 | 类比 |
|------|------|------|
| **镜像** | 应用的静态模板 | 类 (Class) |
| **容器** | 镜像的运行实例 | 对象 (Object) |

---

## 二、Docker 安装和配置

### 2.1 安装 Docker

**Ubuntu/Debian**
```bash
# 更新包列表
sudo apt-get update

# 安装依赖
sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release

# 添加 Docker GPG 密钥
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# 添加 Docker 仓库
echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# 安装 Docker
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# 启动 Docker
sudo systemctl start docker
sudo systemctl enable docker

# 验证安装
docker --version
```

**CentOS/RHEL**
```bash
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io
sudo systemctl start docker
sudo systemctl enable docker
```

### 2.2 配置 Docker

创建 `/etc/docker/daemon.json`：

```json
{
  "registry-mirrors": [
    "https://mirror.aliyuncs.com",
    "https://registry.docker-cn.com"
  ],
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  },
  "storage-driver": "overlay2",
  "storage-opts": [
    "overlay2.override_kernel_check=true"
  ]
}
```

重启 Docker：
```bash
sudo systemctl daemon-reload
sudo systemctl restart docker
```

---

## 三、Docker 基础命令

### 3.1 镜像命令

```bash
# 搜索镜像
docker search nginx

# 拉取镜像
docker pull nginx:latest

# 列出本地镜像
docker images

# 查看镜像详情
docker inspect nginx:latest

# 删除镜像
docker rmi nginx:latest

# 为镜像打标签
docker tag nginx:latest myrepo/nginx:v1.0

# 推送镜像到仓库
docker push myrepo/nginx:v1.0

# 保存镜像为文件
docker save nginx:latest -o nginx.tar

# 从文件加载镜像
docker load -i nginx.tar
```

### 3.2 容器命令

```bash
# 创建并运行容器
docker run -d --name my-nginx -p 80:80 nginx:latest

# 列出运行中的容器
docker ps

# 列出所有容器
docker ps -a

# 查看容器详情
docker inspect my-nginx

# 查看容器日志
docker logs -f my-nginx

# 进入容器
docker exec -it my-nginx /bin/bash

# 停止容器
docker stop my-nginx

# 启动容器
docker start my-nginx

# 重启容器
docker restart my-nginx

# 删除容器
docker rm my-nginx

# 查看容器资源使用
docker stats my-nginx
```

### 3.3 常用选项

| 选项 | 说明 |
|------|------|
| `-d` | 后台运行 |
| `-it` | 交互式终端 |
| `-p` | 端口映射 |
| `-v` | 数据卷挂载 |
| `-e` | 环境变量 |
| `--name` | 容器名称 |
| `--rm` | 容器退出时自动删除 |
| `--restart` | 重启策略 |

---

## 四、Dockerfile 编写

### 4.1 Dockerfile 基础

创建 `Dockerfile`：

```dockerfile
# 基础镜像
FROM golang:1.21-alpine AS builder

# 工作目录
WORKDIR /app

# 复制文件
COPY go.mod go.sum ./

# 下载依赖
RUN go mod download

# 复制源代码
COPY . .

# 构建应用
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o app cmd/main.go

# 最终镜像
FROM alpine:latest

# 安装 ca-certificates
RUN apk --no-cache add ca-certificates

WORKDIR /root/

# 复制构建好的应用
COPY --from=builder /app/app .

# 暴露端口
EXPOSE 8080

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# 启动应用
CMD ["./app"]
```

### 4.2 Dockerfile 指令详解

| 指令 | 说明 | 示例 |
|------|------|------|
| `FROM` | 基础镜像 | `FROM ubuntu:20.04` |
| `RUN` | 执行命令 | `RUN apt-get update` |
| `COPY` | 复制文件 | `COPY . /app` |
| `ADD` | 复制文件（支持 URL） | `ADD app.tar.gz /app` |
| `WORKDIR` | 设置工作目录 | `WORKDIR /app` |
| `ENV` | 设置环境变量 | `ENV PORT=8080` |
| `EXPOSE` | 暴露端口 | `EXPOSE 8080` |
| `CMD` | 默认命令 | `CMD ["./app"]` |
| `ENTRYPOINT` | 入口点 | `ENTRYPOINT ["./app"]` |
| `VOLUME` | 数据卷 | `VOLUME ["/data"]` |
| `USER` | 运行用户 | `USER app` |
| `LABEL` | 标签 | `LABEL version="1.0"` |

### 4.3 最佳实践

```dockerfile
# 1. 使用具体的基础镜像版本
FROM golang:1.21-alpine3.18

# 2. 减少层数
RUN apt-get update && \
    apt-get install -y curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# 3. 使用多阶段构建
FROM golang:1.21 AS builder
WORKDIR /app
COPY . .
RUN go build -o app cmd/main.go

FROM alpine:latest
COPY --from=builder /app/app .
CMD ["./app"]

# 4. 使用非 root 用户
RUN useradd -m -u 1000 appuser
USER appuser

# 5. 添加健康检查
HEALTHCHECK --interval=30s CMD curl -f http://localhost:8080/health

# 6. 优化镜像大小
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
```

---

## 五、Docker Compose

### 5.1 docker-compose.yml

```yaml
version: '3.8'

services:
  # 应用服务
  app:
    build: .
    container_name: blog-app
    ports:
      - "8080:8080"
    environment:
      DB_HOST: mysql
      DB_PORT: 3306
      DB_USER: root
      DB_PASSWORD: root
      DB_NAME: blog
      REDIS_HOST: redis
      REDIS_PORT: 6379
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./config:/app/config
      - ./logs:/app/logs
    networks:
      - blog-network
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # MySQL 数据库
  mysql:
    image: mysql:8.0
    container_name: blog-mysql
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: blog
      MYSQL_USER: blog
      MYSQL_PASSWORD: blog123
    ports:
      - "3306:3306"
    volumes:
      - mysql_data:/var/lib/mysql
      - ./sql:/docker-entrypoint-initdb.d
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
    container_name: blog-redis
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
    image: nginx:latest
    container_name: blog-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
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

### 5.2 常用命令

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看服务日志
docker-compose logs -f app

# 进入容器
docker-compose exec app /bin/bash

# 停止服务
docker-compose stop

# 删除服务
docker-compose down

# 重建镜像
docker-compose build

# 查看服务配置
docker-compose config
```

---

## 六、Docker 网络

### 6.1 网络类型

| 类型 | 说明 | 用途 |
|------|------|------|
| **bridge** | 默认网络，容器通过 IP 通信 | 单主机多容器 |
| **host** | 容器使用主机网络 | 性能要求高 |
| **overlay** | 跨主机网络 | Docker Swarm/K8s |
| **none** | 无网络 | 特殊用途 |

### 6.2 创建自定义网络

```bash
# 创建网络
docker network create blog-network

# 列出网络
docker network ls

# 查看网络详情
docker network inspect blog-network

# 连接容器到网络
docker network connect blog-network my-container

# 断开连接
docker network disconnect blog-network my-container

# 删除网络
docker network rm blog-network
```

---

## 七、Docker 数据卷

### 7.1 数据卷类型

```bash
# 创建数据卷
docker volume create my-volume

# 列出数据卷
docker volume ls

# 查看数据卷详情
docker volume inspect my-volume

# 删除数据卷
docker volume rm my-volume

# 挂载数据卷
docker run -v my-volume:/data nginx

# 挂载主机目录
docker run -v /host/path:/container/path nginx

# 只读挂载
docker run -v /host/path:/container/path:ro nginx
```

---

## 八、Docker 最佳实践

### 8.1 镜像优化

1. **使用官方基础镜像**
2. **减少层数**
3. **清理缓存**
4. **使用多阶段构建**
5. **最小化镜像大小**

### 8.2 安全实践

```dockerfile
# 使用非 root 用户
RUN useradd -m -u 1000 appuser
USER appuser

# 扫描漏洞
docker scan myimage:latest

# 签名镜像
docker trust sign myimage:latest
```

### 8.3 性能优化

```dockerfile
# 使用 .dockerignore
# 避免不必要的文件复制

# 使用缓存
# 将变化频繁的指令放在后面

# 使用轻量级基础镜像
FROM alpine:latest  # 而不是 ubuntu:latest
```

---

## 九、总结

Docker 是现代应用开发和部署的必备工具。关键要点：

1. **理解核心概念**：镜像、容器、仓库
2. **掌握基础命令**：run、ps、logs 等
3. **编写高效的 Dockerfile**：多阶段构建、层优化
4. **使用 Docker Compose**：简化多容器管理
5. **遵循最佳实践**：安全、性能、可维护性

---

## 参考资源

- [Docker 官方文档](https://docs.docker.com/)
- [Docker Hub](https://hub.docker.com/)
- [Dockerfile 最佳实践](https://docs.docker.com/develop/develop-images/dockerfile_best-practices/)
