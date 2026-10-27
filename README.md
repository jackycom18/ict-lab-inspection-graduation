# 校园实验室设备巡检与故障工单系统

华为 ICT 1.12 AgentTeam 毕业设计作品。项目展示七个角色从需求、设计、开发、测试、论文到答辩的完整交付过程。

## 一键运行

```bash
npm start
```

浏览器打开 <http://127.0.0.1:3000>。

项目不需要 `npm install`，运行时无第三方依赖。

## 一键测试

```bash
npm test
```

## 核心能力

- 设备台账与运行状态
- 巡检记录与异常备注
- 故障工单创建、指派和五状态流转
- 设备、工单和完成率统计
- 桌面与移动端响应式工作台

## 目录

```text
requirements/   需求规格、用例图、追踪矩阵
design/         架构图、ER 图、API 契约、DDL
frontend/       仪表台式浏览器工作台
backend/        Node.js HTTP API 和 JSON 存储
tests/          Node.js 自动化测试
agent-team/     七角色配置与阶段交接
thesis/         六章毕业论文
defense/        PPT 大纲、演示脚本、预测 Q&A
reports/        测试报告和界面截图
```

## 测试结果

- API 自动化测试：5 / 5 通过
- 浏览器交互：设备登记、工单创建通过
- 响应式检查：1440px 和 390px 均无横向溢出

详细结果见 [测试报告](reports/test-report.md)。
