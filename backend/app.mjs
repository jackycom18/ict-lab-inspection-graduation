import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';


const CURRENT_DIR = path.dirname(fileURLToPath(import.meta.url));
// FRONTEND_DIR contains the browser application served by the same local port.
const FRONTEND_DIR = path.resolve(CURRENT_DIR, '..', 'frontend');
// TICKET_TRANSITIONS defines the only allowed forward transitions.
const TICKET_TRANSITIONS = {
  open: 'assigned',
  assigned: 'repairing',
  repairing: 'resolved',
  resolved: 'closed',
  closed: null,
};
const EQUIPMENT_STATUSES = new Set(['operational', 'maintenance', 'retired']);
const INSPECTION_RESULTS = new Set(['pass', 'issue']);
const TICKET_SEVERITIES = new Set(['low', 'medium', 'high']);
// MAX_BODY_BYTES limits request bodies to protect the local demo server.
const MAX_BODY_BYTES = 1_000_000;


/**
 * 功能：创建带 HTTP 状态码和业务错误码的异常。
 * 输入：status 为 HTTP 状态码，code 为业务错误码，message 为中文提示。
 * 输出：可抛出的 Error。
 */
function httpError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}


/**
 * 功能：向客户端发送 JSON 响应。
 * 输入：response 为 ServerResponse，status 为状态码，payload 为 JSON 对象。
 * 输出：无返回值。
 */
function sendJson(response, status, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(body);
}


/**
 * 功能：读取并解析 JSON 请求体。
 * 输入：request 为 IncomingMessage。
 * 输出：解析后的对象；空请求体返回空对象。
 */
async function readJsonBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw httpError(413, 'PAYLOAD_TOO_LARGE', '请求体不能超过 1 MB');
    }
    chunks.push(chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw httpError(400, 'INVALID_JSON', '请求体必须是有效 JSON');
  }
}


/**
 * 功能：检查必填文本。
 * 输入：value 为待检查值，name 为字段名，max 为最大长度。
 * 输出：清理后的字符串；非法时抛出 400 异常。
 */
function requireText(value, name, max = 120) {
  if (typeof value !== 'string' || !value.trim()) {
    throw httpError(400, 'VALIDATION_ERROR', `${name} 必填`);
  }
  const text = value.trim();
  if (text.length > max) {
    throw httpError(400, 'VALIDATION_ERROR', `${name} 不能超过 ${max} 字符`);
  }
  return text;
}


/**
 * 功能：校验并构建设备记录。
 * 输入：body 为 POST /api/equipment 请求体。
 * 输出：已清理的设备字段。
 */
function validateEquipment(body) {
  const status = body.status || 'operational';
  if (!EQUIPMENT_STATUSES.has(status)) {
    throw httpError(400, 'VALIDATION_ERROR', '设备状态不合法');
  }
  return {
    name: requireText(body.name, '设备名称', 80),
    code: requireText(body.code, '设备编号', 40),
    location: requireText(body.location, '实验室位置', 80),
    category: requireText(body.category, '设备类别', 40),
    status,
    owner: requireText(body.owner, '负责人', 40),
    lastInspectionAt: body.lastInspectionAt || null,
  };
}


/**
 * 功能：查找必须存在的设备。
 * 输入：store 为仓库，equipmentId 为设备 ID。
 * 输出：设备对象；不存在时抛出 404 异常。
 */
function requireEquipment(store, equipmentId) {
  const equipment = store.getAll('equipment').find((item) => item.id === equipmentId);
  if (!equipment) throw httpError(404, 'EQUIPMENT_NOT_FOUND', '设备不存在');
  return equipment;
}


/**
 * 功能：校验并构建巡检记录。
 * 输入：store 为仓库，body 为巡检请求体。
 * 输出：巡检字段。
 */
function validateInspection(store, body) {
  const equipment = requireEquipment(store, body.equipmentId);
  const result = body.result;
  if (!INSPECTION_RESULTS.has(result)) {
    throw httpError(400, 'VALIDATION_ERROR', '巡检结论必须是 pass 或 issue');
  }
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : '';
  return {
    equipmentId: equipment.id,
    inspector: requireText(body.inspector, '巡检人', 40),
    result,
    note,
    createdAt: new Date().toISOString(),
  };
}


/**
 * 功能：校验并构建工单记录。
 * 输入：store 为仓库，body 为工单请求体。
 * 输出：工单字段。
 */
function validateTicket(store, body) {
  const equipment = requireEquipment(store, body.equipmentId);
  if (!TICKET_SEVERITIES.has(body.severity)) {
    throw httpError(400, 'VALIDATION_ERROR', '严重程度必须是 low、medium 或 high');
  }
  const now = new Date().toISOString();
  return {
    equipmentId: equipment.id,
    title: requireText(body.title, '工单标题', 120),
    severity: body.severity,
    status: 'open',
    assignee: typeof body.assignee === 'string' ? body.assignee.trim().slice(0, 40) : '',
    createdAt: now,
    updatedAt: now,
  };
}


