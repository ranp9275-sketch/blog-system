# 自动化故障恢复：从被动应对到主动自愈

## 摘要

自动化故障恢复是现代 AIOps 的核心能力。本文讲解如何设计和实现自动化恢复系统，包括故障检测、恢复策略、安全机制、效果验证等，帮助系统实现自愈能力。

---

## 一、自动化恢复的价值

### 1.1 对比分析

```
传统故障处理流程：
故障发生 (0 min)
    ↓
告警触发 (1 min)
    ↓
人工发现 (5-10 min)
    ↓
问题诊断 (10-30 min)
    ↓
执行恢复 (30-60 min)
    ↓
验证恢复 (60-120 min)

MTTR (平均恢复时间): 60-120 分钟

自动化恢复流程：
故障发生 (0 min)
    ↓
自动检测 (0.5 min)
    ↓
自动诊断 (1 min)
    ↓
自动恢复 (2 min)
    ↓
自动验证 (3 min)

MTTR (平均恢复时间): 3-5 分钟
```

### 1.2 恢复效果

```
自动化恢复的收益：
- MTTR 降低 90%
- 自动恢复率 > 80%
- 人工干预减少 80%
- 业务损失减少 95%
```

---

## 二、自动化恢复系统架构

### 2.1 系统设计

```
┌──────────────────────────────────────────────────┐
│           故障检测层                              │
│  - 异常检测                                      │
│  - 告警触发                                      │
└────────────────┬─────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────┐
│           诊断分析层                              │
│  - 根因分析                                      │
│  - 影响范围评估                                  │
│  - 恢复策略选择                                  │
└────────────────┬─────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────┐
│           权限控制层                              │
│  - 权限验证                                      │
│  - 风险评估                                      │
│  - 人工审批（可选）                              │
└────────────────┬─────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────┐
│           执行层                                  │
│  - 执行恢复操作                                  │
│  - 操作日志记录                                  │
│  - 实时监控                                      │
└────────────────┬─────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────┐
│           验证层                                  │
│  - 故障是否消除                                  │
│  - 系统是否恢复                                  │
│  - 副作用检查                                    │
└────────────────┬─────────────────────────────────┘
                 │
┌────────────────▼─────────────────────────────────┐
│           反馈学习层                              │
│  - 恢复效果评估                                  │
│  - 知识库更新                                    │
│  - 策略优化                                      │
└──────────────────────────────────────────────────┘
```

---

## 三、恢复策略实现

### 3.1 基础恢复策略

