/* Ticket DB satırları (snake) → API view (camel). */

export interface TicketMessageRow {
  sender: 'user' | 'support';
  body: string;
  created_at: string;
}
export interface OrderLite { order_no: string; make: string | null; model: string | null; stage: string; }
export interface ProfileLite { full_name: string | null; email: string | null; phone: string | null; }

export interface TicketRow {
  id: string;
  ticket_no: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
  order_id: string | null;
  order?: OrderLite | null;
  messages?: TicketMessageRow[];
  customer?: ProfileLite | null;
}

export interface TicketMessageView {
  sender: 'user' | 'support';
  body: string;
  createdAt: string;
}
export interface TicketView {
  id: string;
  ticketNo: string;
  subject: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  orderId: string | null;
  orderNo: string | null;
  orderLabel: string | null;
  messages: TicketMessageView[];
  customer?: { fullName: string | null; email: string | null; phone: string | null } | null;
}

const STAGE_LABEL: Record<string, string> = { stage1: 'Stage 1', stage2: 'Stage 2', stage3: 'Stage 3' };

export function toTicketView(r: TicketRow): TicketView {
  const o = r.order;
  const orderLabel = o
    ? `${[o.make, o.model].filter(Boolean).join(' ')} · ${STAGE_LABEL[o.stage] ?? o.stage}`.trim()
    : null;
  return {
    id: r.id,
    ticketNo: r.ticket_no,
    subject: r.subject,
    status: r.status,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    orderId: r.order_id,
    orderNo: o?.order_no ?? null,
    orderLabel,
    messages: (r.messages ?? []).map((m) => ({
      sender: m.sender,
      body: m.body,
      createdAt: m.created_at,
    })),
    customer: r.customer
      ? { fullName: r.customer.full_name, email: r.customer.email, phone: r.customer.phone }
      : null,
  };
}
