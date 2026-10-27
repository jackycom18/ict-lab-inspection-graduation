const STATUS_LABELS = {
  operational: '运行正常',
  maintenance: '维护中',
  retired: '已停用',
};
const TICKET_LABELS = {
  open: '待领取',
  assigned: '已指派',
  repairing: '维修中',
  resolved: '待关闭',
  closed: '已关闭',
};
const SEVERITY_LABELS = {
  low: '低',
  medium: '中',
  high: '高',
};
const NEXT_ACTION = {
  open: '领取工单',
  assigned: '开始维修',
  repairing: '标记解决',
  resolved: '关闭工单',
};

const state = {
  equipment: [],
  inspections: [],
  tickets: [],
  stats: {},
};


/**
 * 功能：查询单个 DOM 元素。
 * 输入：selector 为 CSS 选择器。
 * 输出：匹配元素；不存在时返回 null。
 */
function $(selector) {
  return document.querySelector(selector);
}


/**
 * 功能：创建文本节点型元素，避免把用户输入当作 HTML。
 * 输入：tag 为标签名，className 为可选类名，text 为可选文本。
 * 输出：新 DOM 元素。
 */
function element(tag, className = '', text = '') {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}


/**
 * 功能：格式化 ISO 时间为简洁中文日期。
 * 输入：value 为 ISO 时间或空值。
 * 输出：格式化字符串；空值返回“暂无”。
 */
function formatTime(value) {
  if (!value) return '暂无';
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}


/**
 * 功能：显示短时操作提示。
 * 输入：message 为提示内容。
 * 输出：无返回值。
 */
function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('show');
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2400);
}


/**
 * 功能：发送 JSON API 请求。
 * 输入：path 为接口路径，options 为 fetch 配置。
 * 输出：响应 JSON；失败时抛出带服务端消息的异常。
 */
async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `请求失败：HTTP ${response.status}`);
  }
  return data;
}


/**
 * 功能：按设备 ID 查找设备编码和名称。
 * 输入：equipmentId 为设备 ID。
 * 输出：展示文本。
 */
function equipmentLabel(equipmentId) {
  const item = state.equipment.find((equipment) => equipment.id === equipmentId);
  return item ? `${item.code} · ${item.name}` : equipmentId;
}


/**
 * 功能：更新顶部指标。
 * 输入：无。
 * 输出：无返回值。
 */
function renderStats() {
  $('#stat-equipment').textContent = state.stats.equipmentTotal ?? 0;
  $('#stat-operational').textContent = state.stats.operational ?? 0;
  $('#stat-tickets').textContent = state.stats.openTickets ?? 0;
  $('#stat-high').textContent = state.stats.highPriority ?? 0;
  $('#stat-completion').textContent = `${state.stats.completionRate ?? 0}%`;
}


/**
 * 功能：渲染设备阵列。
 * 输入：无。
 * 输出：无返回值。
 */
function renderEquipment() {
  const grid = $('#equipment-grid');
  grid.replaceChildren();
  $('#equipment-count').textContent = `${state.equipment.length} 台设备`;
  if (state.equipment.length === 0) {
    grid.append(element('p', 'empty-state', '尚未登记设备。使用右侧操作台添加第一台设备。'));
    return;
  }
  for (const item of state.equipment) {
    const unit = element('article', 'equipment-unit');
    unit.dataset.status = item.status;
    const code = element('span', 'equipment-code', item.code);
    const status = element('span', 'equipment-state', STATUS_LABELS[item.status] || item.status);
    unit.append(code, status, element('h3', '', item.name));
    unit.append(element('p', 'equipment-location', item.location));
    unit.append(
      element('p', 'equipment-meta', `${item.category} · ${item.owner} · ${formatTime(item.lastInspectionAt)}`),
    );
    grid.append(unit);
  }
}


/**
 * 功能：渲染故障工单列表。
 * 输入：无。
 * 输出：无返回值。
 */
function renderTickets() {
  const list = $('#ticket-list');
  list.replaceChildren();
  $('#ticket-count').textContent = `${state.tickets.length} 张`;
  if (state.tickets.length === 0) {
    list.append(element('p', 'empty-state', '当前没有故障工单。'));
    return;
  }
  for (const ticket of state.tickets) {
    const row = element('article', 'ticket-row');
    const severity = element('span', 'ticket-severity', SEVERITY_LABELS[ticket.severity]);
    severity.dataset.severity = ticket.severity;
    const copy = element('div', 'ticket-copy');
    copy.append(element('strong', '', ticket.title));
    copy.append(
      element(
        'small',
        '',
        `${ticket.id} · ${equipmentLabel(ticket.equipmentId)} · ${TICKET_LABELS[ticket.status] || ticket.status}`,
      ),
    );
    const action = element('button', 'ticket-action', NEXT_ACTION[ticket.status] || '已完成');
    action.type = 'button';
    action.disabled = ticket.status === 'closed';
    action.dataset.ticketId = ticket.id;
    row.append(severity, copy, action);
    list.append(row);
  }
}


