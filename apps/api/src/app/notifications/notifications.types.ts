/* Bildirim DB satırı (snake) → API view (camel). */

export interface NotificationRow {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  category: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

export interface NotificationView {
  id: string;
  type: string;
  title: string;
  body: string | null;
  category: string;
  link: string | null;
  read: boolean;
  createdAt: string;
}

export interface NotificationSummary {
  total: number;
  byCategory: Record<string, number>;
}

export function toNotificationView(r: NotificationRow): NotificationView {
  return {
    id: r.id,
    type: r.type,
    title: r.title,
    body: r.body,
    category: r.category,
    link: r.link,
    read: r.read_at !== null,
    createdAt: r.created_at,
  };
}
