import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

import { createApp } from '../backend/app.mjs';
import { createStore } from '../backend/store.mjs';


/**
 * 功能：启动隔离测试服务器。
 * 输入：无。
 * 输出：包含 baseUrl、add 方法和服务关闭函数的 Promise 对象。
 */
async function startTestServer() {
  const directory = await mkdtemp(path.join(tmpdir(), 'lab-inspection-'));
  const store = createStore(path.join(directory, 'db.json'));
  const server = createApp(store);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  return {
    baseUrl,
    close: async () => {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
      await rm(directory, { recursive: true, force: true });
    },
  };
}


/**
 * 功能：发送 JSON 请求并返回状态码与响应体。
 * 输入：baseUrl 为服务地址，pathname 为 API 路径，method 为 HTTP 方法，body 为可选 JSON 对象。
 * 输出：包含 status 和 data 的对象。
 */
async function requestJson(baseUrl, pathname, method = 'GET', body) {
  const response = await fetch(`${baseUrl}${pathname}`, {
    method,
    headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, data: await response.json() };
}


test('health, seeded lists and dashboard page are available', async () => {
  const app = await startTestServer();
  try {
    const health = await requestJson(app.baseUrl, '/api/health');
    assert.equal(health.status, 200);
    assert.equal(health.data.status, 'ok');

    const equipment = await requestJson(app.baseUrl, '/api/equipment');
    assert.equal(equipment.status, 200);
    assert.ok(equipment.data.items.length >= 1);

    const page = await fetch(`${app.baseUrl}/`);
    assert.equal(page.status, 200);
    assert.match(await page.text(), /实验室设备巡检/);
  } finally {
    await app.close();
  }
});


test('equipment creation validates required fields and persists records', async () => {
  const app = await startTestServer();
  try {
    const invalid = await requestJson(app.baseUrl, '/api/equipment', 'POST', { name: '' });
    assert.equal(invalid.status, 400);
    assert.equal(invalid.data.error.code, 'VALIDATION_ERROR');

    const created = await requestJson(app.baseUrl, '/api/equipment', 'POST', {
      name: '频谱分析仪',
      code: 'SPEC-09',
      location: '通信实验室 B-08',
      category: '测量仪器',
      owner: '赵老师',
    });
    assert.equal(created.status, 201);
    assert.match(created.data.item.id, /^EQ-/);
  } finally {
    await app.close();
  }
});


test('inspection creation records pass and issue findings', async () => {
  const app = await startTestServer();
  try {
    const equipment = await requestJson(app.baseUrl, '/api/equipment');
    const equipmentId = equipment.data.items[0].id;
    const created = await requestJson(app.baseUrl, '/api/inspections', 'POST', {
      equipmentId,
      inspector: '周同学',
      result: 'issue',
      note: '探头接触不稳定',
    });
    assert.equal(created.status, 201);
    assert.equal(created.data.item.result, 'issue');
  } finally {
    await app.close();
  }
});


test('ticket creation and strict state transition are enforced', async () => {
  const app = await startTestServer();
  try {
    const equipment = await requestJson(app.baseUrl, '/api/equipment');
    const equipmentId = equipment.data.items[0].id;
    const ticket = await requestJson(app.baseUrl, '/api/tickets', 'POST', {
      equipmentId,
      title: '设备无法启动',
      severity: 'high',
    });
    assert.equal(ticket.status, 201);
    assert.equal(ticket.data.item.status, 'open');

    const skipped = await requestJson(
      app.baseUrl,
      `/api/tickets/${ticket.data.item.id}`,
      'PATCH',
      { status: 'resolved' },
    );
    assert.equal(skipped.status, 409);

    const assigned = await requestJson(
      app.baseUrl,
      `/api/tickets/${ticket.data.item.id}`,
      'PATCH',
      { assignee: '维修组 B' },
    );
    assert.equal(assigned.status, 200);
    assert.equal(assigned.data.item.status, 'assigned');
    assert.equal(assigned.data.item.assignee, '维修组 B');
  } finally {
    await app.close();
  }
});


test('statistics reflect current equipment and ticket data', async () => {
  const app = await startTestServer();
  try {
    const stats = await requestJson(app.baseUrl, '/api/stats');
    assert.equal(stats.status, 200);
    assert.ok(stats.data.equipmentTotal >= 1);
    assert.ok(stats.data.openTickets >= 1);
    assert.ok(stats.data.inspections >= 1);
  } finally {
    await app.close();
  }
});
