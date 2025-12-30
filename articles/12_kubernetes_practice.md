# Kubernetes 实战：构建生产级容器编排系统

## 前言

本文将通过一个完整的博客项目，展示如何在 Kubernetes 上部署、管理和扩展应用，包括多副本部署、自动扩展、滚动更新、监控告警等生产级特性。

---

## 一、完整的 Kubernetes 部署

### 1.1 项目架构

```
┌─────────────────────────────────────────────────┐
│         Kubernetes Cluster                      │
│  ┌─────────────────────────────────────────┐   │
│  │      Ingress (nginx-ingress)            │   │
│  │      blog.example.com                   │   │
│  └────────────────────┬────────────────────┘   │
│                       │                         │
│  ┌────────────────────▼────────────────────┐   │
│  │      Service (blog-service)             │   │
│  │      Load Balancer                      │   │
│  └────────────────────┬────────────────────┘   │
│                       │                         │
│        ┌──────────────┼──────────────┐         │
│        ▼              ▼              ▼         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Pod 1    │  │ Pod 2    │  │ Pod 3    │    │
│  │ (Replica)│  │ (Replica)│  │ (Replica)│    │
│  └──────────┘  └──────────┘  └──────────┘    │
│                                                │
│  ┌─────────────────────────────────────────┐  │
│  │      StatefulSet (MySQL)                │  │
│  │      mysql-0, mysql-1, mysql-2          │  │
│  └─────────────────────────────────────────┘  │
│                                                │
│  ┌─────────────────────────────────────────┐  │
│  │      DaemonSet (Redis)                  │  │
│  │      redis-xxx (每个节点一个)           │  │
│  └─────────────────────────────────────────┘  │
│                                                │
└─────────────────────────────────────────────────┘
```

### 1.2 命名空间和资源配置

创建 `namespace.yaml`：

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: blog
  labels:
    name: blog

---
apiVersion: v1
kind: Namespace
metadata:
  name: monitoring
  labels:
    name: monitoring
```

创建 `resource-quota.yaml`：

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: blog-quota
  namespace: blog
spec:
  hard:
    requests.cpu: "10"
    requests.memory: "20Gi"
    limits.cpu: "20"
    limits.memory: "40Gi"
    pods: "100"
    services: "10"
    persistentvolumeclaims: "5"
```

---

## 二、应用部署配置

### 2.1 ConfigMap 和 Secret

创建 `configmap.yaml`：

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: blog-config
  namespace: blog
data:
  LOG_LEVEL: "info"
  REDIS_HOST: "redis-service"
  REDIS_PORT: "6379"
  CACHE_TTL: "3600"
  PAGINATION_SIZE: "20"

---
apiVersion: v1
kind: ConfigMap
metadata:
  name: nginx-config
  namespace: blog
