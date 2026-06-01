import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import {
  AccountStatus,
  ProfileRow,
  RegistrationView,
  toRegistrationView,
} from '../auth/auth.types';

export interface AdminUserOrder {
  orderNo: string;
  vehicle: string;
  stage: string;
  date: string;
  price: number;
  status: string;
}
export interface AdminUserView {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  company: string | null;
  phone: string | null;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
  orders: AdminUserOrder[];
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /** Tüm kullanıcılar + sipariş sayısı/toplamı + sipariş geçmişi. */
  async listUsers(): Promise<AdminUserView[]> {
    const { data: profiles, error: pErr } = await this.supabase.admin
      .from('profiles')
      .select('id, full_name, email, role, status, dealership_name, phone, created_at')
      .order('created_at', { ascending: false })
      .returns<{
        id: string; full_name: string | null; email: string | null; role: string;
        status: string; dealership_name: string | null; phone: string | null; created_at: string;
      }[]>();
    if (pErr) {
      this.logger.error(`listUsers profiles failed: ${pErr.message}`);
      throw new InternalServerErrorException('Kullanıcılar getirilemedi.');
    }

    const { data: orders } = await this.supabase.admin
      .from('orders')
      .select('user_id, order_no, make, model, stage, total_price, status, created_at')
      .order('created_at', { ascending: false })
      .returns<{
        user_id: string; order_no: string; make: string | null; model: string | null;
        stage: string; total_price: string | number; status: string; created_at: string;
      }[]>();

    const byUser = new Map<string, AdminUserOrder[]>();
    for (const o of orders ?? []) {
      const list = byUser.get(o.user_id) ?? [];
      list.push({
        orderNo: o.order_no,
        vehicle: [o.make, o.model].filter(Boolean).join(' ') || 'Araç',
        stage: o.stage,
        date: o.created_at,
        price: Number(o.total_price),
        status: o.status,
      });
      byUser.set(o.user_id, list);
    }

    return (profiles ?? []).map((p) => {
      const userOrders = byUser.get(p.id) ?? [];
      return {
        id: p.id,
        name: p.full_name ?? '—',
        email: p.email ?? '',
        role: p.role,
        status: p.status,
        company: p.dealership_name,
        phone: p.phone,
        createdAt: p.created_at,
        orderCount: userOrders.length,
        totalSpent: userOrders.reduce((s, o) => s + o.price, 0),
        orders: userOrders,
      };
    });
  }

  /** List registrations, optionally filtered by status (newest first). */
  async listRegistrations(status?: AccountStatus): Promise<RegistrationView[]> {
    let query = this.supabase.admin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query.returns<ProfileRow[]>();
    if (error) {
      this.logger.error(`listRegistrations failed: ${error.message}`);
      throw new InternalServerErrorException('Kayıtlar getirilemedi.');
    }
    return (data ?? []).map(toRegistrationView);
  }

  async approve(id: string, adminId: string): Promise<RegistrationView> {
    return this.setStatus(id, adminId, 'approved', null);
  }

  async reject(
    id: string,
    adminId: string,
    reason: string,
  ): Promise<RegistrationView> {
    return this.setStatus(id, adminId, 'rejected', reason);
  }

  private async setStatus(
    id: string,
    adminId: string,
    status: AccountStatus,
    rejectionReason: string | null,
  ): Promise<RegistrationView> {
    const { data, error } = await this.supabase.admin
      .from('profiles')
      .update({
        status,
        rejection_reason: rejectionReason,
        approved_by: adminId,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('*')
      .single<ProfileRow>();

    if (error) {
      this.logger.error(`setStatus(${status}) failed for ${id}: ${error.message}`);
      throw new InternalServerErrorException('Durum güncellenemedi.');
    }
    if (!data) {
      throw new NotFoundException('Kayıt bulunamadı.');
    }
    return toRegistrationView(data);
  }
}
