# Kubernetes 基础：容器编排平台完全指南

## 前言

Kubernetes（K8s）是一个开源的容器编排平台，用于自动化容器的部署、扩展和管理。本文将深入讲解 K8s 的核心概念、架构、基本对象和常用命令。

---

## 一、Kubernetes 核心概念

### 1.1 什么是 Kubernetes？

Kubernetes 是一个生产级别的容器编排平台，提供：

- **自动化部署**：自动部署和重新部署容器
- **自我修复**：自动重启失败的容器
- **负载均衡**：自动分配流量
- **自动扩展**：根据负载自动扩展
- **存储编排**：自动挂载存储系统
- **声明式配置**：通过 YAML 文件声明期望状态

### 1.2 Kubernetes vs Docker Swarm

| 特性 | Kubernetes | Docker Swarm |
|------|-----------|-------------|
| **学习曲线** | 陡峭 | 平缓 |
| **功能完整性** | 完整 | 基础 |
| **社区生态** | 非常活跃 | 一般 |
| **生产就绪** | 是 | 是 |
| **可扩展性** | 极好 | 好 |
| **市场占有率** | 主导 | 小众 |

### 1.3 Kubernetes 架构

```
┌─────────────────────────────────────────────────┐
│         Kubernetes Cluster                      │
│  ┌─────────────────────────────────────────┐   │
│  │      Control Plane (Master)             │   │
│  │  ┌──────────────────────────────────┐   │   │
│  │  │  API Server                      │   │   │
│  │  │  etcd (数据存储)                 │   │   │
│  │  │  Scheduler (调度器)              │   │   │
│  │  │  Controller Manager (控制器)     │   │   │
│  │  └──────────────────────────────────┘   │   │
│  └─────────────────────────────────────────┘   │
│                     │                           │
│        ┌────────────┼────────────┐             │
│        ▼            ▼            ▼             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │  Node 1  │ │  Node 2  │ │  Node 3  │      │
│  │ (kubelet)│ │ (kubelet)│ │ (kubelet)│      │
│  │ (kube-  │ │ (kube-  │ │ (kube-  │      │
│  │  proxy) │ │  proxy) │ │  proxy) │      │
│  └──────────┘ └──────────┘ └──────────┘      │
│                                                │
└─────────────────────────────────────────────────┘
```

---

## 二、Kubernetes 安装

### 2.1 安装 kubectl

**macOS**
```bash
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/darwin/amd64/kubectl"
chmod +x ./kubectl
sudo mv ./kubectl /usr/local/bin/kubectl
```

**Linux**
```bash
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
chmod +x kubectl
sudo mv kubectl /usr/local/bin/
```

**验证安装**
```bash
kubectl version --client
```

### 2.2 安装 Minikube（本地开发）

```bash
# macOS
brew install minikube

# Linux
curl -LO https://github.com/kubernetes/minikube/releases/download/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube

# 启动 Minikube
minikube start

# 验证
kubectl cluster-info
```

### 2.3 安装完整的 Kubernetes 集群

**使用 kubeadm**

```bash
# 在所有节点上安装 kubeadm、kubelet、kubectl
sudo apt-get update
sudo apt-get install -y kubeadm kubelet kubectl

# 在 Master 节点上初始化
sudo kubeadm init --pod-network-cidr=10.244.0.0/16

# 配置 kubectl
mkdir -p $HOME/.kube
sudo cp -i /etc/kubernetes/admin.conf $HOME/.kube/config
sudo chown $(id -u):$(id -g) $HOME/.kube/config

# 安装网络插件（Flannel）
kubectl apply -f https://raw.githubusercontent.com/coreos/flannel/master/Documentation/kube-flannel.yml

# 在 Worker 节点上加入集群
sudo kubeadm join <master-ip>:6443 --token <token> --discovery-token-ca-cert-hash sha256:<hash>
```

---

## 三、Kubernetes 基本对象

### 3.1 Pod（最小单位）

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: blog-pod
  namespace: default
  labels:
    app: blog
spec:
  containers:
  - name: blog-app
    image: myregistry/blog-app:latest
    ports:
    - containerPort: 8080
    env:
    - name: DB_HOST
      value: "mysql"
    resources:
      requests:
        memory: "128Mi"
        cpu: "100m"
      limits:
        memory: "512Mi"
        cpu: "500m"
```

### 3.2 Deployment（部署）

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: blog-deployment
  labels:
    app: blog
spec:
  replicas: 3
  selector:
    matchLabels:
      app: blog
  template:
    metadata:
      labels:
        app: blog
    spec:
      containers:
      - name: blog-app
        image: myregistry/blog-app:latest
        ports:
        - containerPort: 8080
        env:
        - name: DB_HOST
          value: "mysql-service"
        resources:
          requests:
            memory: "128Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 5
```

### 3.3 Service（服务）

```yaml
apiVersion: v1
kind: Service
metadata:
  name: blog-service
spec:
  type: ClusterIP
  selector:
    app: blog
  ports:
  - protocol: TCP
    port: 80
    targetPort: 8080
```

### 3.4 ConfigMap（配置）

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: blog-config
data:
  REDIS_HOST: redis-service
  REDIS_PORT: "6379"
  LOG_LEVEL: "info"