data:
  nginx.conf: |
    user nginx;
    worker_processes auto;
    error_log /var/log/nginx/error.log warn;
    pid /var/run/nginx.pid;
    
    events {
      worker_connections 10000;
      use epoll;
    }
    
    http {
      include /etc/nginx/mime.types;
      default_type application/octet-stream;
      
      log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';
      
      access_log /var/log/nginx/access.log main;
      
      sendfile on;
      tcp_nopush on;
      tcp_nodelay on;
      keepalive_timeout 65;
      gzip on;
      
      upstream blog_backend {
        server blog-service:8080;
      }
      
      server {
        listen 80;
        server_name _;
        
        location / {
          proxy_pass http://blog_backend;
          proxy_set_header Host $host;
          proxy_set_header X-Real-IP $remote_addr;
          proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
      }
    }
```

创建 `secret.yaml`：

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: blog-secrets
  namespace: blog
type: Opaque
stringData:
  DB_HOST: mysql-service
  DB_PORT: "3306"
  DB_USER: blog
  DB_PASSWORD: "blog123"
  DB_NAME: blog
  JWT_SECRET: "your-secret-key-here"
  REDIS_PASSWORD: "redis123"
```

### 2.2 应用 Deployment

创建 `app-deployment.yaml`：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: blog-app
  namespace: blog
  labels:
    app: blog-app
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
      app: blog-app
  template:
    metadata:
      labels:
        app: blog-app
        version: v1
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "8080"
        prometheus.io/path: "/metrics"
    spec:
      serviceAccountName: blog-app
      securityContext:
        runAsNonRoot: true
        runAsUser: 1000
        fsReadOnlyRootFilesystem: true
      
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
                  - blog-app
              topologyKey: kubernetes.io/hostname
      
      containers:
      - name: blog-app
        image: myregistry/blog-app:latest
        imagePullPolicy: Always
        ports:
        - name: http
          containerPort: 8080
          protocol: TCP
        - name: metrics
          containerPort: 9090
          protocol: TCP
        
        env:
        - name: LOG_LEVEL
          valueFrom:
            configMapKeyRef:
              name: blog-config
              key: LOG_LEVEL
        - name: REDIS_HOST
          valueFrom:
            configMapKeyRef:
              name: blog-config
              key: REDIS_HOST
        - name: DB_HOST
          valueFrom:
            secretKeyRef:
              name: blog-secrets
              key: DB_HOST
        - name: DB_USER
          valueFrom:
            secretKeyRef:
              name: blog-secrets
              key: DB_USER
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: blog-secrets
              key: DB_PASSWORD
        - name: DB_NAME
          valueFrom:
            secretKeyRef:
              name: blog-secrets
              key: DB_NAME
        
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
        - name: cache
          mountPath: /app/cache
      
      volumes:
      - name: tmp
        emptyDir: {}
      - name: cache
        emptyDir:
          sizeLimit: 1Gi
      
      terminationGracePeriodSeconds: 30

---
apiVersion: v1
kind: Service
metadata:
  name: blog-service
  namespace: blog
  labels:
    app: blog-app
spec:
  type: ClusterIP
  selector:
    app: blog-app
  ports:
  - name: http
    port: 8080
    targetPort: http
    protocol: TCP
  - name: metrics
    port: 9090
    targetPort: metrics
    protocol: TCP

---
apiVersion: v1
kind: ServiceAccount
metadata:
  name: blog-app
  namespace: blog
```

### 2.3 HPA（水平自动扩展）

创建 `hpa.yaml`：

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: blog-app-hpa
  namespace: blog
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: blog-app
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 2
        periodSeconds: 60
      selectPolicy: Max
```

---

## 三、数据库部署

### 3.1 MySQL StatefulSet

创建 `mysql-statefulset.yaml`：

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: mysql-config
  namespace: blog
data:
  my.cnf: |
    [mysqld]
    skip-name-resolve
    character-set-server=utf8mb4
    collation-server=utf8mb4_unicode_ci
    default-storage-engine=InnoDB
    max_connections=1000
    max_allowed_packet=256M
    log-bin=/var/log/mysql/mysql-bin.log
    binlog-format=ROW
    server-id=1

---
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: mysql
  namespace: blog
spec:
  serviceName: mysql-service
  replicas: 3
  selector:
    matchLabels:
      app: mysql
  template:
    metadata:
      labels:
        app: mysql
    spec:
      containers:
      - name: mysql
        image: mysql:8.0
        ports:
        - containerPort: 3306
          name: mysql
        env:
        - name: MYSQL_ROOT_PASSWORD
          valueFrom:
            secretKeyRef:
              name: blog-secrets
              key: DB_PASSWORD
        - name: MYSQL_DATABASE
          valueFrom:
            secretKeyRef:
              name: blog-secrets
              key: DB_NAME
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 1000m
            memory: 2Gi
        volumeMounts:
        - name: mysql-storage
          mountPath: /var/lib/mysql
        - name: mysql-config
          mountPath: /etc/mysql/conf.d
      volumes:
      - name: mysql-config
        configMap:
          name: mysql-config
  volumeClaimTemplates:
  - metadata:
      name: mysql-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      storageClassName: standard
      resources:
        requests:
          storage: 10Gi

---
apiVersion: v1
kind: Service
metadata:
  name: mysql-service
  namespace: blog
spec:
  clusterIP: None
  selector:
    app: mysql
  ports:
  - port: 3306
    targetPort: 3306
```

### 3.2 Redis Deployment

创建 `redis-deployment.yaml`：

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: redis
  namespace: blog
spec:
  replicas: 1
  selector:
    matchLabels:
      app: redis
  template:
    metadata:
      labels:
        app: redis
    spec:
      containers:
      - name: redis
        image: redis:7-alpine
        command:
          - redis-server
          - "--requirepass"
          - "redis123"
          - "--maxmemory"
          - "512mb"
          - "--maxmemory-policy"
          - "allkeys-lru"
        ports:
        - containerPort: 6379
        resources:
          requests:
            cpu: 100m
            memory: 256Mi
          limits:
            cpu: 500m
            memory: 512Mi
        volumeMounts:
        - name: redis-storage
          mountPath: /data
      volumes:
      - name: redis-storage
        emptyDir: {}

---
apiVersion: v1
kind: Service
metadata:
  name: redis-service
  namespace: blog
spec:
  selector:
    app: redis
  ports:
  - port: 6379
    targetPort: 6379
```

---

## 四、Ingress 和网络配置

创建 `ingress.yaml`：

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: blog-ingress
  namespace: blog
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
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
            name: blog-service
            port:
              number: 8080
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: blog-service
            port:
              number: 8080
```

---

## 五、监控和日志

### 5.1 Prometheus 监控

创建 `prometheus-config.yaml`：

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
    - job_name: 'blog-app'
      kubernetes_sd_configs:
      - role: pod
        namespaces:
          names:
          - blog
      relabel_configs:
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_scrape]
        action: keep
        regex: true
      - source_labels: [__meta_kubernetes_pod_annotation_prometheus_io_path]
        action: replace
        target_label: __metrics_path__
        regex: (.+)
      - source_labels: [__address__, __meta_kubernetes_pod_annotation_prometheus_io_port]
        action: replace
        regex: ([^:]+)(?::\d+)?;(\d+)
        replacement: $1:$2
        target_label: __address__
```

### 5.2 告警规则

创建 `alerting-rules.yaml`：

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: alerting-rules
  namespace: monitoring
data:
  alert.rules: |
    groups:
    - name: blog
      interval: 30s
      rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        annotations:
          summary: "High error rate detected"
      
      - alert: HighMemoryUsage
        expr: container_memory_usage_bytes / container_spec_memory_limit_bytes > 0.9
        for: 5m
        annotations:
          summary: "High memory usage detected"
      
      - alert: PodCrashLooping
        expr: rate(kube_pod_container_status_restarts_total[15m]) > 0
        for: 5m
        annotations:
          summary: "Pod is crash looping"
```

---

## 六、部署和更新策略

### 6.1 蓝绿部署

```bash
# 部署新版本（绿）
kubectl apply -f blog-app-v2-deployment.yaml

# 验证新版本
kubectl get pods -l app=blog-app,version=v2

# 切换流量到新版本
kubectl patch service blog-service -p '{"spec":{"selector":{"version":"v2"}}}'

# 删除旧版本
kubectl delete deployment blog-app-v1
```

### 6.2 金丝雀部署

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: blog-app-canary
  namespace: blog
spec:
  replicas: 1  # 只有 1 个副本
  selector:
    matchLabels:
      app: blog-app
      version: v2-canary
  template:
    metadata:
      labels:
        app: blog-app
        version: v2-canary
    spec:
      containers:
      - name: blog-app
        image: myregistry/blog-app:v2-canary
        # ... 其他配置
```

---

## 七、部署脚本

创建 `deploy.sh`：

```bash
#!/bin/bash

set -e

ENV=${1:-staging}
VERSION=${2:-latest}

echo "Deploying to $ENV environment..."

# 创建命名空间
kubectl create namespace blog --dry-run=client -o yaml | kubectl apply -f -

# 应用配置
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secret.yaml

# 部署应用
kubectl apply -f app-deployment.yaml
kubectl apply -f mysql-statefulset.yaml
kubectl apply -f redis-deployment.yaml
kubectl apply -f ingress.yaml
kubectl apply -f hpa.yaml

# 等待部署完成
echo "Waiting for deployment to complete..."
kubectl rollout status deployment/blog-app -n blog

echo "Deployment completed!"
kubectl get all -n blog
```

---

## 八、总结

通过完整的 Kubernetes 部署，我们实现了：

1. **高可用**：多副本部署、自动故障转移
2. **自动扩展**：HPA 根据负载自动扩展
3. **滚动更新**：零停机部署
4. **监控告警**：Prometheus + AlertManager
5. **安全隔离**：命名空间、RBAC、网络策略

---

## 参考资源

- [Kubernetes 官方文档](https://kubernetes.io/docs/)
- [Helm Chart 仓库](https://helm.sh/)
- [Kubernetes 最佳实践](https://kubernetes.io/docs/concepts/configuration/overview/)
