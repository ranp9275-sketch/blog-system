# 可观测性深度指南：三支柱完全解析

## 摘要

可观测性是现代云原生系统的基石。本文深入讲解可观测性的三支柱（指标、日志、链路追踪），分析各自的特点和应用场景，提供完整的实施指南和最佳实践。

---

## 一、可观测性的三支柱

### 1.1 指标（Metrics）

**定义**

指标是系统状态的量化表示，通常是时间序列数据。

**特点**

```
┌─────────────────────────────────┐
│         指标特点                 │
├─────────────────────────────────┤
│ 时间序列性：有时间戳             │
│ 聚合性：可以聚合和降采样         │
│ 低成本：存储和查询效率高         │
│ 实时性：通常是实时数据           │
│ 可预测：便于趋势分析和预测       │
└─────────────────────────────────┘
```

**指标分类**

```python
# 系统级指标
system_metrics = {
    "cpu_usage": 45.5,              # CPU 使用率 (%)
    "memory_usage": 78.2,           # 内存使用率 (%)
    "disk_io_read": 1024,           # 磁盘读速率 (MB/s)
    "network_in": 512,              # 网络入速率 (Mbps)
}

# 应用级指标
app_metrics = {
    "http_requests_total": 1000000,  # 总请求数
    "http_request_duration_seconds": 0.125,  # 请求延迟
    "http_errors_total": 150,        # 错误总数
    "db_connections_active": 45,     # 活跃数据库连接
}

# 业务指标
business_metrics = {
    "orders_total": 10000,           # 订单总数
    "revenue_total": 500000,         # 收入总额
    "user_signup_rate": 100,         # 用户注册率
    "conversion_rate": 0.05,         # 转化率
}
```

**Prometheus 指标采集**

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'production'
    region: 'us-east-1'

scrape_configs:
  # Kubernetes 节点监控
  - job_name: 'kubernetes-nodes'
    kubernetes_sd_configs:
      - role: node
    relabel_configs:
      - action: labelmap
        regex: __meta_kubernetes_node_label_(.+)
  
  # Pod 监控
  - job_name: 'kubernetes-pods'
    kubernetes_sd_configs:
      - role: pod
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

**自定义指标示例**

```go
package main

import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promhttp"
    "net/http"
)

// 定义自定义指标
var (
    // Counter: 只增不减
    httpRequestsTotal = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "http_requests_total",
            Help: "Total HTTP requests",
        },
        []string{"method", "path", "status"},
    )
    
    // Gauge: 可增可减
    activeConnections = prometheus.NewGauge(
        prometheus.GaugeOpts{
            Name: "active_connections",
            Help: "Number of active connections",
        },
    )
    
    // Histogram: 分布统计
    requestDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name: "request_duration_seconds",
            Help: "Request duration in seconds",
            Buckets: []float64{.001, .01, .1, 1, 10},
        },
        []string{"method", "path"},
    )
)

func init() {
    prometheus.MustRegister(httpRequestsTotal)
    prometheus.MustRegister(activeConnections)
    prometheus.MustRegister(requestDuration)
}

func main() {
    http.HandleFunc("/api/users", func(w http.ResponseWriter, r *http.Request) {
        // 记录请求
        httpRequestsTotal.WithLabelValues(r.Method, "/api/users", "200").Inc()
        
        // 记录请求延迟
        timer := prometheus.NewTimer(
            requestDuration.WithLabelValues(r.Method, "/api/users"),
        )
        defer timer.ObserveDuration()
        
        w.WriteHeader(http.StatusOK)
    })
    
    http.Handle("/metrics", promhttp.Handler())
    http.ListenAndServe(":8080", nil)
}
```

### 1.2 日志（Logs）

**定义**

日志是系统行为的详细记录，包含时间戳、级别、消息和上下文信息。

**日志级别**

```
DEBUG   < INFO   < WARNING < ERROR   < CRITICAL
 ↓        ↓         ↓        ↓         ↓
详细    信息    警告    错误    严重
```

**结构化日志**

