# 项目规划：技术文章撰写与博客管理系统开发

## 第一部分：技术文章规划

### 1. 运维 (Operations)
*   **标题**: 2025年云原生运维演进：从 AIOps 到智能可观测性
*   **核心内容**: 
    *   混合云与异构架构下的运维挑战。
    *   AIOps 的实际应用：如何利用 AI 优化容器资源配置。
    *   可观测性 2.0：超越监控，实现深度链路追踪与自动故障修复。
*   **关键词**: 云原生, AIOps, 可观测性, Kubernetes, 自动化运维。

### 2. MySQL
*   **标题**: MySQL 9.0 时代：向量支持与高性能架构实践
*   **核心内容**:
    *   MySQL 9.0 新特性：VECTOR 类型及其在 AI 检索中的应用。
    *   MySQL 8.4 LTS 的性能优化：EXPLAIN ANALYZE 实战。
    *   大规模表环境下的稳定性陷阱与规避策略。
*   **关键词**: MySQL 9.0, 向量数据库, 性能优化, InnoDB, 数据库架构。

### 3. Golang
*   **标题**: Go 1.24 深度解析：Swiss Tables 与运行时性能飞跃
*   **核心内容**:
    *   Go 1.24 运行时优化：基于 Swiss Tables 的原生 Map 实现。
    *   安全增强：`os.Root` 目录限制文件系统操作。
    *   泛型类型别名的完全支持及其对架构设计的影响。
*   **关键词**: Golang 1.24, Swiss Tables, 泛型, 并发编程, 性能调优。

### 4. Python
*   **标题**: Python 3.13/3.14 革命：迈向无 GIL 的高性能时代
*   **核心内容**:
    *   Free-threading (PEP 703) 详解：如何开启并利用多核性能。
    *   Copy-and-Patch JIT 编译器：原理与性能基准测试。
    *   Python 3.14 前瞻：延迟注解评估与多解释器支持。
*   **关键词**: Python 3.13, GIL, JIT, 异步编程, 性能优化。

---

## 第二部分：博客管理系统架构设计

### 1. 技术栈
*   **后端**: Golang (Gin 框架) + GORM (MySQL 驱动)
*   **前端**: Vue 3 + Vite + Tailwind CSS + Element Plus (UI 库)
*   **数据库**: MySQL 8.0+

### 2. 核心功能
*   **文章管理**: 支持 Markdown 编辑、分类、标签、发布/草稿状态。
*   **用户认证**: 基于 JWT 的登录管理。
*   **仪表盘**: 统计文章数量、分类分布等。
*   **视觉风格**: 现代简约风格，适配移动端。

### 3. 数据库设计 (初步)
*   `users`: id, username, password, created_at
*   `articles`: id, title, content, summary, category_id, status, created_at, updated_at
*   `categories`: id, name, created_at
*   `tags`: id, name
*   `article_tags`: article_id, tag_id