```python
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import subprocess
import time

class RecoveryStrategy(ABC):
    """恢复策略基类"""
    
    def __init__(self, name: str, timeout: int = 300):
        self.name = name
        self.timeout = timeout
        self.execution_log = []
    
    @abstractmethod
    def can_execute(self, fault: Dict[str, Any]) -> bool:
        """检查是否可以执行"""
        pass
    
    @abstractmethod
    def execute(self, fault: Dict[str, Any]) -> Dict[str, Any]:
        """执行恢复"""
        pass
    
    @abstractmethod
    def verify(self, fault: Dict[str, Any]) -> bool:
        """验证恢复效果"""
        pass
    
    def log_execution(self, message: str):
        """记录执行日志"""
        self.execution_log.append({
            'timestamp': time.time(),
            'message': message
        })

class PodRestartStrategy(RecoveryStrategy):
    """Pod 重启策略"""
    
    def can_execute(self, fault: Dict[str, Any]) -> bool:
        """检查是否可以重启 Pod"""
        # 只有当 Pod 处于异常状态时才能重启
        return fault.get('pod_status') in ['CrashLoopBackOff', 'Error', 'Unknown']
    
    def execute(self, fault: Dict[str, Any]) -> Dict[str, Any]:
        """执行 Pod 重启"""
        pod_name = fault['pod_name']
        namespace = fault['namespace']
        
        try:
            # 删除 Pod
            cmd = f"kubectl delete pod {pod_name} -n {namespace}"
            result = subprocess.run(cmd, shell=True, capture_output=True, timeout=self.timeout)
            
            self.log_execution(f"删除 Pod: {pod_name}")
            
            # 等待 Pod 重启
            time.sleep(10)
            
            return {
                'status': 'success',
                'message': f'Pod {pod_name} 已重启',
                'execution_log': self.execution_log
            }
        
        except Exception as e:
            self.log_execution(f"错误: {str(e)}")
            return {
                'status': 'failed',
                'message': f'Pod 重启失败: {str(e)}',
                'execution_log': self.execution_log
            }
    
    def verify(self, fault: Dict[str, Any]) -> bool:
        """验证 Pod 是否恢复"""
        pod_name = fault['pod_name']
        namespace = fault['namespace']
        
        cmd = f"kubectl get pod {pod_name} -n {namespace} -o jsonpath='{{.status.phase}}'"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        
        status = result.stdout.strip()
        return status == 'Running'

class ScaleUpStrategy(RecoveryStrategy):
    """自动扩容策略"""
    
    def can_execute(self, fault: Dict[str, Any]) -> bool:
        """检查是否可以扩容"""
        # 当 CPU/内存使用率过高时可以扩容
        return fault.get('resource_usage', 0) > 80
    
    def execute(self, fault: Dict[str, Any]) -> Dict[str, Any]:
        """执行扩容"""
        deployment = fault['deployment']
        namespace = fault['namespace']
        current_replicas = fault['current_replicas']
        new_replicas = min(current_replicas + 2, 10)  # 最多 10 个副本
        
        try:
            cmd = f"kubectl scale deployment {deployment} --replicas={new_replicas} -n {namespace}"
            result = subprocess.run(cmd, shell=True, capture_output=True, timeout=self.timeout)
            
            self.log_execution(f"扩容: {current_replicas} -> {new_replicas}")
            
            # 等待扩容完成
            time.sleep(15)
            
            return {
                'status': 'success',
                'message': f'已扩容到 {new_replicas} 个副本',
                'execution_log': self.execution_log
            }
        
        except Exception as e:
            self.log_execution(f"错误: {str(e)}")
            return {
                'status': 'failed',
                'message': f'扩容失败: {str(e)}',
                'execution_log': self.execution_log
            }
    
    def verify(self, fault: Dict[str, Any]) -> bool:
        """验证扩容是否成功"""
        deployment = fault['deployment']
        namespace = fault['namespace']
        
        cmd = f"kubectl get deployment {deployment} -n {namespace} -o jsonpath='{{.status.readyReplicas}}'"
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
        
        ready_replicas = int(result.stdout.strip() or 0)
        return ready_replicas >= fault.get('target_replicas', 2)

class CacheWarmupStrategy(RecoveryStrategy):
    """缓存预热策略"""
    
    def can_execute(self, fault: Dict[str, Any]) -> bool:
        """检查是否需要预热缓存"""
        return fault.get('cache_hit_rate', 100) < 50
    
    def execute(self, fault: Dict[str, Any]) -> Dict[str, Any]:
        """执行缓存预热"""
        try:
            # 预热热点数据
            hot_keys = self.get_hot_keys()
            
            for key in hot_keys:
                self.warmup_key(key)
                self.log_execution(f"预热缓存: {key}")
            
            time.sleep(5)
            
            return {
                'status': 'success',
                'message': f'已预热 {len(hot_keys)} 个缓存键',
                'execution_log': self.execution_log
            }
        
        except Exception as e:
            self.log_execution(f"错误: {str(e)}")
            return {
                'status': 'failed',
                'message': f'缓存预热失败: {str(e)}',
                'execution_log': self.execution_log
            }
    
    def verify(self, fault: Dict[str, Any]) -> bool:
        """验证缓存是否预热成功"""
        # 检查缓存命中率是否提升
        return fault.get('cache_hit_rate', 0) > 70
    
    def get_hot_keys(self):
        """获取热点键"""
        # 从数据库或监控系统获取热点键
        return ['user:*', 'product:*', 'order:*']
    
    def warmup_key(self, key):
        """预热单个键"""
        # 从数据库加载数据到缓存
        pass

class DatabaseConnectionPoolResetStrategy(RecoveryStrategy):
    """数据库连接池重置策略"""
    
    def can_execute(self, fault: Dict[str, Any]) -> bool:
        """检查是否需要重置连接池"""
        return fault.get('db_connection_errors', 0) > 10
    
    def execute(self, fault: Dict[str, Any]) -> Dict[str, Any]:
        """执行连接池重置"""
        try:
            # 重置连接池
            self.reset_connection_pool()
            self.log_execution("重置数据库连接池")
            
            time.sleep(5)
            
            return {
                'status': 'success',
                'message': '数据库连接池已重置',
                'execution_log': self.execution_log
            }
        
        except Exception as e:
            self.log_execution(f"错误: {str(e)}")
            return {
                'status': 'failed',
                'message': f'连接池重置失败: {str(e)}',
                'execution_log': self.execution_log
            }
    
    def verify(self, fault: Dict[str, Any]) -> bool:
        """验证连接池是否恢复"""
        return fault.get('db_connection_errors', 0) == 0
    
    def reset_connection_pool(self):
        """重置连接池"""
        # 调用应用 API 重置连接池
        pass
```