/**
 * 功能：渲染巡检日志。
 * 输入：无。
 * 输出：无返回值。
 */
function renderInspections() {
  const log = $('#inspection-log');
  log.replaceChildren();
  if (state.inspections.length === 0) {
    log.append(element('p', 'empty-state', '还没有巡检记录。'));
    return;
  }
  for (const inspection of state.inspections) {
    const item = element('article', 'inspection-item');
    item.dataset.result = inspection.result;
    item.append(element('strong', '', `${equipmentLabel(inspection.equipmentId)} · ${inspection.result === 'pass' ? '正常' : '异常'}`));
    item.append(element('span', '', `${inspection.inspector} · ${formatTime(inspection.createdAt)}`));
    if (inspection.note) item.append(element('small', '', inspection.note));
    log.append(item);
  }
}


/**
 * 功能：同步设备下拉选项。
 * 输入：无。
 * 输出：无返回值。
 */
function renderEquipmentOptions() {
  for (const select of [$('#inspection-equipment'), $('#ticket-equipment')]) {
    const previous = select.value;
    select.replaceChildren();
    for (const item of state.equipment) {
      const option = element('option', '', `${item.code} · ${item.name}`);
      option.value = item.id;
      select.append(option);
    }
    if (state.equipment.some((item) => item.id === previous)) select.value = previous;
  }
}


/**
 * 功能：并行加载所有页面数据并重新渲染。
 * 输入：无。
 * 输出：无返回值；失败时显示提示。
 */
async function loadData() {
  try {
    const [equipment, inspections, tickets, stats] = await Promise.all([
      api('/api/equipment'),
      api('/api/inspections'),
      api('/api/tickets'),
      api('/api/stats'),
    ]);
    state.equipment = equipment.items;
    state.inspections = inspections.items;
    state.tickets = tickets.items;
    state.stats = stats;
    renderStats();
    renderEquipment();
    renderTickets();
    renderInspections();
    renderEquipmentOptions();
  } catch (error) {
    showToast(error.message);
  }
}


/**
 * 功能：把表单转换为普通对象。
 * 输入：form 为 HTMLFormElement。
 * 输出：字段名到字符串值的对象。
 */
function formDataObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}


/**
 * 功能：提交新设备表单。
 * 输入：event 为 submit 事件。
 * 输出：无返回值。
 */
async function submitEquipment(event) {
  event.preventDefault();
  const form = event.currentTarget;
  try {
    await api('/api/equipment', {
      method: 'POST',
      body: JSON.stringify(formDataObject(form)),
    });
    form.reset();
    showToast('设备已写入台账');
    await loadData();
  } catch (error) {
    showToast(error.message);
  }
}


/**
 * 功能：提交巡检表单。
 * 输入：event 为 submit 事件。
 * 输出：无返回值。
 */
async function submitInspection(event) {
  event.preventDefault();
  const form = event.currentTarget;
  try {
    await api('/api/inspections', {
      method: 'POST',
      body: JSON.stringify(formDataObject(form)),
    });
    form.reset();
    showToast('巡检记录已保存');
    await loadData();
  } catch (error) {
    showToast(error.message);
  }
}


/**
 * 功能：提交故障工单表单。
 * 输入：event 为 submit 事件。
 * 输出：无返回值。
 */
async function submitTicket(event) {
  event.preventDefault();
  const form = event.currentTarget;
  try {
    await api('/api/tickets', {
      method: 'POST',
      body: JSON.stringify(formDataObject(form)),
    });
    form.reset();
    showToast('故障工单已生成');
    await loadData();
  } catch (error) {
    showToast(error.message);
  }
}


/**
 * 功能：推进一张工单的下一个状态。
 * 输入：event 为按钮点击事件。
 * 输出：无返回值。
 */
async function advanceTicket(event) {
  const button = event.target.closest('[data-ticket-id]');
  if (!button) return;
  const ticket = state.tickets.find((item) => item.id === button.dataset.ticketId);
  if (!ticket) return;
  const patch = {};
  if (ticket.status === 'open') {
    patch.assignee = '值班维修组';
  } else {
    const next = {
      assigned: 'repairing',
      repairing: 'resolved',
      resolved: 'closed',
    }[ticket.status];
    if (!next) return;
    patch.status = next;
  }
  try {
    await api(`/api/tickets/${encodeURIComponent(ticket.id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    showToast('工单状态已更新');
    await loadData();
  } catch (error) {
    showToast(error.message);
  }
}


/**
 * 功能：更新左栏时钟。
 * 输入：无。
 * 输出：无返回值。
 */
function updateClock() {
  $('#clock').textContent = new Intl.DateTimeFormat('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date());
}


$('#equipment-form').addEventListener('submit', submitEquipment);
$('#inspection-form').addEventListener('submit', submitInspection);
$('#ticket-form').addEventListener('submit', submitTicket);
$('#ticket-list').addEventListener('click', advanceTicket);
updateClock();
window.setInterval(updateClock, 30_000);
loadData();
