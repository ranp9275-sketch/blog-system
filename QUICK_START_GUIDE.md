# 🚀 快速开始指南

## 一、博客系统部署

### 1.1 环境要求

```bash
# 系统要求
- Linux/Mac/Windows (WSL2)
- Docker & Docker Compose
- Go 1.20+
- Node.js 18+
- MySQL 8.0+
- Redis 6.0+
```

### 1.2 快速启动（Docker）

```bash
# 克隆项目
git clone <your-repo-url>
cd blog-system

# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 访问博客
# 前端: http://localhost:3000
# API: http://localhost:8080
# 管理后台: http://localhost:3000/admin
```

### 1.3 本地开发

```bash
# 后端启动
cd blog-backend
go mod download
go run cmd/main.go

# 前端启动（新终端）
cd blog-system/client
npm install
npm run dev
```

---

## 二、文章导入

### 2.1 导入所有 18 篇文章

所有文章已保存在 `/home/ubuntu/articles/` 目录：

```bash
# 文章列表
articles/
├── 01_aiops_basics.md                    # AIOps 基础
├── 02_observability_guide.md             # 可观测性指南
├── 03_intelligent_alerting.md            # 智能告警系统
├── 04_automated_recovery.md              # 自动化故障恢复
├── 13_rag_langchain_aiops.md             # RAG + LangChain 在 AIOps 中的应用
├── 14_langchain_complete_guide.md        # LangChain 完全指南
├── 05_cicd_basics.md                     # CI/CD 基础
├── 06_cicd_practice.md                   # CI/CD 实战
├── 07_nginx_basics.md                    # Nginx 基础
├── 08_nginx_practice.md                  # Nginx 实战
├── 09_docker_basics.md                   # Docker 基础
├── 10_docker_practice.md                 # Docker 实战
├── 11_kubernetes_basics.md               # Kubernetes 基础
├── 12_kubernetes_practice.md             # Kubernetes 实战
├── 02_mysql_vector.md                    # MySQL 9.0 向量支持
├── 03_golang_swiss_tables.md             # Go 1.24 Swiss Tables
├── 04_python_nogil.md                    # Python 无 GIL
└── 01_ops_aiops.md                       # 云原生运维演进
```

### 2.2 通过管理后台导入

**步骤 1：登陆管理后台**
```
访问: http://localhost:3000/admin
使用管理员账户登陆
```

**步骤 2：创建分类**
```
分类管理 → 新建分类

推荐分类：
- 运维和基础设施
- 编程语言和数据库
- DevOps 和容器化
```

**步骤 3：创建标签**
```
标签管理 → 新建标签

推荐标签：
- AIOps
- 可观测性
- 故障恢复
- CI/CD
- Nginx
- Docker
- Kubernetes
- MySQL
- Golang
- Python
- LangChain
- RAG
```

**步骤 4：导入文章**
```
文章管理 → 新建文章

1. 复制文章内容（从 Markdown 文件）
2. 填写标题和描述
3. 上传配图（对应的 PNG 文件）
4. 选择分类和标签
5. 发布
```

### 2.3 通过 API 批量导入

```bash
# 创建导入脚本
cat > import_articles.sh << 'EOF'
#!/bin/bash

ARTICLES_DIR="/home/ubuntu/articles"
API_URL="http://localhost:8080/api"
TOKEN="your-admin-token"

for article in $ARTICLES_DIR/*.md; do
    title=$(head -1 "$article" | sed 's/^# //')
    content=$(cat "$article")
    
    curl -X POST "$API_URL/articles" \
        -H "Authorization: Bearer $TOKEN" \
        -H "Content-Type: application/json" \
        -d "{
            \"title\": \"$title\",
            \"content\": \"$content\",
            \"status\": \"published\"
        }"
done
EOF

chmod +x import_articles.sh
./import_articles.sh
```

---

## 三、系统配置

### 3.1 环境变量

```bash
# .env 文件
MYSQL_HOST=localhost
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=password
MYSQL_DATABASE=blog

REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

JWT_SECRET=your-secret-key
JWT_EXPIRE=24h

API_PORT=8080
API_HOST=0.0.0.0

# 可选：图像生成 API
IMAGE_API_KEY=your-api-key
IMAGE_API_URL=https://api.example.com
```

### 3.2 数据库初始化

```bash
# 自动初始化（Docker）
docker-compose up -d

# 手动初始化
mysql -h localhost -u root -p blog < schema.sql
redis-cli FLUSHDB
```

### 3.3 首次运行

```bash
# 创建管理员账户
curl -X POST http://localhost:8080/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{
        "username": "admin",
        "password": "your-password",
        "email": "admin@example.com"
    }'

# 登陆获取 Token
curl -X POST http://localhost:8080/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{
        "username": "admin",
        "password": "your-password"
    }'
```

---

## 四、功能使用

### 4.1 发布文章

