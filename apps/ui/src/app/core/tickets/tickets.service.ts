import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Swr } from '../../shared/swr';

export type TicketStatus = 'open' | 'pending' | 'resolved';

export interface TicketMessage {
  sender: 'user' | 'support';
  body: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  ticketNo: string;
  subject: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
  orderId: string | null;
  orderNo: string | null;
  orderLabel: string | null;
  messages: TicketMessage[];
  customer?: { fullName: string | null; email: string | null; phone: string | null } | null;
}

export interface CreateTicketPayload {
  subject: string;
  message: string;
  orderId?: string;
}

@Injectable({ providedIn: 'root' })
export class TicketsService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  private readonly _myTickets = new Swr<Ticket[]>();
  private readonly _adminTickets = new Swr<Ticket[]>();

  peekMyTickets(): Ticket[] | null { return this._myTickets.peek(); }
  peekAdminTickets(): Ticket[] | null { return this._adminTickets.peek(); }
  private invalidate(): void { this._myTickets.clear(); this._adminTickets.clear(); }
  clearCache(): void { this.invalidate(); }

  createTicket(payload: CreateTicketPayload): Promise<{ id: string; ticketNo: string }> {
    return firstValueFrom(this.http.post<{ id: string; ticketNo: string }>(`${this.api}/tickets`, payload))
      .then(r => { this.invalidate(); return r; });
  }

  listMyTickets(): Promise<Ticket[]> {
    return this._myTickets.revalidate(
      () => firstValueFrom(this.http.get<Ticket[]>(`${this.api}/tickets`)),
    );
  }

  reply(id: string, body: string): Promise<void> {
    return firstValueFrom(this.http.post<void>(`${this.api}/tickets/${id}/reply`, { body }))
      .then(() => { this.invalidate(); });
  }

  /* ── Admin ── */
  adminListTickets(): Promise<Ticket[]> {
    return this._adminTickets.revalidate(
      () => firstValueFrom(this.http.get<Ticket[]>(`${this.api}/admin/tickets`)),
    );
  }

  adminReply(id: string, body: string): Promise<Ticket> {
    return firstValueFrom(this.http.post<Ticket>(`${this.api}/admin/tickets/${id}/reply`, { body }))
      .then(r => { this.invalidate(); return r; });
  }

  adminSetStatus(id: string, status: TicketStatus): Promise<Ticket> {
    return firstValueFrom(this.http.post<Ticket>(`${this.api}/admin/tickets/${id}/status`, { status }))
      .then(r => { this.invalidate(); return r; });
  }
}
