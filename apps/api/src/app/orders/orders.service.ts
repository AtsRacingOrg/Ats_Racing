import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { PaytrService } from '../payments/paytr.service';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  OrderRow,
  OrderView,
  StatementRow,
  StatementView,
  toOrderView,
  toStatementView,
} from './orders.types';

/** FileInterceptor'ın doldurduğu alanlar (multer @types bağımlılığı olmadan). */
export interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const ORDER_SELECT =
  '*, items:order_items(label,unit_price), pcodes:order_pcodes(pcode,note), ' +
  'events:order_events(event,actor_role,created_at), ' +
  'files:tuning_files(kind,file_name,status,is_downloadable,notes)';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly paytr: PaytrService,
  ) {}

  /**
   * Tamamlanmamış (pending/processing) siparişler için 1-bazlı kuyruk sırasını hesaplar.
   * Created_at artan sırayla — en eski = 1. Tamamlandı/iptalde sıra `null` döner.
   */
  private async enrichQueuePositions(views: OrderView[]): Promise<OrderView[]> {
    if (views.length === 0) { return views; }
    const { data } = await this.supabase.admin
      .from('orders')
      .select('id, created_at')
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: true })
      .returns<{ id: string; created_at: string }[]>();
    const rows = data ?? [];
    const total = rows.length;
    const positionById = new Map<string, number>();
    rows.forEach((r, idx) => positionById.set(r.id, idx + 1));
    return views.map(v => ({
      ...v,
      queuePosition: positionById.get(v.id) ?? null,
      queueTotal: total,
    }));
  }

  private async enrichOne(view: OrderView): Promise<OrderView> {
    const [enriched] = await this.enrichQueuePositions([view]);
    return enriched;
  }

  /** Atomik sipariş oluşturma — fiyatı server hesaplar (create_order RPC). */
  async create(token: string, dto: CreateOrderDto): Promise<{ id: string; orderNo: string; total: number }> {
    const client = this.supabase.clientFor(token);
    const { data, error } = await client.rpc('create_order', { payload: dto });
    if (error) {
      if (/billing required/i.test(error.message)) {
        throw new BadRequestException('Sipariş vermek için önce fatura bilgilerinizi tanımlamalısınız.');
      }
      this.logger.error(`create_order failed: ${error.message}`);
      throw new InternalServerErrorException('Sipariş oluşturulamadı.');
    }
    const res = data as { id: string; orderNo: string; total: number };
    return res;
  }

  /** Orijinal ECU dosyasını Storage'a yükler + tuning_files satırı + event. */
  async uploadOriginalFile(userId: string, orderId: string, file: UploadedFileLike | undefined) {
    if (!file) {
      throw new BadRequestException('Dosya bulunamadı.');
    }
    // Sahiplik doğrula
    const { data: order } = await this.supabase.admin
      .from('orders')
      .select('id, user_id')
      .eq('id', orderId)
      .single<{ id: string; user_id: string }>();
    if (!order) {
      throw new NotFoundException('Sipariş bulunamadı.');
    }
    if (order.user_id !== userId) {
      throw new ForbiddenException('Bu siparişe dosya yükleyemezsiniz.');
    }

    const safeName = file.originalname.replace(/[^\w.-]+/g, '_');
    const path = `${userId}/${orderId}/original_${Date.now()}_${safeName}`;

    const up = await this.supabase.admin.storage
      .from('tuning-files')
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: true });
    if (up.error) {
      this.logger.error(`storage upload failed: ${up.error.message}`);
      throw new InternalServerErrorException('Dosya yüklenemedi.');
    }

    const { error: insErr } = await this.supabase.admin.from('tuning_files').insert({
      order_id: orderId,
      user_id: userId,
      kind: 'original',
      file_name: file.originalname,
      storage_path: path,
      status: 'review',
    });
    if (insErr) {
      this.logger.error(`tuning_files insert failed: ${insErr.message}`);
      throw new InternalServerErrorException('Dosya kaydı oluşturulamadı.');
    }

    await this.supabase.admin.from('order_events').insert({
      order_id: orderId,
      event: 'Orijinal dosya yüklendi',
      actor_role: 'user',
      actor_id: userId,
    });

    return { ok: true, fileName: file.originalname };
  }

  /** Sahibin siparişleri (RLS owner). */
  async listMine(token: string): Promise<OrderView[]> {
    const client = this.supabase.clientFor(token);
    const { data, error } = await client
      .from('orders')
      .select(ORDER_SELECT)
      .order('created_at', { ascending: false })
      .returns<OrderRow[]>();
    if (error) {
      this.logger.error(`listMine failed: ${error.message}`);
      throw new InternalServerErrorException('Siparişler getirilemedi.');
    }
    return this.enrichQueuePositions((data ?? []).map(toOrderView));
  }

  async getOne(token: string, id: string): Promise<OrderView> {
    const client = this.supabase.clientFor(token);
    const { data, error } = await client
      .from('orders')
      .select(ORDER_SELECT)
      .eq('id', id)
      .single<OrderRow>();
    if (error || !data) {
      throw new NotFoundException('Sipariş bulunamadı.');
    }
    return this.enrichOne(toOrderView(data));
  }

  /** Admin: tüm siparişler + müşteri bilgisi (service-role, RLS bypass). */
  async adminList(): Promise<OrderView[]> {
    const { data, error } = await this.supabase.admin
      .from('orders')
      .select(`${ORDER_SELECT}, customer:profiles(full_name,email,phone,role)`)
      .order('created_at', { ascending: false })
      .returns<OrderRow[]>();
    if (error) {
      this.logger.error(`adminList failed: ${error.message}`);
      throw new InternalServerErrorException('Siparişler getirilemedi.');
    }
    return this.enrichQueuePositions((data ?? []).map(toOrderView));
  }

  async adminSetStatus(id: string, status: string, adminId: string, reason?: string | null): Promise<OrderView> {
    const trimmedReason = (reason ?? '').trim() || null;
    const update: Record<string, unknown> = { status, updated_at: new Date().toISOString() };
    if (status === 'cancelled') {
      update.cancellation_reason = trimmedReason;
    } else {
      // Eski iptal nedeni varsa statü tekrar açılırken temizle.
      update.cancellation_reason = null;
    }
    const { data, error } = await this.supabase.admin
      .from('orders')
      .update(update)
      .eq('id', id)
      .select('id')
      .single<{ id: string }>();
    if (error || !data) {
      throw new NotFoundException('Sipariş bulunamadı veya güncellenemedi.');
    }
    const labels: Record<string, string> = {
      pending: 'Hazırlanıyor', processing: 'Hazırlanıyor', completed: 'Tamamlandı', cancelled: 'İptal edildi',
    };
    const eventText = status === 'cancelled' && trimmedReason
      ? `Durum: ${labels[status]} — Sebep: ${trimmedReason}`
      : `Durum: ${labels[status] ?? status}`;
    await this.supabase.admin.from('order_events').insert({
      order_id: id,
      event: eventText,
      actor_role: 'admin',
      actor_id: adminId,
    });

    // İptalde normal müşterinin peşin ödemesini iade et (PayTR).
    if (status === 'cancelled') {
      await this.refundOrderPayment(id, adminId);
    }

    // Güncel kaydı admin select ile döndür
    const { data: full } = await this.supabase.admin
      .from('orders')
      .select(`${ORDER_SELECT}, customer:profiles(full_name,email,phone,role)`)
      .eq('id', id)
      .single<OrderRow>();
    return this.enrichOne(toOrderView(full as OrderRow));
  }

  /**
   * Sipariş iptalinde normal müşterinin (kart) ödemesini iade eder.
   *  • Bayilerde sipariş ödemesi yoktur (ekstre/cari) — kayıt bulunmaz, atlanır.
   *  • succeeded → PayTR iadesi yapılır, status='refunded' + refunded_at/refund_ref.
   *  • pending  → henüz tahsil edilmemiş; status='failed' (para alınmadı).
   *  • refunded → zaten iade edilmiş, idempotent atlanır.
   * İade başarısız olursa sipariş yine iptal kalır; ödeme dokunulmaz, hata loglanır
   * (admin manuel iade edebilir) — iptali bloklamamak için throw edilmez.
   */
  private async refundOrderPayment(orderId: string, adminId: string): Promise<void> {
    const { data: pay } = await this.supabase.admin
      .from('payments')
      .select('id, amount, status, provider_ref')
      .eq('order_id', orderId)
      .maybeSingle<{ id: string; amount: number; status: string; provider_ref: string | null }>();

    if (!pay || pay.status === 'refunded' || pay.status === 'failed') {
      return; // bayi (kayıt yok) veya zaten kapanmış ödeme
    }

    // Henüz tahsil edilmemiş ödeme: iade gerekmez, sadece kapat.
    if (pay.status === 'pending') {
      await this.supabase.admin.from('payments')
        .update({ status: 'failed' }).eq('id', pay.id);
      return;
    }

    // status === 'succeeded' → gerçek iade.
    try {
      const res = await this.paytr.refund({
        paymentId: pay.id,
        providerRef: pay.provider_ref,
        amount: Number(pay.amount),
      });
      if (!res.ok) { throw new Error('PayTR iade reddetti'); }

      await this.supabase.admin.from('payments').update({
        status: 'refunded',
        refunded_at: new Date().toISOString(),
        refund_ref: res.refundRef,
      }).eq('id', pay.id);

      await this.supabase.admin.from('order_events').insert({
        order_id: orderId,
        event: `Ödeme iade edildi (₺${Number(pay.amount).toLocaleString('tr-TR')})`,
        actor_role: 'admin',
        actor_id: adminId,
      });
    } catch (err) {
      this.logger.error(
        `refund failed for order ${orderId} (payment ${pay.id}): ${(err as Error).message}`,
      );
      await this.supabase.admin.from('order_events').insert({
        order_id: orderId,
        event: 'Ödeme iadesi başarısız — manuel iade gerekiyor',
        actor_role: 'admin',
        actor_id: adminId,
      });
    }
  }

  /** Admin: hazırlanan dosyayı müşteriye teslim eder (Storage + tuning_files + event + completed). */
  async adminDeliverFile(orderId: string, file: UploadedFileLike | undefined, adminId: string, note?: string | null): Promise<OrderView> {
    if (!file) {
      throw new BadRequestException('Dosya bulunamadı.');
    }
    const { data: order } = await this.supabase.admin
      .from('orders')
      .select('id, user_id')
      .eq('id', orderId)
      .single<{ id: string; user_id: string }>();
    if (!order) {
      throw new NotFoundException('Sipariş bulunamadı.');
    }

    const safeName = file.originalname.replace(/[^\w.-]+/g, '_');
    const path = `${order.user_id}/${orderId}/delivered_${Date.now()}_${safeName}`;
    const up = await this.supabase.admin.storage
      .from('tuning-files')
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: true });
    if (up.error) {
      this.logger.error(`deliver upload failed: ${up.error.message}`);
      throw new InternalServerErrorException('Dosya yüklenemedi.');
    }

    const trimmedNote = (note ?? '').trim();
    await this.supabase.admin.from('tuning_files').insert({
      order_id: orderId,
      user_id: order.user_id,
      kind: 'delivered',
      file_name: file.originalname,
      storage_path: path,
      status: 'delivered',
      is_downloadable: true,
      delivery_date: new Date().toISOString(),
      notes: trimmedNote ? trimmedNote : null,
    });
    await this.supabase.admin.from('orders').update({ status: 'completed', updated_at: new Date().toISOString() }).eq('id', orderId);
    await this.supabase.admin.from('order_events').insert({
      order_id: orderId,
      event: 'Yazılım dosyası müşteriye gönderildi',
      actor_role: 'admin',
      actor_id: adminId,
    });

    const { data: full } = await this.supabase.admin
      .from('orders')
      .select(`${ORDER_SELECT}, customer:profiles(full_name,email,phone,role)`)
      .eq('id', orderId)
      .single<OrderRow>();
    return this.enrichOne(toOrderView(full as OrderRow));
  }

  /** Admin: gönderilmiş yazılım dosyasına eklenen notu günceller (dosyayı tekrar yüklemeden). */
  async adminUpdateDeliveredNote(orderId: string, note: string | null | undefined): Promise<OrderView> {
    const { data: latest } = await this.supabase.admin
      .from('tuning_files')
      .select('id')
      .eq('order_id', orderId)
      .eq('kind', 'delivered')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ id: string }>();
    if (!latest) {
      throw new NotFoundException('Gönderilmiş dosya bulunamadı.');
    }
    const trimmed = (note ?? '').trim();
    await this.supabase.admin
      .from('tuning_files')
      .update({ notes: trimmed ? trimmed : null })
      .eq('id', latest.id);

    const { data: full } = await this.supabase.admin
      .from('orders')
      .select(`${ORDER_SELECT}, customer:profiles(full_name,email,phone,role)`)
      .eq('id', orderId)
      .single<OrderRow>();
    return this.enrichOne(toOrderView(full as OrderRow));
  }

  /** Dosya için imzalı indirme linki (sahip/admin RLS ile doğrulanır). */
  async getDownloadUrl(
    token: string,
    orderId: string,
    kind: 'original' | 'delivered' = 'delivered',
  ): Promise<{ url: string; fileName: string }> {
    const client = this.supabase.clientFor(token);
    const { data: f } = await client
      .from('tuning_files')
      .select('file_name, storage_path, is_downloadable')
      .eq('order_id', orderId)
      .eq('kind', kind)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle<{ file_name: string; storage_path: string; is_downloadable: boolean }>();
    if (!f || (kind === 'delivered' && !f.is_downloadable)) {
      throw new NotFoundException('İndirilebilir dosya bulunamadı.');
    }
    const signed = await this.supabase.admin.storage
      .from('tuning-files')
      .createSignedUrl(f.storage_path, 120, { download: f.file_name });
    if (signed.error || !signed.data) {
      throw new InternalServerErrorException('İndirme linki oluşturulamadı.');
    }
    return { url: signed.data.signedUrl, fileName: f.file_name };
  }

  /** Bayi ekstreleri (Ödeme Borçlarım). */
  async listStatements(token: string): Promise<StatementView[]> {
    const client = this.supabase.clientFor(token);
    const { data, error } = await client
      .from('dealer_statements')
      .select('*, orders(order_no,created_at,make,model,stage,total_price,status)')
      .order('period_year', { ascending: false })
      .order('period_month', { ascending: false })
      .returns<StatementRow[]>();
    if (error) {
      this.logger.error(`listStatements failed: ${error.message}`);
      throw new InternalServerErrorException('Ekstreler getirilemedi.');
    }
    return (data ?? []).map(toStatementView);
  }

  /**
   * Bayi ekstresini öder (MOCK gateway — gerçek tahsilat yok).
   *  • Sahiplik doğrulanır; yalnızca 'due'/'overdue' ekstre ödenebilir.
   *  • Ekstre 'paid' + paid_at olur, succeeded bir payments kaydı atılır.
   * PayTR gerçek olunca yalnızca buradaki tahsilat adımı değişecek.
   */
  async payStatement(userId: string, statementId: string): Promise<StatementView> {
    const { data: st } = await this.supabase.admin
      .from('dealer_statements')
      .select('id, dealer_id, status, total')
      .eq('id', statementId)
      .maybeSingle<{ id: string; dealer_id: string; status: string; total: number }>();

    if (!st || st.dealer_id !== userId) {
      throw new NotFoundException('Ekstre bulunamadı.');
    }
    if (st.status === 'paid') {
      throw new BadRequestException('Bu ekstre zaten ödendi.');
    }
    if (st.status !== 'due' && st.status !== 'overdue') {
      throw new BadRequestException('Bu dönem henüz ödemeye kapanmadı.');
    }

    const paidAt = new Date().toISOString();
    const { error: upErr } = await this.supabase.admin
      .from('dealer_statements')
      .update({ status: 'paid', paid_at: paidAt })
      .eq('id', statementId);
    if (upErr) {
      this.logger.error(`payStatement update failed: ${upErr.message}`);
      throw new InternalServerErrorException('Ödeme kaydedilemedi.');
    }

    // MOCK tahsilat kaydı (PayTR gelince provider_ref gerçek referans olur).
    await this.supabase.admin.from('payments').insert({
      user_id: userId,
      statement_id: statementId,
      amount: st.total,
      method: 'card',
      status: 'succeeded',
      paid_at: paidAt,
      provider_ref: `MOCK-${Date.now()}`,
    });

    const { data: full } = await this.supabase.admin
      .from('dealer_statements')
      .select('*, orders(order_no,created_at,make,model,stage,total_price,status)')
      .eq('id', statementId)
      .single<StatementRow>();
    return toStatementView(full as StatementRow);
  }
}
