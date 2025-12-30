# CI/CD 基础：从代码提交到自动部署

## 前言

在现代软件开发中，**持续集成（CI）和持续部署（CD）** 已成为提高开发效率和代码质量的必要手段。本文将深入讲解 CI/CD 的核心概念、实现原理，并通过实际案例展示如何构建完整的 CI/CD 流水线。

---

## 一、CI/CD 核心概念

### 1.1 什么是 CI/CD？

**持续集成（Continuous Integration, CI）**
- 开发人员频繁（每天多次）将代码集成到共享仓库
- 每次集成都触发自动化构建和测试
- 快速发现和修复集成问题
- 减少"集成地狱"现象

**持续部署（Continuous Deployment, CD）**
- 自动将通过测试的代码部署到生产环境
- 实现快速、频繁的版本发布
- 降低部署风险
- 加快功能上线速度

**持续交付（Continuous Delivery, CD）**
- 自动将代码部署到预发布环境
- 手动触发生产环境部署
- 在 CI 和完全自动化部署之间的平衡

### 1.2 CI/CD 的优势

| 优势 | 说明 |
|------|------|
| **快速反馈** | 代码问题立即被发现和修复 |
| **降低风险** | 小的、频繁的部署比大的、偶发的部署风险更低 |
| **提高效率** | 自动化减少手动操作，加快发布速度 |
| **提升质量** | 自动化测试确保代码质量 |
| **团队协作** | 标准化流程促进团队沟通 |

### 1.3 CI/CD 流程图

```
┌─────────────┐
│ 开发者提交  │
│   代码      │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│  触发 CI 流水线  │
│  (Git Hook)      │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  代码检出        │
│  (Checkout)      │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  构建            │
│  (Build)         │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  单元测试        │
│  (Unit Test)     │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  代码质量分析    │
│  (SonarQube)     │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  集成测试        │
│  (Integration)   │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  构建镜像        │
│  (Docker Build)  │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  推送镜像        │
│  (Push Registry) │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  部署到预发布    │
│  (Staging)       │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  E2E 测试        │
│  (E2E Test)      │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  部署到生产      │
│  (Production)    │
└──────────────────┘
```

---

## 二、CI/CD 工具生态

### 2.1 主流 CI/CD 工具

| 工具 | 特点 | 适用场景 |
|------|------|---------|
| **Jenkins** | 开源、高度可定制、插件丰富 | 大型企业、复杂流程 |
| **GitLab CI** | 原生集成 GitLab、配置简单 | GitLab 用户 |
| **GitHub Actions** | 原生集成 GitHub、免费额度充足 | GitHub 项目 |
| **CircleCI** | SaaS 服务、易于使用 | 中小型团队 |
| **Travis CI** | 开源项目友好、配置简单 | 开源项目 |
| **ArgoCD** | GitOps、Kubernetes 原生 | K8s 部署 |

### 2.2 工具对比

**Jenkins**
- 优点：功能强大、社区活跃、插件丰富
- 缺点：需要自建、维护成本高
- 适合：大型企业、复杂流程

**GitHub Actions**
- 优点：原生集成、免费、易于使用
- 缺点：功能相对简单
- 适合：GitHub 用户、开源项目

**GitLab CI**
- 优点：原生集成、功能完整
- 缺点：需要 GitLab 账户
- 适合：GitLab 用户

---

## 三、GitHub Actions 实战

### 3.1 基础概念

**Workflow（工作流）**
- 由一个或多个 Job 组成
- 由事件触发
- 定义在 `.github/workflows/` 目录下

**Job（任务）**
- 工作流中的独立单位
- 在 Runner 上执行
- 可以并行或顺序执行

**Step（步骤）**
- Job 中的单个操作
- 可以是 Action 或 Shell 命令
- 顺序执行

**Action（动作）**
- 可复用的代码单元
- 由社区提供
- 简化常见操作

### 3.2 创建第一个 Workflow

创建文件 `.github/workflows/ci.yml`：

```yaml
name: CI Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Go
      uses: actions/setup-go@v4
      with:
        go-version: '1.21'
    
    - name: Build
      run: go build -v ./...
    
    - name: Run tests
      run: go test -v ./...
    
    - name: Run linter
      uses: golangci/golangci-lint-action@v3
```

### 3.3 完整的 CI/CD Pipeline

