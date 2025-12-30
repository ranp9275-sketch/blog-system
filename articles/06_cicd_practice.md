# CI/CD 实战：构建完整的自动化部署流水线

## 前言

本文将通过一个真实的 Golang 博客项目，展示如何从零开始构建一个完整的 CI/CD 流水线，包括代码检查、自动化测试、Docker 镜像构建、以及 Kubernetes 部署。

---

## 一、项目架构

### 1.1 技术栈

```
┌─────────────────────────────────────────────────┐
│            GitHub / GitLab                       │
│         (代码仓库 + 事件触发)                    │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│          CI/CD Pipeline                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Build    │→ │ Test     │→ │ Quality  │      │
│  └──────────┘  └──────────┘  └──────────┘      │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│        Docker Registry                          │
│    (镜像存储和分发)                             │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────┐
│       Kubernetes Cluster                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Staging  │→ │ E2E Test │→ │ Prod     │      │
│  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────┘
```

### 1.2 项目结构

```
blog-backend/
├── .github/
│   └── workflows/
│       ├── ci.yml              # CI 流水线
│       ├── cd.yml              # CD 流水线
│       └── security.yml        # 安全扫描
├── cmd/
│   └── main.go
├── internal/
│   ├── handlers/
│   ├── services/
│   ├── repository/
│   └── models/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── k8s/
│   ├── deployment.yaml
│   ├── service.yaml
│   └── ingress.yaml
├── Dockerfile
├── docker-compose.yml
├── Makefile
└── README.md
```

---

## 二、GitHub Actions 完整流水线

### 2.1 CI 流水线（ci.yml）

```yaml
name: CI Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

env:
  GO_VERSION: '1.21'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # 代码检查
  lint:
    runs-on: ubuntu-latest
    name: Lint Code
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Go
        uses: actions/setup-go@v4
        with:
          go-version: ${{ env.GO_VERSION }}
      
      - name: Run golangci-lint
        uses: golangci/golangci-lint-action@v3
        with:
          version: latest
          args: --timeout=5m
      
      - name: Run gofmt
        run: |
          if [ -n "$(gofmt -s -l .)" ]; then
            echo "Go code is not formatted:"
            gofmt -s -d .
            exit 1
          fi

  # 单元测试
  unit-test:
    runs-on: ubuntu-latest
    name: Unit Tests
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: blog_test
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3
        ports:
          - 3306:3306
      
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd="redis-cli ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Go
        uses: actions/setup-go@v4
        with:
          go-version: ${{ env.GO_VERSION }}
      
      - name: Cache Go modules
        uses: actions/cache@v3
        with:
          path: ~/go/pkg/mod
          key: ${{ runner.os }}-go-${{ hashFiles('**/go.sum') }}
          restore-keys: |
            ${{ runner.os }}-go-
      
      - name: Run unit tests
        env:
          DB_HOST: localhost
          DB_PORT: 3306
          DB_USER: root
          DB_PASSWORD: root
          DB_NAME: blog_test
          REDIS_HOST: localhost
          REDIS_PORT: 6379
        run: |
          go test -v -race -coverprofile=coverage.out ./...
      
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage.out
          flags: unittests
          name: codecov-umbrella

  # 集成测试
  integration-test:
    runs-on: ubuntu-latest
    name: Integration Tests
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: blog_test
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3
        ports:
          - 3306:3306
      
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd="redis-cli ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3
        ports:
          - 6379:6379
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Go
        uses: actions/setup-go@v4
        with:
          go-version: ${{ env.GO_VERSION }}
      
      - name: Run integration tests
        env:
          DB_HOST: localhost
          DB_PORT: 3306
          DB_USER: root
          DB_PASSWORD: root
          DB_NAME: blog_test
          REDIS_HOST: localhost
          REDIS_PORT: 6379
        run: |
          go test -v -race -tags=integration ./tests/integration/...

  # 安全扫描
  security:
    runs-on: ubuntu-latest
    name: Security Scan
    steps:
      - uses: actions/checkout@v3
      
      - name: Run Gosec Security Scanner
        uses: securego/gosec@master
        with:
          args: '-no-fail -fmt json -out gosec-report.json ./...'
      
      - name: Upload Gosec report
        uses: github/codeql-action/upload-sarif@v2
        if: always()
        with:
          sarif_file: gosec-report.json

  # 构建
  build:
    runs-on: ubuntu-latest
    name: Build
    needs: [lint, unit-test, integration-test, security]
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Go
        uses: actions/setup-go@v4
        with:
          go-version: ${{ env.GO_VERSION }}
      
      - name: Build binary
        run: |
          CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
          go build -ldflags="-w -s" \
          -o blog-backend cmd/main.go
      
      - name: Upload artifact
        uses: actions/upload-artifact@v3
        with:
          name: blog-backend
          path: blog-backend
          retention-days: 1
```