```

### 3.5 Secret（密钥）

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: blog-secrets
type: Opaque
data:
  DB_PASSWORD: YmxvZzEyMw==  # base64 编码的 blog123
  REDIS_PASSWORD: cGFzc3dvcmQ=  # base64 编码的 password
```

### 3.6 Ingress（入口）

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: blog-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
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
              number: 80
```

---

## 四、常用 kubectl 命令

### 4.1 集群信息

```bash
# 查看集群信息
kubectl cluster-info

# 查看节点
kubectl get nodes

# 查看节点详情
kubectl describe node <node-name>

# 查看集群版本
kubectl version
```

### 4.2 资源管理

```bash
# 列出资源
kubectl get pods
kubectl get deployments
kubectl get services
kubectl get all

# 查看资源详情
kubectl describe pod <pod-name>
kubectl describe deployment <deployment-name>

# 创建资源
kubectl apply -f deployment.yaml

# 删除资源
kubectl delete pod <pod-name>
kubectl delete deployment <deployment-name>

# 编辑资源
kubectl edit deployment <deployment-name>

# 查看资源 YAML
kubectl get deployment <deployment-name> -o yaml
```

### 4.3 Pod 操作

```bash
# 查看 Pod 日志
kubectl logs <pod-name>
kubectl logs -f <pod-name>  # 实时日志

# 进入 Pod
kubectl exec -it <pod-name> -- /bin/bash

# 端口转发
kubectl port-forward <pod-name> 8080:8080

# 复制文件
kubectl cp <pod-name>:/path/to/file ./local/path
```

### 4.4 扩展和更新

```bash
# 扩展副本数
kubectl scale deployment <deployment-name> --replicas=5

# 更新镜像
kubectl set image deployment/<deployment-name> \
  <container-name>=<new-image>:latest

# 查看更新状态
kubectl rollout status deployment/<deployment-name>

# 回滚更新
kubectl rollout undo deployment/<deployment-name>

# 查看更新历史
kubectl rollout history deployment/<deployment-name>
```

---

## 五、命名空间和 RBAC

### 5.1 命名空间

```bash
# 创建命名空间
kubectl create namespace production

# 列出命名空间
kubectl get namespaces

# 在特定命名空间中操作
kubectl get pods -n production
kubectl apply -f deployment.yaml -n production

# 设置默认命名空间
kubectl config set-context --current --namespace=production
```

### 5.2 RBAC（基于角色的访问控制）

```yaml
# ServiceAccount
apiVersion: v1
kind: ServiceAccount
metadata:
  name: blog-sa
  namespace: production

---
# Role
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: blog-role
  namespace: production
rules:
- apiGroups: [""]
  resources: ["pods", "services"]
  verbs: ["get", "list", "watch"]

---
# RoleBinding
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: blog-rolebinding
  namespace: production
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: Role
  name: blog-role
subjects:
- kind: ServiceAccount
  name: blog-sa
  namespace: production
```

---

## 六、存储和持久化

### 6.1 PersistentVolume（PV）

```yaml
apiVersion: v1
kind: PersistentVolume
metadata:
  name: blog-pv
spec:
  capacity:
    storage: 10Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: standard
  hostPath:
    path: /data/blog
```

### 6.2 PersistentVolumeClaim（PVC）

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: blog-pvc
spec:
  accessModes:
    - ReadWriteOnce
  storageClassName: standard
  resources:
    requests:
      storage: 5Gi
```

### 6.3 在 Pod 中使用

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: blog-pod
spec:
  containers:
  - name: blog-app
    image: myregistry/blog-app:latest
    volumeMounts:
    - name: data
      mountPath: /data
  volumes:
  - name: data
    persistentVolumeClaim:
      claimName: blog-pvc
```

---

## 七、最佳实践

### 7.1 资源请求和限制

```yaml
spec:
  containers:
  - name: app
    resources:
      requests:
        memory: "128Mi"
        cpu: "100m"
      limits:
        memory: "512Mi"
        cpu: "500m"
```

### 7.2 健康检查

```yaml
spec:
  containers:
  - name: app
    livenessProbe:
      httpGet:
        path: /health
        port: 8080
      initialDelaySeconds: 30
      periodSeconds: 10
    readinessProbe:
      httpGet:
        path: /ready
        port: 8080
      initialDelaySeconds: 10
      periodSeconds: 5
```

### 7.3 安全策略

```yaml
spec:
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsReadOnlyRootFilesystem: true
  containers:
  - name: app
    securityContext:
      allowPrivilegeEscalation: false
      capabilities:
        drop:
        - ALL
```

---

## 八、总结

Kubernetes 是现代云原生应用的标准平台。关键要点：

1. **理解架构**：Master 和 Node 的角色
2. **掌握基本对象**：Pod、Deployment、Service 等
3. **学习 kubectl**：命令行工具的使用
4. **遵循最佳实践**：资源限制、健康检查、安全策略
5. **持续学习**：K8s 生态非常丰富

---

## 参考资源

- [Kubernetes 官方文档](https://kubernetes.io/docs/)
- [kubectl 命令参考](https://kubernetes.io/docs/reference/kubectl/)
- [Kubernetes 最佳实践](https://kubernetes.io/docs/concepts/configuration/overview/)
