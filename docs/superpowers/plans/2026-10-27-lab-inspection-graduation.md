# Lab Inspection Graduation System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable, tested, documented full-stack graduation project that demonstrates the complete AgentTeam workflow.

**Architecture:** A zero-dependency Node.js HTTP server persists equipment, inspections and tickets to JSON. A native browser client renders an instrument-panel dashboard and calls the REST API.

**Tech Stack:** Node.js 24, `node:http`, `node:test`, HTML, CSS, JavaScript.

## Global Constraints

- No third-party runtime or build dependencies.
- All files live under `C:\Users\Xzj13\Desktop\pro\lab-inspection-graduation`.
- API errors are JSON and use 400, 404 or 409 status codes.
- User-visible copy is Chinese.
- Every custom function has 功能、输入、输出 documentation.

---

### Task 1: Backend Store and API

**Files:**
- Create: `backend/store.mjs`
- Create: `backend/app.mjs`
- Create: `backend/server.mjs`
- Create: `tests/api.test.mjs`
- Create: `package.json`

**Interfaces:**
- `createStore(filePath, seedData)` returns `{ getAll, insert, updateTicket, stats }`.
- `createApp(store)` returns a Node `http.Server`.
- API entities use the field names defined in the design spec.

- [ ] Write tests for health, equipment creation, inspection creation, ticket creation, invalid transitions and statistics.
- [ ] Run `npm test` and confirm the missing-module failure.
- [ ] Implement the JSON store and HTTP router.
- [ ] Run `npm test`; expect all tests to pass.
- [ ] Commit `feat: add lab inspection API`.

### Task 2: Browser Workbench

**Files:**
- Create: `frontend/index.html`
- Create: `frontend/styles.css`
- Create: `frontend/app.js`
- Modify: `backend/app.mjs` to serve static files.

**Interfaces:**
- Frontend reads `/api/equipment`, `/api/inspections`, `/api/tickets`, `/api/stats`.
- Forms submit JSON to the matching POST endpoints.
- Ticket action buttons call PATCH with the next state.

- [ ] Add a smoke test that requests `/` and expects the dashboard title.
- [ ] Build the instrument-panel layout and responsive states.
- [ ] Implement add-device, add-inspection, add-ticket and ticket-advance interactions.
- [ ] Run tests and start the server for a parse check.
- [ ] Commit `feat: add lab inspection workbench`.

### Task 3: AgentTeam Package

**Files:**
- Create: `agent-team/team.yaml`
- Create: `agent-team/one-shot-prompt.md`
- Create: `agent-team/handoff-log.md`

**Interfaces:**
- Team contains seven roles: requirements, architecture, frontend, backend, testing, thesis, defense.
- Handoff log references actual artifacts created by each phase.

- [ ] Write the role and permission matrix.
- [ ] Record phase handoffs and generated artifacts.
- [ ] Validate that each role owns at least one deliverable.
- [ ] Commit `docs: add AgentTeam handoff artifacts`.

### Task 4: Requirements and Design Documents

**Files:**
- Create: `requirements/需求规格说明书.md`
- Create: `requirements/用例图.puml`
- Create: `requirements/需求追踪矩阵.md`
- Create: `design/系统设计文档.md`
- Create: `design/架构图.puml`
- Create: `design/ER图.puml`
- Create: `design/api-contract.yaml`
- Create: `design/database/ddl.sql`

**Interfaces:**
- Requirement IDs `FR-01` through `FR-08` map to implementation and tests.
- API contract matches the routes implemented in Task 1.

- [ ] Write the requirements, diagrams, API contract and SQL schema.
- [ ] Check every functional requirement appears in the trace matrix.
- [ ] Commit `docs: add requirements and system design`.

### Task 5: Thesis and Defense

**Files:**
- Create: `thesis/毕业论文.md`
- Create: `defense/答辩PPT大纲.md`
- Create: `defense/演示脚本.md`
- Create: `defense/预测QA.md`

**Interfaces:**
- Thesis uses actual architecture, state machine and test results.
- Defense material references the real UI and API.

- [ ] Write the six chapters: introduction, requirements, design, implementation, testing, conclusion.
- [ ] Write an eight-slide outline, a three-minute demo script and at least ten Q&A items.
- [ ] Commit `docs: add thesis and defense package`.

### Task 6: Final Verification and Handoff

**Files:**
- Create: `README.md`
- Create: `reports/test-report.md`
- Create: `docs/PROJECT_MEMO.md`
- Create: `docs/CODE_MAP.md`
- Create: `.gitignore`

**Interfaces:**
- README exposes one start command and one test command.
- Project memo records exact environment and current state.

- [ ] Run `npm test`.
- [ ] Start the server and verify `/api/health` and `/`.
- [ ] Record pass counts, API checks and resource usage.
- [ ] Update project memo and code map.
- [ ] Commit `docs: finalize graduation project`.