### 2.2 CD 流水线（cd.yml）

```yaml
name: CD Pipeline

on:
  push:
    branches: [ main ]
    tags: [ 'v*' ]

env:
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # 构建和推送 Docker 镜像
  build-and-push:
    runs-on: ubuntu-latest
    name: Build and Push Image
    permissions:
      contents: read
      packages: write
    
    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}
    
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
            type=semver,pattern={{major}}.{{minor}}
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}
      
      - name: Build and push Docker image
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # 部署到 Staging 环境
  deploy-staging:
    runs-on: ubuntu-latest
    name: Deploy to Staging
    needs: build-and-push
    environment:
      name: staging
      url: https://staging.blog.example.com
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure kubectl
        run: |
          mkdir -p $HOME/.kube
          echo "${{ secrets.KUBE_CONFIG_STAGING }}" | base64 -d > $HOME/.kube/config
          chmod 600 $HOME/.kube/config
      
      - name: Deploy to Staging
        run: |
          kubectl set image deployment/blog-backend \
            blog-backend=${{ needs.build-and-push.outputs.image-tag }} \
            -n staging
          
          kubectl rollout status deployment/blog-backend -n staging

  # E2E 测试
  e2e-test:
    runs-on: ubuntu-latest
    name: E2E Tests
    needs: deploy-staging
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd tests/e2e
          npm install
      
      - name: Run E2E tests
        env:
          TEST_URL: https://staging.blog.example.com
        run: |
          cd tests/e2e
          npm run test

  # 部署到生产环境
  deploy-production:
    runs-on: ubuntu-latest
    name: Deploy to Production
    needs: [build-and-push, e2e-test]
    environment:
      name: production
      url: https://blog.example.com
    if: github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Configure kubectl
        run: |
          mkdir -p $HOME/.kube
          echo "${{ secrets.KUBE_CONFIG_PROD }}" | base64 -d > $HOME/.kube/config
          chmod 600 $HOME/.kube/config
      
      - name: Deploy to Production
        run: |
          kubectl set image deployment/blog-backend \
            blog-backend=${{ needs.build-and-push.outputs.image-tag }} \
            -n production
          
          kubectl rollout status deployment/blog-backend -n production
      
      - name: Create Release
        uses: actions/create-release@v1
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          tag_name: ${{ github.ref }}
          release_name: Release ${{ github.ref }}
          draft: false
          prerelease: false
      
      - name: Notify Slack
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Deployment to production completed!'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
        if: always()
```

---

## 三、Kubernetes 部署配置

