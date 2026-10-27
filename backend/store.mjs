import fs from 'node:fs';
import path from 'node:path';


// INITIAL_DATA provides a realistic first-run dataset for the graduation demo.
const INITIAL_DATA = {
  equipment: [
    {
      id: 'EQ-001',
      name: '数字示波器',
      code: 'OSC-04',
      location: '电子实验室 A-12',
      category: '测量仪器',
      status: 'operational',
      owner: '林老师',
      lastInspectionAt: '2026-10-25T09:20:00.000Z',
    },
    {
      id: 'EQ-002',
      name: '恒温培养箱',
      code: 'INC-02',
      location: '生物实验室 C-03',
      category: '环境设备',
      status: 'maintenance',
      owner: '陈老师',
      lastInspectionAt: '2026-10-26T02:35:00.000Z',
    },
    {
      id: 'EQ-003',
      name: '网络分析仪',
      code: 'NET-07',
      location: '通信实验室 B-08',
      category: '测量仪器',
      status: 'operational',
      owner: '赵老师',
      lastInspectionAt: '2026-10-24T07:10:00.000Z',
    },
    {
      id: 'EQ-004',
      name: '三维打印机',
      code: 'PRN-01',
      location: '智能制造室 D-06',
      category: '制造设备',
      status: 'maintenance',
      owner: '周老师',
      lastInspectionAt: '2026-10-23T11:40:00.000Z',
    },
  ],
  inspections: [
    {
      id: 'IN-001',
      equipmentId: 'EQ-002',
      inspector: '陈同学',
      result: 'issue',
      note: '冷却风扇有间歇性异响，温度波动偏大。',
      createdAt: '2026-10-26T02:35:00.000Z',
    },
    {
      id: 'IN-002',
      equipmentId: 'EQ-001',
      inspector: '李同学',
      result: 'pass',
      note: '探头校准和通道响应正常。',
      createdAt: '2026-10-25T09:20:00.000Z',
    },
  ],
  tickets: [
    {
      id: 'WO-001',
      equipmentId: 'EQ-002',
      title: '培养箱冷却风扇异响',
      severity: 'high',
      status: 'repairing',
      assignee: '维修组 A',
      createdAt: '2026-10-26T03:00:00.000Z',
      updatedAt: '2026-10-27T01:10:00.000Z',
    },
    {
      id: 'WO-002',
      equipmentId: 'EQ-004',
      title: '喷头供料不稳定',
      severity: 'medium',
      status: 'open',
      assignee: '',
      createdAt: '2026-10-27T02:10:00.000Z',
      updatedAt: '2026-10-27T02:10:00.000Z',
    },
  ],
};


/**
 * 功能：深拷贝 JSON 数据，隔离调用方与存储内部状态。
 * 输入：value 为可被 structuredClone 处理的数据。
 * 输出：独立副本。
 */
function clone(value) {
  return structuredClone(value);
}


/**
 * 功能：生成指定集合的下一个业务编号。
 * 输入：collectionName 为集合名，items 为当前记录数组，prefix 为编号前缀。
 * 输出：形如 PREFIX-005 的编号。
 */
function nextId(collectionName, items, prefix) {
  const highest = items.reduce((max, item) => {
    const match = new RegExp(`^${prefix}-(\\d+)$`).exec(item.id || '');
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `${prefix}-${String(highest + 1).padStart(3, '0')}`;
}


/**
 * 功能：创建带 JSON 持久化的数据仓库。
 * 输入：filePath 为数据文件路径，seedData 为可选初始数据。
 * 输出：提供列表、插入、工单更新和统计方法的仓库对象。
 */
export function createStore(filePath, seedData = INITIAL_DATA) {
  let data;
  if (fs.existsSync(filePath)) {
    data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } else {
    data = clone(seedData);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  if (!Array.isArray(data.equipment)) data.equipment = [];
  if (!Array.isArray(data.inspections)) data.inspections = [];
  if (!Array.isArray(data.tickets)) data.tickets = [];

  /**
   * 功能：将当前仓库数据写回 JSON 文件。
   * 输入：无。
   * 输出：无返回值；写入失败时抛出异常。
   */
  function persist() {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  return {
    /**
     * 功能：读取一个集合的副本。
     * 输入：collectionName 为 equipment、inspections 或 tickets。
     * 输出：记录数组副本；非法集合返回空数组。
     */
    getAll(collectionName) {
      return clone(data[collectionName] || []);
    },

    /**
     * 功能：向设备、巡检或工单集合插入记录。
     * 输入：collectionName 为集合名，record 为不含业务 ID 的记录。
     * 输出：已分配 ID 并持久化的记录副本。
     */
    insert(collectionName, record) {
      const definitions = {
        equipment: 'EQ',
        inspections: 'IN',
        tickets: 'WO',
      };
      const prefix = definitions[collectionName];
      if (!prefix) throw new Error(`Unsupported collection: ${collectionName}`);
      const item = { id: nextId(collectionName, data[collectionName], prefix), ...record };
      data[collectionName].unshift(item);
      persist();
      return clone(item);
    },

    /**
     * 功能：更新一条工单。
     * 输入：ticketId 为工单 ID，patch 为 status 或 assignee 更新。
     * 输出：更新后的工单；不存在时返回 null。
     */
    updateTicket(ticketId, patch) {
      const index = data.tickets.findIndex((item) => item.id === ticketId);
      if (index === -1) return null;
      data.tickets[index] = {
        ...data.tickets[index],
        ...patch,
        updatedAt: new Date().toISOString(),
      };
      persist();
      return clone(data.tickets[index]);
    },

    /**
     * 功能：计算首页运营指标。
     * 输入：无。
     * 输出：设备、巡检和工单统计对象。
     */
    stats() {
      const equipmentTotal = data.equipment.length;
      const operational = data.equipment.filter((item) => item.status === 'operational').length;
      const maintenance = data.equipment.filter((item) => item.status === 'maintenance').length;
      const openTickets = data.tickets.filter((item) => item.status !== 'closed').length;
      const highPriority = data.tickets.filter(
        (item) => item.severity === 'high' && item.status !== 'closed',
      ).length;
      const closedTickets = data.tickets.filter((item) => item.status === 'closed').length;
      return {
        equipmentTotal,
        operational,
        maintenance,
        inspections: data.inspections.length,
        openTickets,
        highPriority,
        completionRate: data.tickets.length
          ? Math.round((closedTickets / data.tickets.length) * 100)
          : 0,
      };
    },
  };
}


export { INITIAL_DATA };
