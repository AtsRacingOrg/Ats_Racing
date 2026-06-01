/* Sipariş DB satırları (snake) → API view (camel) eşlemeleri. */

export interface OrderItemRow { label: string; unit_price: string | number; }
export interface OrderPcodeRow { pcode: string | null; note: string | null; }
export interface OrderEventRow { event: string; actor_role: string | null; created_at: string; }
export interface TuningFileRow {
  kind: 'original' | 'delivered';
  file_name: string;
  status: string;
  is_downloadable: boolean;
}
export interface ProfileLite { full_name: string | null; email: string | null; phone: string | null; }

export interface OrderRow {
  id: string;
  order_no: string;
  created_at: string;
  make: string | null;
  model: string | null;
  year: number | null;
  engine_label: string | null;
  fuel: string | null;
  transmission: string | null;
  vin: string | null;
  km: string | null;
  plate: string | null;
  stage: string;
  ecu: string | null;
  reading_tool: string | null;
  virtual_file: boolean;
  dyno: boolean;
  ecu_hw: string | null;
  ecu_part: string | null;
  ecu_sw: string | null;
  modified_parts: string[] | null;
  base_price: string | number;
  extras_total: string | number;
  total_price: string | number;
  status: string;
  notes: string | null;
  items?: OrderItemRow[];
  pcodes?: OrderPcodeRow[];
  events?: OrderEventRow[];
  files?: TuningFileRow[];
  customer?: ProfileLite | null;
}

export interface OrderItemView { label: string; unitPrice: number; }
export interface OrderEventView { event: string; actorRole: string | null; createdAt: string; }
export interface TuningFileView { kind: 'original' | 'delivered'; fileName: string; status: string; isDownloadable: boolean; }

export interface OrderView {
  id: string;
  orderNo: string;
  createdAt: string;
  make: string | null;
  model: string | null;
  year: number | null;
  engineLabel: string | null;
  fuel: string | null;
  transmission: string | null;
  vin: string | null;
  km: string | null;
  plate: string | null;
  stage: string;
  ecu: string | null;
  readingTool: string | null;
  ecuHw: string | null;
  ecuPart: string | null;
  ecuSw: string | null;
  virtualFile: boolean;
  dyno: boolean;
  modifiedParts: string[];
  status: string;
  notes: string | null;
  basePrice: number;
  extrasTotal: number;
  totalPrice: number;
  items: OrderItemView[];
  pcodes: { pcode: string | null; note: string | null }[];
  events: OrderEventView[];
  files: TuningFileView[];
  customer?: { fullName: string | null; email: string | null; phone: string | null } | null;
}

export function toOrderView(r: OrderRow): OrderView {
  return {
    id: r.id,
    orderNo: r.order_no,
    createdAt: r.created_at,
    make: r.make,
    model: r.model,
    year: r.year,
    engineLabel: r.engine_label,
    fuel: r.fuel,
    transmission: r.transmission,
    vin: r.vin,
    km: r.km,
    plate: r.plate,
    stage: r.stage,
    ecu: r.ecu,
    readingTool: r.reading_tool,
    ecuHw: r.ecu_hw,
    ecuPart: r.ecu_part,
    ecuSw: r.ecu_sw,
    virtualFile: r.virtual_file,
    dyno: r.dyno,
    modifiedParts: r.modified_parts ?? [],
    status: r.status,
    notes: r.notes,
    basePrice: Number(r.base_price),
    extrasTotal: Number(r.extras_total),
    totalPrice: Number(r.total_price),
    items: (r.items ?? []).map((i) => ({ label: i.label, unitPrice: Number(i.unit_price) })),
    pcodes: (r.pcodes ?? []).map((p) => ({ pcode: p.pcode, note: p.note })),
    events: (r.events ?? []).map((e) => ({ event: e.event, actorRole: e.actor_role, createdAt: e.created_at })),
    files: (r.files ?? []).map((f) => ({
      kind: f.kind, fileName: f.file_name, status: f.status, isDownloadable: f.is_downloadable,
    })),
    customer: r.customer
      ? { fullName: r.customer.full_name, email: r.customer.email, phone: r.customer.phone }
      : null,
  };
}

/* ── Bayi ekstreleri ── */
export interface StatementOrderRow {
  order_no: string;
  created_at: string;
  make: string | null;
  model: string | null;
  stage: string;
  total_price: string | number;
}
export interface StatementRow {
  id: string;
  statement_no: string;
  period_year: number;
  period_month: number;
  due_date: string;
  status: string;
  total: string | number;
  paid_at: string | null;
  orders?: StatementOrderRow[];
}

export interface StatementView {
  id: string;
  statementNo: string;
  periodYear: number;
  periodMonth: number;
  dueDate: string;
  status: string;
  total: number;
  paidAt: string | null;
  orders: {
    orderNo: string;
    createdAt: string;
    make: string | null;
    model: string | null;
    stage: string;
    amount: number;
  }[];
}

export function toStatementView(r: StatementRow): StatementView {
  return {
    id: r.id,
    statementNo: r.statement_no,
    periodYear: r.period_year,
    periodMonth: r.period_month,
    dueDate: r.due_date,
    status: r.status,
    total: Number(r.total),
    paidAt: r.paid_at,
    orders: (r.orders ?? []).map((o) => ({
      orderNo: o.order_no,
      createdAt: o.created_at,
      make: o.make,
      model: o.model,
      stage: o.stage,
      amount: Number(o.total_price),
    })),
  };
}