### 3.1 Deployment（deployment.yaml）

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: blog-backend
  namespace: production
  labels:
    app: blog-backend
    version: v1
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: blog-backend
  template:
    metadata:
      labels:
        app: blog-backend
        version: v1
    spec:
      serviceAccountName: blog-backend
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
      containers:
      - name: blog-backend
        image: ghcr.io/yourusername/blog-backend:latest
        imagePullPolicy: Always
        ports:
        - name: http
          containerPort: 8080
          protocol: TCP
        env:
        - name: PORT
          value: "8080"
        - name: ENV
          value: "production"
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: blog-secrets
              key: db-host
        - name: DB_PORT
          valueFrom:
            secretKeyRef:
              name: blog-secrets
              key: db-port
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: blog-secrets
              key: db-user
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: blog-secrets
              key: db-password
        - name: DB_NAME
          valueFrom:
            secretKeyRef:
              name: blog-secrets
              key: db-name
        - name: REDIS_HOST
          valueFrom:
            configMapKeyRef:
              name: blog-config
              key: redis-host
        - name: REDIS_PORT
          valueFrom:
            configMapKeyRef:
              name: blog-config
              key: redis-port
        resources:
          requests:
            cpu: 100m
            memory: 128Mi
          limits:
            cpu: 500m
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: http
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
        securityContext:
          allowPrivilegeEscalation: false
          readOnlyRootFilesystem: true
          capabilities:
            drop:
            - ALL
        volumeMounts:
        - name: tmp
          mountPath: /tmp
      volumes:
      - name: tmp
        emptyDir: {}
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - blog-backend
              topologyKey: kubernetes.io/hostname
```

### 3.2 Service（service.yaml）

```yaml
apiVersion: v1
kind: Service
metadata:
  name: blog-backend
  namespace: production
  labels:
    app: blog-backend
spec:
  type: ClusterIP
  selector:
    app: blog-backend
  ports:
  - name: http
    port: 80
    targetPort: http
    protocol: TCP
```

### 3.3 Ingress（ingress.yaml）

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: blog-backend
  namespace: production
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - blog.example.com
    secretName: blog-tls-cert
  rules:
  - host: blog.example.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: blog-backend
            port:
              number: 80
```

---

## 四、本地开发工作流

### 4.1 Makefile

```makefile
.PHONY: help build test lint run docker-build docker-run clean

help:
	@echo "Available commands:"
	@echo "  make build          - Build the application"
	@echo "  make test           - Run tests"
	@echo "  make lint           - Run linter"
	@echo "  make run            - Run the application"
	@echo "  make docker-build   - Build Docker image"
	@echo "  make docker-run     - Run Docker container"
	@echo "  make clean          - Clean build artifacts"

build:
	CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build -o blog-backend cmd/main.go

test:
	go test -v -race -coverprofile=coverage.out ./...

lint:
	golangci-lint run ./...

run:
	go run cmd/main.go

docker-build:
	docker build -t blog-backend:latest .

docker-run:
	docker-compose up -d

docker-stop:
	docker-compose down

clean:
	rm -f blog-backend coverage.out
	go clean -cache
```

### 4.2 docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
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

  mysql:
    image: mysql:8.0
    environment:
      MYSQL_ROOT_PASSWORD: root
      MYSQL_DATABASE: blog
    ports:
      - "3306:3306"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 3

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3
```

---

## 五、监控和告警

### 5.1 Prometheus 监控

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: prometheus-config
  namespace: monitoring
data:
  prometheus.yml: |
    global:
      scrape_interval: 15s
    scrape_configs:
    - job_name: 'blog-backend'
      static_configs:
      - targets: ['blog-backend.production:8080']
      metrics_path: '/metrics'
```

### 5.2 告警规则

```yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: blog-backend-alerts
  namespace: monitoring
spec:
  groups:
  - name: blog-backend
    interval: 30s
    rules:
    - alert: HighErrorRate
      expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
      for: 5m
      annotations:
        summary: "High error rate detected"
    
    - alert: HighLatency
      expr: histogram_quantile(0.95, http_request_duration_seconds) > 1
      for: 5m
      annotations:
        summary: "High latency detected"
```

---

## 六、总结

通过完整的 CI/CD 流水线，我们实现了：

1. **自动化测试**：确保代码质量
2. **自动化构建**：快速生成可部署的制品
3. **自动化部署**：安全、快速地发布新版本
4. **自动化监控**：及时发现和处理问题

这样的流水线能够显著提高开发效率，同时保证系统的稳定性和可靠性。

---

## 参考资源

- [GitHub Actions 官方文档](https://docs.github.com/en/actions)
- [Kubernetes 官方文档](https://kubernetes.io/docs/)
- [Docker 官方文档](https://docs.docker.com/)