```python
import json
import logging
from pythonjsonlogger import jsonlogger

# 配置结构化日志
logger = logging.getLogger()
logHandler = logging.StreamHandler()
formatter = jsonlogger.JsonFormatter()
logHandler.setFormatter(formatter)
logger.addHandler(logHandler)

# 输出结构化日志
logger.info("User login", extra={
    "user_id": 12345,
    "ip_address": "192.168.1.1",
    "login_method": "password",
    "timestamp": "2025-01-15T10:30:45Z",
    "duration_ms": 150
})

# 输出示例
{
    "timestamp": "2025-01-15T10:30:45.123Z",
    "level": "INFO",
    "message": "User login",
    "user_id": 12345,
    "ip_address": "192.168.1.1",
    "login_method": "password",
    "duration_ms": 150
}
```

**ELK Stack 配置**

```yaml
# Logstash 配置
input {
  tcp {
    port => 5000
    codec => json
  }
}

filter {
  # 解析日志
  grok {
    match => { "message" => "%{COMBINEDAPACHELOG}" }
  }
  
  # 提取字段
  mutate {
    add_field => { "[@metadata][index_name]" => "logs-%{+YYYY.MM.dd}" }
  }
  
  # 时间处理
  date {
    match => [ "timestamp", "dd/MMM/yyyy:HH:mm:ss Z" ]
  }
}

output {
  elasticsearch {
    hosts => ["localhost:9200"]
    index => "%{[@metadata][index_name]}"
  }
}
```

**日志查询示例**

```json
// Kibana 查询
{
  "query": {
    "bool": {
      "must": [
        { "match": { "service": "payment-service" } },
        { "match": { "level": "ERROR" } },
        { "range": { "timestamp": { "gte": "now-1h" } } }
      ]
    }
  },
  "aggs": {
    "errors_by_type": {
      "terms": { "field": "error_type.keyword" }
    }
  }
}
```

### 1.3 链路追踪（Traces）

**定义**

链路追踪跟踪请求在分布式系统中的完整路径，帮助理解微服务间的调用关系。

**核心概念**

```
Trace（链路）
  ├── Span（跨度）1: HTTP Request
  │   ├── Span 2: Database Query
  │   ├── Span 3: Cache Lookup
  │   └── Span 4: External API Call
  └── Span 5: HTTP Response
```

**OpenTelemetry 示例**

```python
from opentelemetry import trace, metrics
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor
from flask import Flask

# 配置 Jaeger 导出器
jaeger_exporter = JaegerExporter(
    agent_host_name="localhost",
    agent_port=6831,
)

trace.set_tracer_provider(TracerProvider())
trace.get_tracer_provider().add_span_processor(
    BatchSpanProcessor(jaeger_exporter)
)

# 创建 Flask 应用
app = Flask(__name__)

# 自动化仪表化
FlaskInstrumentor().instrument_app(app)
SQLAlchemyInstrumentor().instrument()

# 手动创建 Span
tracer = trace.get_tracer(__name__)

@app.route("/api/orders", methods=["POST"])
def create_order():
    with tracer.start_as_current_span("create_order") as span:
        # 添加属性
        span.set_attribute("order.id", order_id)
        span.set_attribute("customer.id", customer_id)
        
        # 业务逻辑
        with tracer.start_as_current_span("validate_order"):
            validate_order(order_data)
        
        with tracer.start_as_current_span("save_to_database"):
            save_order(order_data)
        
        with tracer.start_as_current_span("send_notification"):
            send_notification(customer_id)
        
        return {"status": "success"}
```

---

## 二、三支柱的对比与选择

### 2.1 对比分析

| 特性 | 指标 | 日志 | 链路 |
|------|------|------|------|
| 数据量 | 小 | 大 | 中 |
| 存储成本 | 低 | 高 | 中 |
| 查询速度 | 快 | 慢 | 中 |
| 时间精度 | 秒级 | 毫秒级 | 微秒级 |
| 实时性 | 高 | 中 | 高 |
| 聚合能力 | 强 | 弱 | 中 |
| 诊断能力 | 中 | 强 | 强 |

### 2.2 使用场景

**指标适合**
- 系统健康状态监控
- 性能趋势分析
- 容量规划
- 告警和通知

**日志适合**
- 故障根因分析
- 安全审计
- 业务事件追踪
- 详细的调试信息

