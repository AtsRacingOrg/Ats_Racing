import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  NotificationRow,
  NotificationSummary,
  NotificationView,
  toNotificationView,
} from './notifications.types';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /** Kullanıcının son bildirimleri (en yeni önce, varsayılan 30). */
  async listMine(userId: string, limit = 30): Promise<NotificationView[]> {
    const { data, error } = await this.supabase.admin
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)
      .returns<NotificationRow[]>();
    if (error) {
      this.logger.error(`listMine failed: ${error.message}`);
      throw new InternalServerErrorException('Bildirimler getirilemedi.');
    }
    return (data ?? []).map(toNotificationView);
  }

  /** Okunmamış bildirim sayıları (toplam + kategori bazlı: orders / tickets). */
  async summary(userId: string): Promise<NotificationSummary> {
    const { data, error } = await this.supabase.admin
      .from('notifications')
      .select('category')
      .eq('user_id', userId)
      .is('read_at', null)
      .returns<{ category: string }[]>();
    if (error) {
      this.logger.error(`summary failed: ${error.message}`);
      throw new InternalServerErrorException('Bildirim özeti getirilemedi.');
    }
    const byCategory: Record<string, number> = {};
    for (const r of data ?? []) {
      byCategory[r.category] = (byCategory[r.category] ?? 0) + 1;
    }
    return { total: (data ?? []).length, byCategory };
  }

  /** Tek bir bildirimi okundu işaretler. */
  async markRead(userId: string, id: string): Promise<{ ok: boolean }> {
    const { error } = await this.supabase.admin
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId)
      .is('read_at', null);
    if (error) {
      this.logger.error(`markRead failed: ${error.message}`);
      throw new InternalServerErrorException('Bildirim güncellenemedi.');
    }
    return { ok: true };
  }

  /** Tüm (veya kategoriye ait) okunmamış bildirimleri okundu işaretler. */
  async markAllRead(userId: string, category?: string): Promise<{ ok: boolean }> {
    let query = this.supabase.admin
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);
    if (category) {
      query = query.eq('category', category);
    }
    const { error } = await query;
    if (error) {
      this.logger.error(`markAllRead failed: ${error.message}`);
      throw new InternalServerErrorException('Bildirimler güncellenemedi.');
    }
    return { ok: true };
  }
}
