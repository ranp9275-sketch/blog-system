# Nginx 基础：高性能 Web 服务器完全指南

## 前言

Nginx 是一个高性能、轻量级的 Web 服务器和反向代理服务器。本文将深入讲解 Nginx 的核心概念、配置方法，以及在实际项目中的应用。

---

## 一、Nginx 基础概念

### 1.1 什么是 Nginx？

Nginx 是一个开源的、高性能的 HTTP 和反向代理服务器，具有以下特点：

- **高性能**：采用事件驱动架构，支持高并发
- **轻量级**：内存占用少，启动快速
- **功能丰富**：支持反向代理、负载均衡、SSL、缓存等
- **稳定可靠**：长期稳定运行
- **易于配置**：配置文件简洁易懂

### 1.2 Nginx vs Apache

| 特性 | Nginx | Apache |
|------|-------|--------|
| **架构** | 事件驱动 | 进程/线程驱动 |
| **并发性能** | 高 | 中等 |
| **内存占用** | 低 | 高 |
| **配置复杂度** | 简单 | 复杂 |
| **功能模块** | 内置 | 可加载 |
| **社区活跃度** | 高 | 中等 |

### 1.3 Nginx 架构

```
┌─────────────────────────────────────┐
│         Master Process              │
│  (管理工作进程、读取配置)           │
└────────────┬────────────────────────┘
             │
    ┌────────┼────────┬────────┐
    ▼        ▼        ▼        ▼
┌────────┐┌────────┐┌────────┐┌────────┐
│Worker 1││Worker 2││Worker 3││Worker 4│
│Process ││Process ││Process ││Process │
└────────┘└────────┘└────────┘└────────┘
```

---

## 二、Nginx 安装和配置

### 2.1 安装 Nginx

**Ubuntu/Debian**
```bash
sudo apt-get update
sudo apt-get install nginx

# 启动 Nginx
sudo systemctl start nginx

# 设置开机自启
sudo systemctl enable nginx

# 检查状态
sudo systemctl status nginx
```

**CentOS/RHEL**
```bash
sudo yum install nginx

sudo systemctl start nginx
sudo systemctl enable nginx
```

**Docker**
```bash
docker run -d \
  --name nginx \
  -p 80:80 \
  -p 443:443 \
  -v /path/to/nginx.conf:/etc/nginx/nginx.conf \
  nginx:latest
```

### 2.2 Nginx 配置文件结构

```
/etc/nginx/
├── nginx.conf              # 主配置文件
├── conf.d/                 # 额外配置目录
│   └── default.conf
├── sites-available/        # 可用的站点配置
│   └── default
├── sites-enabled/          # 启用的站点配置
│   └── default -> ../sites-available/default
└── modules-enabled/        # 启用的模块
```

### 2.3 基础配置

```nginx
# 主配置文件 /etc/nginx/nginx.conf

# 运行 Nginx 的用户
user www-data;

# 工作进程数（通常设置为 CPU 核心数）
worker_processes auto;

# 进程 ID 文件
pid /run/nginx.pid;

# 加载动态模块
include /etc/nginx/modules-enabled/*.conf;

events {
    # 每个工作进程的最大连接数
    worker_connections 768;
    
    # 使用的事件模型
    use epoll;
    
    # 是否一次接受多个连接
    multi_accept on;
}

http {
    # 基础设置
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    
    # 日志格式
    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';
    
    # 访问日志
    access_log /var/log/nginx/access.log main;
    
    # 错误日志
    error_log /var/log/nginx/error.log warn;
    
    # MIME 类型
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss;
    
    # 包含其他配置文件
    include /etc/nginx/conf.d/*.conf;
    include /etc/nginx/sites-enabled/*;
}
```

---

## 三、虚拟主机配置

### 3.1 基础虚拟主机

创建文件 `/etc/nginx/sites-available/blog.conf`：

```nginx
server {
    # 监听端口
    listen 80;
    listen [::]:80;
    
    # 服务器名称
    server_name blog.example.com www.blog.example.com;
    
    # 根目录
    root /var/www/blog;
    
    # 索引文件
    index index.html index.htm;
    
    # 访问日志
    access_log /var/log/nginx/blog_access.log main;
    error_log /var/log/nginx/blog_error.log warn;
    
    # 静态文件缓存
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # 默认位置
    location / {
        try_files $uri $uri/ =404;
    }
}
```