### 3.2 恢复策略选择器

```python
class RecoveryStrategySelector:
    """恢复策略选择器"""
    
    def __init__(self):
        self.strategies = [
            PodRestartStrategy("pod_restart"),
            ScaleUpStrategy("scale_up"),
            CacheWarmupStrategy("cache_warmup"),
            DatabaseConnectionPoolResetStrategy("db_pool_reset"),
        ]
    
    def select_strategy(self, fault: Dict[str, Any]) -> Optional[RecoveryStrategy]:
        """选择合适的恢复策略"""
        
        # 按优先级选择策略
        for strategy in self.strategies:
            if strategy.can_execute(fault):
                return strategy
        
        return None
    
    def select_multiple_strategies(self, fault: Dict[str, Any]) -> list:
        """选择多个恢复策略"""
        applicable_strategies = []
        
        for strategy in self.strategies:
            if strategy.can_execute(fault):
                applicable_strategies.append(strategy)
        
        return applicable_strategies
```

---

## 四、自动化恢复执行引擎

### 4.1 执行引擎

```python
from enum import Enum
from datetime import datetime

class RecoveryStatus(Enum):
    PENDING = "pending"
    EXECUTING = "executing"
    VERIFYING = "verifying"
    SUCCESS = "success"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"

class AutomatedRecoveryEngine:
    """自动化恢复执行引擎"""
    
    def __init__(self, selector: RecoveryStrategySelector):
        self.selector = selector
        self.recovery_history = []
    
    def execute_recovery(self, fault: Dict[str, Any]) -> Dict[str, Any]:
        """执行自动化恢复"""
        
        recovery_record = {
            'fault_id': fault['id'],
            'start_time': datetime.now().isoformat(),
            'status': RecoveryStatus.PENDING.value,
            'steps': []
        }
        
        try:
            # 步骤 1: 选择恢复策略
            strategy = self.selector.select_strategy(fault)
            
            if not strategy:
                recovery_record['status'] = RecoveryStatus.FAILED.value
                recovery_record['reason'] = '没有可用的恢复策略'
                self.recovery_history.append(recovery_record)
                return recovery_record
            
            # 步骤 2: 执行恢复
            recovery_record['status'] = RecoveryStatus.EXECUTING.value
            recovery_record['strategy'] = strategy.name
            
            result = strategy.execute(fault)
            recovery_record['steps'].append({
                'name': 'execute',
                'result': result
            })
            
            if result['status'] != 'success':
                recovery_record['status'] = RecoveryStatus.FAILED.value
                self.recovery_history.append(recovery_record)
                return recovery_record
            
            # 步骤 3: 验证恢复
            recovery_record['status'] = RecoveryStatus.VERIFYING.value
            
            time.sleep(5)  # 等待系统稳定
            
            is_recovered = strategy.verify(fault)
            recovery_record['steps'].append({
                'name': 'verify',
                'result': is_recovered
            })
            
            if is_recovered:
                recovery_record['status'] = RecoveryStatus.SUCCESS.value
            else:
                recovery_record['status'] = RecoveryStatus.FAILED.value
                recovery_record['reason'] = '验证失败'
        
        except Exception as e:
            recovery_record['status'] = RecoveryStatus.FAILED.value
            recovery_record['reason'] = str(e)
        
        finally:
            recovery_record['end_time'] = datetime.now().isoformat()
            self.recovery_history.append(recovery_record)
        
        return recovery_record
    
    def get_recovery_statistics(self):
        """获取恢复统计"""
        total = len(self.recovery_history)
        successful = len([r for r in self.recovery_history if r['status'] == RecoveryStatus.SUCCESS.value])
        failed = len([r for r in self.recovery_history if r['status'] == RecoveryStatus.FAILED.value])
        
        return {
            'total_recoveries': total,
            'successful': successful,
            'failed': failed,
            'success_rate': successful / total if total > 0 else 0,
        }
```