```
1. 登陆管理后台
2. 文章管理 → 新建文章
3. 填写标题、描述、内容
4. 上传配图
5. 选择分类和标签
6. 点击"发布"
```

### 4.2 管理评论

```
1. 文章详情页 → 评论区
2. 查看和回复评论
3. 删除不当评论
4. 设置评论审核
```

### 4.3 查看统计

```
1. 仪表盘 → 统计信息
2. 查看浏览量
3. 查看评论数
4. 查看访问趋势
```

### 4.4 搜索文章

```
1. 首页搜索框
2. 输入关键词
3. 按分类/标签筛选
4. 查看搜索结果
```

---

## 五、性能优化

### 5.1 缓存配置

```go
// Redis 缓存策略
- 文章列表：5 分钟
- 文章详情：10 分钟
- 分类列表：1 小时
- 标签列表：1 小时
- 评论列表：5 分钟
```

### 5.2 数据库优化

```sql
-- 创建索引
CREATE INDEX idx_article_status ON articles(status);
CREATE INDEX idx_article_category ON articles(category_id);
CREATE INDEX idx_article_created_at ON articles(created_at);
CREATE INDEX idx_comment_article ON comments(article_id);
```

### 5.3 前端优化

```
- 图片懒加载
- 代码分割
- 缓存策略
- CDN 加速
```

---

## 六、部署到生产

### 6.1 使用 Kubernetes

```bash
# 创建命名空间
kubectl create namespace blog

# 部署应用
kubectl apply -f k8s/ -n blog

# 查看状态
kubectl get pods -n blog
kubectl get svc -n blog

# 查看日志
kubectl logs -f deployment/blog-backend -n blog
```

### 6.2 使用 Docker Swarm

```bash
# 初始化集群
docker swarm init

# 部署服务
docker stack deploy -c docker-compose.prod.yml blog

# 查看服务
docker service ls
docker service logs blog_backend
```

### 6.3 配置 Nginx 反向代理

```nginx
upstream blog_api {
    server backend:8080;
}

upstream blog_frontend {
    server frontend:3000;
}

server {
    listen 80;
    server_name blog.example.com;

    # API 路由
    location /api {
        proxy_pass http://blog_api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 前端路由
    location / {
        proxy_pass http://blog_frontend;
        proxy_set_header Host $host;
    }
}
```

### 6.4 SSL 证书

```bash
# 使用 Let's Encrypt
certbot certonly --standalone -d blog.example.com

# 在 Nginx 中配置
ssl_certificate /etc/letsencrypt/live/blog.example.com/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/blog.example.com/privkey.pem;
```

---

## 七、监控和日志

### 7.1 应用监控

```bash
# Prometheus 指标
- http_requests_total
- http_request_duration_seconds
- db_query_duration_seconds
- cache_hit_ratio
```

### 7.2 日志收集

```bash
# ELK Stack 配置
- Elasticsearch：存储日志
- Logstash：收集和处理日志
- Kibana：可视化日志
```

### 7.3 告警规则

```yaml
# Prometheus 告警
- 请求错误率 > 5%
- 响应时间 > 1000ms
- 数据库连接数 > 80%
- 缓存命中率 < 50%
```

---

## 八、常见问题

### Q1：如何修改文章？

```
1. 登陆管理后台
2. 文章管理 → 选择文章
3. 编辑内容
4. 点击"保存"
```

### Q2：如何删除文章？

```
1. 登陆管理后台
2. 文章管理 → 选择文章
3. 点击"删除"
4. 确认删除
```

### Q3：如何备份数据？

```bash
# 备份 MySQL
mysqldump -h localhost -u root -p blog > backup.sql

# 备份 Redis
redis-cli --rdb /path/to/dump.rdb

# 恢复 MySQL
mysql -h localhost -u root -p blog < backup.sql
```

### Q4：如何扩展功能？

```
1. 修改数据库模型（schema）
2. 添加 API 接口
3. 更新前端组件
4. 测试和部署
```

---

## 九、技术支持

### 常用命令

```bash
# 查看日志
docker-compose logs -f backend
docker-compose logs -f frontend

# 重启服务
docker-compose restart backend
docker-compose restart frontend

# 清理缓存
docker-compose exec redis redis-cli FLUSHDB

# 进入容器
docker-compose exec backend bash
docker-compose exec mysql mysql -u root -p blog
```

### 调试模式

```bash
# 启用调试日志
export DEBUG=true
go run cmd/main.go

# 查看详细的 SQL 查询
export SQL_DEBUG=true
```

---

## 十、下一步

1. ✅ 部署博客系统
2. ✅ 导入 18 篇文章
3. ✅ 配置域名和 SSL
4. ✅ 推广到技术社区
5. ✅ 收集用户反馈
6. ✅ 持续优化和更新

---

**祝您的博客平台运营顺利！** 🎉

如有任何问题，请参考完整的项目文档或联系技术支持。