启用虚拟主机：
```bash
sudo ln -s /etc/nginx/sites-available/blog.conf /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 3.2 反向代理配置

```nginx
server {
    listen 80;
    server_name blog.example.com;
    
    # 反向代理到后端应用
    location / {
        proxy_pass http://localhost:8080;
        
        # 传递原始请求信息
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # 缓冲设置
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
    
    # 静态文件直接服务
    location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
        root /var/www/blog/public;
        expires 30d;
    }
}
```

---

## 四、负载均衡

### 4.1 上游服务器配置

```nginx
# 定义上游服务器组
upstream backend {
    # 最少连接算法
    least_conn;
    
    # 服务器列表
    server backend1.example.com:8080 weight=5;
    server backend2.example.com:8080 weight=3;
    server backend3.example.com:8080 weight=2;
    
    # 健康检查
    keepalive 32;
}

server {
    listen 80;
    server_name blog.example.com;
    
    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 4.2 负载均衡算法

| 算法 | 说明 | 用途 |
|------|------|------|
| **轮询** | 依次分配请求 | 默认算法，服务器性能相同 |
| **weight** | 按权重分配 | 服务器性能不同 |
| **least_conn** | 最少连接 | 长连接应用 |
| **ip_hash** | 根据 IP 哈希 | 会话保持 |
| **random** | 随机选择 | 均衡分散 |

---

## 五、SSL/TLS 配置

### 5.1 获取 SSL 证书

使用 Let's Encrypt 和 Certbot：

```bash
# 安装 Certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot certonly --nginx -d blog.example.com

# 自动续期
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### 5.2 HTTPS 配置

```nginx
# 重定向 HTTP 到 HTTPS
server {
    listen 80;
    server_name blog.example.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS 服务器
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    
    server_name blog.example.com;
    
    # SSL 证书
    ssl_certificate /etc/letsencrypt/live/blog.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/blog.example.com/privkey.pem;
    
    # SSL 配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;
    
    # HSTS
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # 反向代理
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 六、性能优化

### 6.1 缓存配置

```nginx
# 定义缓存路径
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=my_cache:10m 
                 max_size=1g inactive=60m use_temp_path=off;

server {
    listen 80;
    server_name blog.example.com;
    
    # 启用缓存
    location / {
        proxy_cache my_cache;
        proxy_cache_valid 200 302 10m;
        proxy_cache_valid 404 1m;
        proxy_cache_use_stale error timeout invalid_header updating;
        
        # 缓存状态头
        add_header X-Cache-Status $upstream_cache_status;
        
        proxy_pass http://backend;
    }
    
    # 跳过缓存
    location ~ ^/(admin|api/auth) {
        proxy_pass http://backend;
        proxy_cache off;
    }
}
```

### 6.2 连接优化

```nginx
http {
    # 连接超时
    keepalive_timeout 65;
    
    # TCP 优化
    tcp_nopush on;
    tcp_nodelay on;
    
    # 工作进程优化
    worker_processes auto;
    worker_rlimit_nofile 65535;
    
    events {
        worker_connections 10000;
        use epoll;
        multi_accept on;
    }
}
```

### 6.3 压缩优化

```nginx
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml text/javascript 
           application/json application/javascript application/xml+rss 
           application/rss+xml font/truetype font/opentype 
           application/vnd.ms-fontobject image/svg+xml;
gzip_disable "msie6";
```

---

## 七、常见问题排查

### 7.1 检查配置文件

```bash
# 检查配置文件语法
sudo nginx -t

# 显示详细信息
sudo nginx -T

# 查看加载的配置
sudo nginx -T | grep -A 20 "server {"
```

### 7.2 查看日志

```bash
# 实时查看访问日志
tail -f /var/log/nginx/access.log

# 实时查看错误日志
tail -f /var/log/nginx/error.log

# 查看特定 IP 的请求
grep "192.168.1.100" /var/log/nginx/access.log

# 统计请求数
wc -l /var/log/nginx/access.log
```

### 7.3 常见错误

**502 Bad Gateway**
- 后端服务未运行
- 后端服务超时
- 反向代理配置错误

**504 Gateway Timeout**
- 后端服务响应缓慢
- 增加 proxy_read_timeout

**413 Request Entity Too Large**
- 请求体过大
- 增加 client_max_body_size

---

## 八、总结

Nginx 是现代 Web 应用的必备组件，通过合理配置可以显著提升应用性能和可靠性。关键要点：

1. **理解架构**：事件驱动、高并发
2. **配置优化**：根据实际需求调整参数
3. **监控日志**：及时发现和解决问题
4. **安全第一**：配置 SSL/TLS、防火墙规则
5. **持续改进**：定期审查和优化配置

---

## 参考资源

- [Nginx 官方文档](http://nginx.org/en/docs/)
- [Nginx 配置最佳实践](https://github.com/h5bp/server-configs-nginx)
- [Let's Encrypt 官方网站](https://letsencrypt.org/)