```yaml
name: Full CI/CD Pipeline

on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]
  pull_request:
    branches: [ main ]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # 测试任务
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      
      - name: Cache Go modules
        uses: actions/cache@v3
        with:
          path: ~/go/pkg/mod
          key: ${{ runner.os }}-go-${{ hashFiles('**/go.sum') }}
          restore-keys: |
            ${{ runner.os }}-go-
      
      - name: Run tests
        run: go test -v -race -coverprofile=coverage.out ./...
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage.out

  # 代码质量分析
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Go
        uses: actions/setup-go@v4
        with:
          go-version: '1.21'
      
      - name: golangci-lint
        uses: golangci/golangci-lint-action@v3
        with:
          version: latest

  # 构建和推送镜像
  build:
    needs: [test, quality]
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    permissions:
      contents: read
      packages: write
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2
      
      - name: Log in to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=semver,pattern={{version}}
            type=sha
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # 部署任务
  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to production
        run: |
          echo "Deploying to production..."
          # 这里添加实际的部署命令
```

---

## 四、Jenkins 实战

### 4.1 Jenkins 基础设置

**安装 Jenkins**

```bash
# Docker 方式
docker run -d -p 8080:8080 -p 50000:50000 \
  -v jenkins_home:/var/jenkins_home \
  jenkins/jenkins:lts

# 访问 http://localhost:8080
```

### 4.2 创建 Pipeline Job

创建 `Jenkinsfile`：

```groovy
pipeline {
    agent any
    
    environment {
        REGISTRY = 'docker.io'
        IMAGE_NAME = 'yourusername/blog-backend'
        IMAGE_TAG = "${BUILD_NUMBER}"
    }
    
    stages {
        stage('Checkout') {
            steps {
                git 'https://github.com/yourusername/blog-backend.git'
            }
        }
        
        stage('Build') {
            steps {
                sh 'go build -v ./...'
            }
        }
        
        stage('Test') {
            steps {
                sh 'go test -v -race ./...'
            }
        }
        
        stage('Code Quality') {
            steps {
                sh 'golangci-lint run ./...'
            }
        }
        
        stage('Build Image') {
            steps {
                sh '''
                    docker build -t ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} .
                    docker tag ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} ${REGISTRY}/${IMAGE_NAME}:latest
                '''
            }
        }
        
        stage('Push Image') {
            steps {
                sh '''
                    docker login -u ${DOCKER_USERNAME} -p ${DOCKER_PASSWORD}
                    docker push ${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}
                    docker push ${REGISTRY}/${IMAGE_NAME}:latest
                '''
            }
        }
        
        stage('Deploy') {
            steps {
                sh '''
                    kubectl set image deployment/blog-backend \
                    blog-backend=${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG} \
                    -n production
                '''
            }
        }
    }
    
    post {
        always {
            cleanWs()
        }
        failure {
            emailext(
                subject: "Build Failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}",
                body: "Build failed. Check console output at ${env.BUILD_URL}",
                to: "${env.CHANGE_AUTHOR_EMAIL}"
            )
        }
    }
}
```

---

## 五、最佳实践

### 5.1 CI/CD 设计原则

1. **快速反馈**：构建应在 10 分钟内完成
2. **自动化优先**：尽可能自动化所有步骤
3. **可重复性**：相同输入应产生相同输出
4. **可追溯性**：记录所有构建和部署信息
5. **安全第一**：保护敏感信息和密钥

### 5.2 常见最佳实践

**1. 分支策略**
```
main（生产）
  ↑
  │ (Pull Request)
  │
develop（开发）
  ↑
  │ (Feature Branch)
  │
feature/xxx（功能分支）
```

**2. 自动化测试**
- 单元测试覆盖率 > 80%
- 集成测试覆盖关键流程
- E2E 测试覆盖用户场景

**3. 代码质量**
- 使用 SonarQube 进行代码分析
- 设置质量门禁
- 代码审查（Code Review）

**4. 安全扫描**
- 依赖安全扫描（SAST）
- 容器镜像扫描
- 密钥检测

### 5.3 故障处理

**构建失败处理**
```yaml
# 自动重试
- name: Build with retry
  uses: nick-invision/retry@v2
  with:
    timeout_minutes: 10
    max_attempts: 3
    command: go build ./...

# 失败通知
- name: Notify on failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    text: 'Build failed!'
```

---

## 六、总结

CI/CD 是现代软件开发的标准实践，能够显著提高开发效率和代码质量。关键要点：

1. **CI/CD 的核心价值**：快速反馈、降低风险、提高效率
2. **选择合适的工具**：根据项目规模和需求选择
3. **自动化优先**：最大化自动化程度
4. **持续改进**：定期优化流水线
5. **安全第一**：保护代码和部署安全

通过实施完整的 CI/CD 流水线，您的团队将能够更快速、更安全地交付高质量的软件。

---

## 参考资源

- [GitHub Actions 官方文档](https://docs.github.com/en/actions)
- [Jenkins 官方网站](https://www.jenkins.io/)
- [GitLab CI/CD 文档](https://docs.gitlab.com/ee/ci/)
- [CI/CD 最佳实践指南](https://martinfowler.com/articles/continuousIntegration.html)