### 4.2 安全机制

```python
class SafetyMechanism:
    """安全机制"""
    
    def __init__(self):
        self.max_recovery_attempts = 3
        self.recovery_attempt_window = 300  # 5 分钟
        self.require_approval_for_critical = True
    
    def check_safety(self, fault: Dict[str, Any], strategy: RecoveryStrategy) -> bool:
        """检查安全性"""
        
        # 检查 1: 是否已经尝试过多次恢复
        if self.has_exceeded_recovery_attempts(fault):
            return False
        
        # 检查 2: 是否需要人工审批
        if self.require_approval_for_critical and fault.get('severity') == 'critical':
            return self.get_approval(fault, strategy)
        
        # 检查 3: 是否有回滚方案
        if not self.has_rollback_plan(strategy):
            return False
        
        return True
    
    def has_exceeded_recovery_attempts(self, fault: Dict[str, Any]) -> bool:
        """检查是否超过恢复次数"""
        # 查询最近的恢复尝试
        # 如果在 5 分钟内已经尝试 3 次，则不再尝试
        return False  # 简化实现
    
    def get_approval(self, fault: Dict[str, Any], strategy: RecoveryStrategy) -> bool:
        """获取人工审批"""
        # 发送审批请求
        # 等待审批结果
        return True  # 简化实现
    
    def has_rollback_plan(self, strategy: RecoveryStrategy) -> bool:
        """检查是否有回滚方案"""
        return hasattr(strategy, 'rollback') and callable(strategy.rollback)

class RollbackMechanism:
    """回滚机制"""
    
    def __init__(self):
        self.rollback_history = []
    
    def execute_rollback(self, recovery_record: Dict[str, Any]) -> Dict[str, Any]:
        """执行回滚"""
        
        rollback_record = {
            'recovery_id': recovery_record['fault_id'],
            'start_time': datetime.now().isoformat(),
            'status': 'executing'
        }
        
        try:
            # 反向执行恢复步骤
            for step in reversed(recovery_record['steps']):
                # 执行回滚逻辑
                pass
            
            rollback_record['status'] = 'success'
        
        except Exception as e:
            rollback_record['status'] = 'failed'
            rollback_record['reason'] = str(e)
        
        finally:
            rollback_record['end_time'] = datetime.now().isoformat()
            self.rollback_history.append(rollback_record)
        
        return rollback_record
```

---

## 五、集成和监控

### 5.1 与告警系统集成

