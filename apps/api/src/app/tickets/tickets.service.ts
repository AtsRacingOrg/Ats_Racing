import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateTicketDto } from './dto/ticket.dto';
import { TicketRow, TicketView, toTicketView } from './tickets.types';

const TICKET_SELECT =
  '*, order:orders(order_no,make,model,stage), ' +
  'messages:ticket_messages(sender,body,created_at)';

@Injectable()
export class TicketsService {
  private readonly logger = new Logger(TicketsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /** Yeni destek talebi (sipariş ile ilgili veya özel). */
  async create(token: string, dto: CreateTicketDto): Promise<{ id: string; ticketNo: string }> {
    const client = this.supabase.clientFor(token);
    const { data, error } = await client.rpc('create_ticket', { payload: dto });
    if (error) {
      this.logger.error(`create_ticket failed: ${error.message}`);
      throw new InternalServerErrorException('Talep oluşturulamadı.');
    }
    return data as { id: string; ticketNo: string };
  }

  /** Sahip yanıtı (atomik RPC: mesaj + durum). */
  async reply(token: string, ticketId: string, body: string): Promise<void> {
    const client = this.supabase.clientFor(token);
    const { error } = await client.rpc('reply_ticket', { p_ticket_id: ticketId, p_body: body });
    if (error) {
      this.logger.error(`reply_ticket failed: ${error.message}`);
      throw new InternalServerErrorException('Mesaj gönderilemedi.');
    }
  }

  async listMine(token: string): Promise<TicketView[]> {
    const client = this.supabase.clientFor(token);
    const { data, error } = await client
      .from('tickets')
      .select(TICKET_SELECT)
      .order('updated_at', { ascending: false })
      .returns<TicketRow[]>();
    if (error) {
      this.logger.error(`listMine failed: ${error.message}`);
      throw new InternalServerErrorException('Talepler getirilemedi.');
    }
    return (data ?? []).map(toTicketView);
  }

  /** Admin: tüm talepler + müşteri bilgisi (service-role). */
  async adminList(): Promise<TicketView[]> {
    const { data, error } = await this.supabase.admin
      .from('tickets')
      .select(`${TICKET_SELECT}, customer:profiles(full_name,email,phone)`)
      .order('updated_at', { ascending: false })
      .returns<TicketRow[]>();
    if (error) {
      this.logger.error(`adminList failed: ${error.message}`);
      throw new InternalServerErrorException('Talepler getirilemedi.');
    }
    return (data ?? []).map(toTicketView);
  }

  /** Admin yanıtı (support mesajı) — service-role, durumu pending yapar. */
  async adminReply(ticketId: string, body: string, adminId: string): Promise<TicketView> {
    const { error } = await this.supabase.admin.from('ticket_messages').insert({
      ticket_id: ticketId,
      sender: 'support',
      sender_id: adminId,
      body,
    });
    if (error) {
      this.logger.error(`adminReply failed: ${error.message}`);
      throw new InternalServerErrorException('Mesaj gönderilemedi.');
    }
    await this.supabase.admin.from('tickets').update({ status: 'pending' }).eq('id', ticketId).eq('status', 'open');
    return this.adminGetOne(ticketId);
  }

  async adminSetStatus(ticketId: string, status: string): Promise<TicketView> {
    const { error } = await this.supabase.admin
      .from('tickets')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', ticketId);
    if (error) {
      throw new InternalServerErrorException('Durum güncellenemedi.');
    }
    return this.adminGetOne(ticketId);
  }

  private async adminGetOne(ticketId: string): Promise<TicketView> {
    const { data } = await this.supabase.admin
      .from('tickets')
      .select(`${TICKET_SELECT}, customer:profiles(full_name,email,phone)`)
      .eq('id', ticketId)
      .single<TicketRow>();
    if (!data) {
      throw new NotFoundException('Talep bulunamadı.');
    }
    return toTicketView(data);
  }
}
