# Nginx 实战：构建高可用的反向代理和负载均衡系统

## 前言

本文将通过实际案例，展示如何使用 Nginx 构建一个高可用、高性能的反向代理和负载均衡系统，包括多种负载均衡算法、健康检查、会话保持等高级特性。

---

## 一、完整的生产级配置

### 1.1 项目架构

```
┌──────────────────────────────────────────────────┐
│              Internet                            │
└──────────────────┬───────────────────────────────┘
                   │
┌──────────────────▼───────────────────────────────┐
│         Nginx Load Balancer                      │
│  (反向代理 + 负载均衡 + SSL)                    │
└──────────────────┬───────────────────────────────┘
                   │
        ┌──────────┼──────────┬──────────┐
        ▼          ▼          ▼          ▼
    ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
    │Backend │ │Backend │ │Backend │ │Backend │
    │  App 1 │ │  App 2 │ │  App 3 │ │  App 4 │
    └────────┘ └────────┘ └────────┘ └────────┘
        │          │          │          │
        └──────────┼──────────┼──────────┘
                   │
        ┌──────────▼──────────┐
        │   MySQL Database    │
        │   Redis Cache       │
        └─────────────────────┘
```

### 1.2 完整的 Nginx 配置

创建 `/etc/nginx/nginx.conf`：

```nginx
user www-data;
worker_processes auto;
worker_rlimit_nofile 65535;
pid /run/nginx.pid;

events {
    worker_connections 10000;
    use epoll;
    multi_accept on;
}

http {
    # 基础配置
    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;
    
    # 日志格式
    log_format main '$remote_addr - $remote_user [$time_local] '
                    '"$request" $status $body_bytes_sent '
                    '"$http_referer" "$http_user_agent" '
                    '"$http_x_forwarded_for" $request_time';
    
    log_format upstream_log '$remote_addr - $remote_user [$time_local] '
                           '"$request" $status $body_bytes_sent '
                           '"$http_referer" "$http_user_agent" '
                           'upstream: $upstream_addr '
                           'upstream_status: $upstream_status '
                           'request_time: $request_time '
                           'upstream_response_time: $upstream_response_time';
    
    access_log /var/log/nginx/access.log main;
    error_log /var/log/nginx/error.log warn;
    
    # MIME 类型
    include /etc/nginx/mime.types;
    default_type application/octet-stream;
    
    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_min_length 1000;
    gzip_types text/plain text/css text/xml text/javascript 
               application/json application/javascript application/xml+rss;
    
    # 缓存配置
    proxy_cache_path /var/cache/nginx/blog 
                     levels=1:2 
                     keys_zone=blog_cache:100m 
                     max_size=10g 
                     inactive=60m 
                     use_temp_path=off;
    
    # 上游服务器组 - 应用服务器
    upstream blog_backend {
        # 最少连接算法
        least_conn;
        
        # 健康检查参数
        keepalive 32;
        
        # 服务器列表
        server 192.168.1.10:8080 weight=5 max_fails=3 fail_timeout=30s;
        server 192.168.1.11:8080 weight=5 max_fails=3 fail_timeout=30s;
        server 192.168.1.12:8080 weight=3 max_fails=3 fail_timeout=30s;
        server 192.168.1.13:8080 weight=2 max_fails=3 fail_timeout=30s backup;
    }
    
    # 上游服务器组 - API 服务器
    upstream blog_api {
        ip_hash;  # 基于 IP 的会话保持
        
        server 192.168.1.20:8081 max_fails=3 fail_timeout=30s;
        server 192.168.1.21:8081 max_fails=3 fail_timeout=30s;
    }
    
    # 速率限制
    limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=api:10m rate=100r/m;
    limit_conn_zone $binary_remote_addr zone=addr:10m;
    
    # 重定向 HTTP 到 HTTPS
    server {
        listen 80;
        listen [::]:80;
        server_name blog.example.com www.blog.example.com;
        
        # Let's Encrypt 验证
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        
        # 其他请求重定向到 HTTPS
        location / {
            return 301 https://$server_name$request_uri;
        }
    }
    
    # HTTPS 服务器
    server {
        listen 443 ssl http2;
        listen [::]:443 ssl http2;
        
        server_name blog.example.com www.blog.example.com;
        
        # SSL 证书
        ssl_certificate /etc/letsencrypt/live/blog.example.com/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/blog.example.com/privkey.pem;
        
        # SSL 配置
        ssl_protocols TLSv1.2 TLSv1.3;
        ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
        ssl_prefer_server_ciphers off;
        ssl_session_cache shared:SSL:10m;
        ssl_session_timeout 10m;
        ssl_session_tickets off;
        
        # OCSP Stapling
        ssl_stapling on;
        ssl_stapling_verify on;
        ssl_trusted_certificate /etc/letsencrypt/live/blog.example.com/chain.pem;
        
        # 安全头
        add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-XSS-Protection "1; mode=block" always;
        add_header Referrer-Policy "strict-origin-when-cross-origin" always;
        
        # 日志
        access_log /var/log/nginx/blog_access.log upstream_log;
        error_log /var/log/nginx/blog_error.log warn;
        
        # 根目录
        root /var/www/blog;
        
        # 静态文件
        location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
            expires 30d;
            add_header Cache-Control "public, immutable";
            access_log off;
        }
        
        # 健康检查端点
        location /health {
            access_log off;
            return 200 "healthy\n";
            add_header Content-Type text/plain;
        }
        
        # API 路由
        location /api/ {
            limit_req zone=api burst=200 nodelay;
            limit_conn addr 10;
            
            proxy_pass http://blog_api;
            proxy_http_version 1.1;
            
            # 请求头
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header X-Forwarded-Host $server_name;
            proxy_set_header Connection "";
            
            # 超时
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
            
            # 缓冲
            proxy_buffering on;
            proxy_buffer_size 4k;
            proxy_buffers 8 4k;
            proxy_busy_buffers_size 8k;
            
            # 不缓存 API
            proxy_cache off;
        }
        
        # 主应用路由
        location / {
            limit_req zone=general burst=20 nodelay;
            
            # 缓存配置
            proxy_cache blog_cache;
            proxy_cache_valid 200 10m;
            proxy_cache_valid 404 1m;
            proxy_cache_use_stale error timeout invalid_header updating;
            proxy_cache_bypass $http_cache_control;
            add_header X-Cache-Status $upstream_cache_status;
            
            proxy_pass http://blog_backend;
            proxy_http_version 1.1;
            
            # 请求头
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_set_header Connection "";
            
            # 超时
            proxy_connect_timeout 60s;
            proxy_send_timeout 60s;
            proxy_read_timeout 60s;
            
            # 缓冲
            proxy_buffering on;
            proxy_buffer_size 4k;
            proxy_buffers 8 4k;
        }
        
        # 错误页面
        error_page 404 /404.html;
        error_page 500 502 503 504 /50x.html;
        
        location = /50x.html {
            root /usr/share/nginx/html;
        }
    }
    
    # 监控端点
    server {
        listen 8080;
        listen [::]:8080;
        
        server_name localhost;
        
        location /nginx_status {
            stub_status on;
            access_log off;
            allow 127.0.0.1;
            allow 192.168.1.0/24;
            deny all;
        }
    }
}
```