```python
class AlertToRecoveryIntegration:
    """告警到恢复的集成"""
    
    def __init__(self, engine: AutomatedRecoveryEngine, safety: SafetyMechanism):
        self.engine = engine
        self.safety = safety
    
    def handle_alert(self, alert: Dict[str, Any]):
        """处理告警并执行恢复"""
        
        # 转换告警为故障信息
        fault = self.convert_alert_to_fault(alert)
        
        # 检查安全性
        if not self.safety.check_safety(fault, None):
            # 发送通知，等待人工处理
            self.notify_admin(fault)
            return
        
        # 执行自动化恢复
        recovery_result = self.engine.execute_recovery(fault)
        
        # 记录恢复结果
        self.log_recovery(recovery_result)
        
        # 发送通知
        if recovery_result['status'] == RecoveryStatus.SUCCESS.value:
            self.notify_success(recovery_result)
        else:
            self.notify_failure(recovery_result)
    
    def convert_alert_to_fault(self, alert: Dict[str, Any]) -> Dict[str, Any]:
        """转换告警为故障信息"""
        return {
            'id': alert['id'],
            'service': alert['labels']['service'],
            'metric': alert['labels']['metric'],
            'value': alert['value'],
            'severity': alert['labels']['severity'],
            'timestamp': alert['startsAt'],
        }
```

### 5.2 监控和指标

```python
from prometheus_client import Counter, Histogram, Gauge

class RecoveryMetrics:
    """恢复指标"""
    
    def __init__(self):
        self.recovery_attempts = Counter(
            'recovery_attempts_total',
            'Total recovery attempts',
            ['strategy', 'status']
        )
        
        self.recovery_duration = Histogram(
            'recovery_duration_seconds',
            'Recovery duration',
            ['strategy']
        )
        
        self.mttr = Gauge(
            'mttr_seconds',
            'Mean time to recovery'
        )
    
    def record_recovery(self, recovery_record: Dict[str, Any]):
        """记录恢复指标"""
        strategy = recovery_record.get('strategy', 'unknown')
        status = recovery_record['status']
        
        self.recovery_attempts.labels(strategy=strategy, status=status).inc()
        
        # 计算恢复时间
        start = datetime.fromisoformat(recovery_record['start_time'])
        end = datetime.fromisoformat(recovery_record['end_time'])
        duration = (end - start).total_seconds()
        
        self.recovery_duration.labels(strategy=strategy).observe(duration)
```

---

## 六、最佳实践

### 6.1 恢复策略设计原则

```
1. 安全第一
   - 始终有回滚方案
   - 限制恢复次数
   - 关键操作需要审批

2. 逐步升级
   - 先尝试轻量级恢复
   - 再尝试重量级恢复
   - 最后才进行人工干预

3. 可观测性
   - 记录所有恢复操作
   - 提供详细的日志
   - 支持审计追踪

4. 持续学习
   - 收集恢复效果反馈
   - 优化恢复策略
   - 更新知识库
```

### 6.2 恢复策略优先级

```python
RECOVERY_STRATEGY_PRIORITY = [
    # 轻量级恢复（风险低）
    ('cache_warmup', 1),
    ('db_pool_reset', 2),
    ('service_restart', 3),
    
    # 中等恢复（风险中）
    ('pod_restart', 4),
    ('scale_up', 5),
    
    # 重量级恢复（风险高）
    ('node_drain', 6),
    ('cluster_failover', 7),
    
    # 人工干预
    ('manual_intervention', 8),
]
```

---

## 七、总结

自动化故障恢复的关键：

✅ **快速检测**：尽早发现故障
✅ **精准诊断**：准确定位根本原因
✅ **智能恢复**：选择合适的恢复策略
✅ **安全保障**：防止误操作
✅ **持续改进**：从反馈中学习

通过这些技术，可以将 MTTR 从小时级别降低到分钟级别，显著提高系统可用性。

---

**关键词**：自动化恢复、自愈系统、故障转移、回滚机制

**推荐工具**：
- Kubernetes 自动恢复
- Chaos Engineering (Chaos Monkey)
- 自定义恢复脚本