/**
 * 功能：验证并执行工单状态推进或处理人变更。
 * 输入：store 为仓库，ticketId 为工单 ID，body 为 PATCH 请求体。
 * 输出：更新后的工单；非法操作时抛出 400、404 或 409。
 */
function updateTicket(store, ticketId, body) {
  const ticket = store.getAll('tickets').find((item) => item.id === ticketId);
  if (!ticket) throw httpError(404, 'TICKET_NOT_FOUND', '工单不存在');
  const patch = {};
  if (body.assignee !== undefined) {
    patch.assignee = requireText(body.assignee, '处理人', 40);
  }
  if (body.status !== undefined) {
    const expected = TICKET_TRANSITIONS[ticket.status];
    if (!expected || body.status !== expected) {
      throw httpError(
        409,
        'INVALID_TRANSITION',
        `工单只能从 ${ticket.status} 推进到 ${expected || '无'}`,
      );
    }
    patch.status = body.status;
  } else if (ticket.status === 'open' && patch.assignee) {
    patch.status = 'assigned';
  }
  if (Object.keys(patch).length === 0) {
    throw httpError(400, 'VALIDATION_ERROR', '至少提供 status 或 assignee');
  }
  return store.updateTicket(ticketId, patch);
}


/**
 * 功能：发送静态前端文件。
 * 输入：response 和 pathname。
 * 输出：找到时发送文件并返回 true，否则返回 false。
 */
function serveStatic(response, pathname) {
  const files = {
    '/': ['index.html', 'text/html; charset=utf-8'],
    '/styles.css': ['styles.css', 'text/css; charset=utf-8'],
    '/app.js': ['app.js', 'text/javascript; charset=utf-8'],
  };
  const entry = files[pathname];
  if (!entry) return false;
  const [fileName, contentType] = entry;
  const content = fs.readFileSync(path.join(FRONTEND_DIR, fileName));
  response.writeHead(200, {
    'Content-Type': contentType,
    'Content-Length': content.length,
    'Cache-Control': 'no-cache',
    'X-Content-Type-Options': 'nosniff',
  });
  response.end(content);
  return true;
}


/**
 * 功能：处理一个 HTTP 请求。
 * 输入：store 为仓库，request 和 response 为 Node HTTP 对象。
 * 输出：无返回值。
 */
async function handleRequest(store, request, response) {
  const url = new URL(request.url, 'http://localhost');
  const method = request.method || 'GET';
  try {
    if (method === 'GET' && url.pathname === '/api/health') {
      sendJson(response, 200, { status: 'ok', service: 'lab-inspection' });
      return;
    }
    if (method === 'GET' && url.pathname === '/api/equipment') {
      sendJson(response, 200, { items: store.getAll('equipment') });
      return;
    }
    if (method === 'POST' && url.pathname === '/api/equipment') {
      const item = store.insert('equipment', validateEquipment(await readJsonBody(request)));
      sendJson(response, 201, { item });
      return;
    }
    if (method === 'GET' && url.pathname === '/api/inspections') {
      sendJson(response, 200, { items: store.getAll('inspections') });
      return;
    }
    if (method === 'POST' && url.pathname === '/api/inspections') {
      const item = store.insert(
        'inspections',
        validateInspection(store, await readJsonBody(request)),
      );
      sendJson(response, 201, { item });
      return;
    }
    if (method === 'GET' && url.pathname === '/api/tickets') {
      sendJson(response, 200, { items: store.getAll('tickets') });
      return;
    }
    if (method === 'POST' && url.pathname === '/api/tickets') {
      const item = store.insert('tickets', validateTicket(store, await readJsonBody(request)));
      sendJson(response, 201, { item });
      return;
    }
    const ticketMatch = /^\/api\/tickets\/([^/]+)$/.exec(url.pathname);
    if (method === 'PATCH' && ticketMatch) {
      const item = updateTicket(store, decodeURIComponent(ticketMatch[1]), await readJsonBody(request));
      sendJson(response, 200, { item });
      return;
    }
    if (method === 'GET' && url.pathname === '/api/stats') {
      sendJson(response, 200, store.stats());
      return;
    }
    if (method === 'GET' && serveStatic(response, url.pathname)) return;
    if (url.pathname.startsWith('/api/')) {
      throw httpError(404, 'NOT_FOUND', '接口不存在');
    }
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
  } catch (error) {
    if (error.status) {
      sendJson(response, error.status, {
        error: { code: error.code, message: error.message },
      });
      return;
    }
    sendJson(response, 500, {
      error: { code: 'INTERNAL_ERROR', message: '服务器处理请求失败' },
    });
  }
}


/**
 * 功能：创建实验室巡检系统 HTTP 服务。
 * 输入：store 为实现 getAll、insert、updateTicket 和 stats 的仓库。
 * 输出：尚未监听的 http.Server。
 */
export function createApp(store) {
  return http.createServer((request, response) => {
    handleRequest(store, request, response);
  });
}