**链路适合**
- 性能瓶颈定位
- 微服务依赖分析
- 分布式事务追踪
- 用户请求路径分析

---

## 三、可观测性最佳实践

### 3.1 指标命名规范

```
<namespace>_<subsystem>_<name>_<unit>

示例：
http_requests_total{method="GET",path="/api/users"}
database_query_duration_seconds_bucket{le="0.1"}
cache_hit_ratio{cache_name="redis_session"}
kubernetes_pod_memory_usage_bytes{pod="payment-service"}
```

### 3.2 日志采样策略

```python
class LogSampler:
    """日志采样器"""
    
    def __init__(self, sample_rate=0.1):
        self.sample_rate = sample_rate
    
    def should_log(self, log_level, error_rate):
        """决定是否记录日志"""
        # ERROR 级别日志总是记录
        if log_level == "ERROR":
            return True
        
        # 其他级别根据采样率
        if random.random() < self.sample_rate:
            return True
        
        # 高错误率时增加采样
        if error_rate > 0.05:
            return random.random() < self.sample_rate * 2
        
        return False
```

### 3.3 告警规则设计

```yaml
# 告警规则示例
groups:
  - name: application_alerts
    interval: 30s
    rules:
      # 高 CPU 使用率
      - alert: HighCPUUsage
        expr: (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m]))) > 0.8
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "{{ $labels.instance }} CPU 使用率过高"
          description: "CPU 使用率: {{ $value | humanizePercentage }}"
      
      # 高错误率
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "{{ $labels.service }} 错误率过高"
          description: "错误率: {{ $value | humanizePercentage }}"
      
      # 响应时间过长
      - alert: HighLatency
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) > 1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "{{ $labels.service }} 响应时间过长"
          description: "P95 延迟: {{ $value }}s"
```

---

## 四、可观测性平台架构

### 4.1 完整架构

```
┌──────────────────────────────────────────────────────┐
│              应用层（Grafana、Kibana）               │
├──────────────────────────────────────────────────────┤
│              查询层（PromQL、SQL、DSL）              │
├──────────────────────────────────────────────────────┤
│         存储层（TSDB、ES、Jaeger）                   │
├──────────────────────────────────────────────────────┤
│      处理层（Logstash、Telegraf、Collector）        │
├──────────────────────────────────────────────────────┤
│    采集层（Prometheus、Fluentd、Jaeger Agent）      │
├──────────────────────────────────────────────────────┤
│              应用和基础设施                           │
└──────────────────────────────────────────────────────┘
```

### 4.2 Docker Compose 部署

```yaml
version: '3.8'

services:
  # 指标采集和存储
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
  
  # 日志采集
  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:8.0.0
    environment:
      - discovery.type=single-node
    ports:
      - "9200:9200"
    volumes:
      - elasticsearch_data:/usr/share/elasticsearch/data
  
  # 日志处理
  logstash:
    image: docker.elastic.co/logstash/logstash:8.0.0
    ports:
      - "5000:5000"
    volumes:
      - ./logstash.conf:/usr/share/logstash/pipeline/logstash.conf
    depends_on:
      - elasticsearch
  
  # 日志可视化
  kibana:
    image: docker.elastic.co/kibana/kibana:8.0.0
    ports:
      - "5601:5601"
    depends_on:
      - elasticsearch
  
  # 链路追踪
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "6831:6831/udp"
      - "16686:16686"
  
  # 指标可视化
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
    depends_on:
      - prometheus

volumes:
  prometheus_data:
  elasticsearch_data:
  grafana_data:
```

---

## 五、总结

可观测性的三支柱各有特点：

- **指标**：高效、实时、适合监控和告警
- **日志**：详细、灵活、适合故障诊断
- **链路**：全面、深入、适合性能分析

建立完整的可观测性体系需要：

1. 统一的数据采集
2. 规范的数据格式
3. 完善的存储和查询
4. 有效的可视化和告警

---

**关键词**：可观测性、指标、日志、链路追踪、Prometheus、ELK、Jaeger

**推荐工具**：
- Prometheus + Grafana
- ELK Stack
- Jaeger
- OpenTelemetry