---

## 二、高级特性

### 2.1 会话保持

**基于 Cookie 的会话保持**

```nginx
upstream backend {
    # 使用 sticky 模块（需要编译支持）
    sticky cookie srv_id expires=1h domain=.example.com path=/ secure httponly;
    
    server 192.168.1.10:8080;
    server 192.168.1.11:8080;
    server 192.168.1.12:8080;
}

server {
    listen 443 ssl http2;
    server_name blog.example.com;
    
    location / {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

**基于 IP 的会话保持**

```nginx
upstream backend {
    ip_hash;  # 根据客户端 IP 哈希
    
    server 192.168.1.10:8080;
    server 192.168.1.11:8080;
    server 192.168.1.12:8080;
}
```

### 2.2 动态上游服务器

使用 Lua 脚本动态更新上游服务器：

```nginx
http {
    upstream dynamic_backend {
        server 192.168.1.10:8080;
        keepalive 32;
    }
    
    server {
        listen 80;
        
        location /api {
            access_by_lua_block {
                local backends = {
                    "192.168.1.10:8080",
                    "192.168.1.11:8080",
                    "192.168.1.12:8080"
                }
                
                -- 选择后端
                local selected = backends[math.random(#backends)]
                ngx.var.backend = selected
            }
            
            proxy_pass http://$backend;
        }
    }
}
```

### 2.3 灰度发布

```nginx
upstream old_version {
    server 192.168.1.10:8080;
    server 192.168.1.11:8080;
}

upstream new_version {
    server 192.168.1.20:8080;
}

server {
    listen 80;
    server_name blog.example.com;
    
    location / {
        # 10% 流量到新版本，90% 到旧版本
        if ($request_time > 0) {
            set $backend "old_version";
        }
        
        if ($cookie_test_user = "true") {
            set $backend "new_version";
        }
        
        # 随机选择 10% 流量
        if ($random < 0.1) {
            set $backend "new_version";
        }
        
        proxy_pass http://$backend;
    }
}
```

---

## 三、监控和日志分析

### 3.1 Prometheus 监控

创建 `/etc/nginx/conf.d/monitoring.conf`：

```nginx
server {
    listen 8080;
    server_name localhost;
    
    location /metrics {
        access_log off;
        
        content_by_lua_block {
            local function get_stats()
                local stats = ngx.var.upstream_addr .. " "
                stats = stats .. ngx.var.upstream_status .. " "
                stats = stats .. ngx.var.upstream_response_time
                return stats
            end
            
            ngx.say("# HELP nginx_requests_total Total requests")
            ngx.say("# TYPE nginx_requests_total counter")
            ngx.say("nginx_requests_total{} " .. ngx.var.request_count)
        }
    }
}
```

### 3.2 日志分析脚本

创建 `analyze_logs.sh`：

```bash
#!/bin/bash

LOG_FILE="/var/log/nginx/access.log"

echo "=== Nginx 日志分析 ==="
echo ""

echo "1. 请求总数"
wc -l $LOG_FILE

echo ""
echo "2. 请求来源 IP Top 10"
awk '{print $1}' $LOG_FILE | sort | uniq -c | sort -rn | head -10

echo ""
echo "3. 请求 URL Top 10"
awk '{print $7}' $LOG_FILE | sort | uniq -c | sort -rn | head -10

echo ""
echo "4. 响应状态码分布"
awk '{print $9}' $LOG_FILE | sort | uniq -c | sort -rn

echo ""
echo "5. 平均响应时间"
awk '{sum+=$NF; count++} END {print sum/count}' $LOG_FILE

echo ""
echo "6. 最慢的请求 Top 5"
awk '{print $NF, $7}' $LOG_FILE | sort -rn | head -5

echo ""
echo "7. 错误请求 (4xx, 5xx)"
awk '$9 >= 400 {print $9, $7}' $LOG_FILE | sort | uniq -c | sort -rn
```

---

## 四、故障排查和优化

### 4.1 常见问题

**问题 1：502 Bad Gateway**

```bash
# 检查后端服务
curl http://192.168.1.10:8080/health

# 检查 Nginx 错误日志
tail -f /var/log/nginx/error.log

# 检查网络连接
netstat -an | grep 8080
```

**问题 2：高延迟**

```nginx
# 增加缓冲区
proxy_buffer_size 4k;
proxy_buffers 8 4k;

# 增加超时时间
proxy_connect_timeout 60s;
proxy_send_timeout 60s;
proxy_read_timeout 60s;

# 启用 TCP 优化
tcp_nopush on;
tcp_nodelay on;
```

**问题 3：内存占用过高**

```nginx
# 减少工作进程连接数
events {
    worker_connections 5000;  # 从 10000 降低到 5000
}

# 减少缓冲区大小
proxy_buffer_size 2k;
proxy_buffers 4 2k;
```

### 4.2 性能优化

**1. 启用 HTTP/2**

```nginx
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
}
```

**2. 启用 OCSP Stapling**

```nginx
ssl_stapling on;
ssl_stapling_verify on;
ssl_trusted_certificate /path/to/chain.pem;
resolver 8.8.8.8 8.8.4.4;
```

**3. 优化 Gzip**

```nginx
gzip on;
gzip_comp_level 6;
gzip_min_length 1000;
gzip_types text/plain text/css application/json application/javascript;
```

---

## 五、高可用部署

### 5.1 Keepalived + Nginx

创建 `/etc/keepalived/keepalived.conf`：

```
global_defs {
    router_id NGINX_MASTER
}

vrrp_script check_nginx {
    script "/usr/local/bin/check_nginx.sh"
    interval 3
    weight -20
    fall 3
    rise 2
}

vrrp_instance VI_1 {
    state MASTER
    interface eth0
    virtual_router_id 51
    priority 100
    advert_int 1
    
    authentication {
        auth_type PASS
        auth_pass 1111
    }
    
    virtual_ipaddress {
        192.168.1.100/24
    }
    
    track_script {
        check_nginx
    }
}
```

创建 `/usr/local/bin/check_nginx.sh`：

```bash
#!/bin/bash

if ! pgrep nginx > /dev/null; then
    systemctl start nginx
    sleep 2
    if ! pgrep nginx > /dev/null; then
        exit 1
    fi
fi

exit 0
```

---

## 六、总结

通过完整的 Nginx 配置，我们实现了：

1. **高可用**：多个后端服务器、健康检查、故障转移
2. **高性能**：缓存、压缩、连接优化
3. **安全性**：SSL/TLS、安全头、速率限制
4. **可观测性**：详细日志、监控指标

这样的配置能够支撑大规模、高并发的生产环境。

---

## 参考资源

- [Nginx 官方文档](http://nginx.org/en/docs/)
- [Nginx 模块文档](http://nginx.org/en/docs/http/ngx_http_upstream_module.html)
- [Keepalived 官方网站](https://www.keepalived.org/)
