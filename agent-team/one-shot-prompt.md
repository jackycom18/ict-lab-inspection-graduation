# AgentTeam 一次性启动指令

```text
根据 agent-team/team.yaml 创建七角色 AgentTeam，并生成毕业设计。

我的毕业设计是“校园实验室设备巡检与故障工单系统”。
方向：全栈 Web 系统。
请按“需求分析 → 系统设计 → 前后端并行开发 → 测试 → 论文 → 答辩”推进。
技术栈：Node.js 内置 HTTP 服务、原生 HTML/CSS/JavaScript、JSON 文件存储。
系统角色：实验室管理员、巡检员、维修人员。
核心功能：设备台账、巡检记录、故障工单、状态流转、运营统计。

约束：
1. 不使用第三方运行时依赖。
2. 每个角色只修改自己负责的目录。
3. API 参数必须校验，错误写入 JSON 响应。
4. 工单只允许按 open → assigned → repairing → resolved → closed 推进。
5. 论文中的测试数据必须来自真实执行结果。
6. 每阶段完成后再进入下一阶段，并由 Leader 检查产物。
```
