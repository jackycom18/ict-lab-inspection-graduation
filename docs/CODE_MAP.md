# 代码地图

> 最后更新：2026-10-27

## 总体结构

```text
lab-inspection-graduation/
├─ agent-team/       七角色配置和交接日志
├─ requirements/     需求规格、用例、追踪矩阵
├─ design/           架构、ER、API、DDL
├─ backend/          HTTP 服务、路由、存储
├─ frontend/         浏览器工作台
├─ tests/            API 自动化测试
├─ thesis/           六章论文
├─ defense/          PPT、演示和问答
├─ reports/          测试报告与截图
└─ docs/             备忘和代码地图
```

## 模块职责

- `backend/app.mjs`：HTTP 路由、校验、状态机和静态文件。
- `backend/store.mjs`：初始数据、业务编号、JSON 持久化与统计。
- `backend/server.mjs`：端口和路径配置。
- `frontend/app.js`：加载 API、渲染视图、表单提交和工单推进。
- `frontend/styles.css`：仪器面板视觉与响应式规则。
- `tests/api.test.mjs`：接口与状态机自动化测试。

## 逐文件核心内容

### `backend/app.mjs`

- 用途：实现全部 REST API。
- 关键入口：`createApp()`、`handleRequest()`、`updateTicket()`。
- 数据流：HTTP → 校验 → store → JSON 响应。
- 注意：状态机不允许跳级，API 错误统一 JSON。

### `backend/store.mjs`

- 用途：保存设备、巡检和工单并提供统计。
- 关键入口：`createStore()`。
- 数据流：内存记录 → JSON 文件。
- 注意：只适合单进程演示。

### `frontend/app.js`

- 用途：浏览器端数据加载、渲染和交互。
- 关键入口：`loadData()`、`renderTickets()`、`advanceTicket()`。
- 数据流：fetch API → state → DOM。
- 注意：业务文本使用 `textContent`，避免 XSS。
