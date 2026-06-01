import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Statement } from '../payments/payments.service';

export type RegStatus = 'pending' | 'approved' | 'rejected';

export interface Registration {
  id: string;
  email: string;
  role: 'user' | 'dealer' | 'admin';
  fullName: string;
  phone?: string | null;
  dealershipName?: string | null;
  status: RegStatus;
  rejectionReason?: string | null;
  createdAt: string;
}

export interface AdminUserOrder {
  orderNo: string;
  vehicle: string;
  stage: string;
  date: string;
  price: number;
  status: string;
}
export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'dealer' | 'admin';
  status: RegStatus;
  company: string | null;
  phone: string | null;
  createdAt: string;
  orderCount: number;
  totalSpent: number;
  orders: AdminUserOrder[];
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly api  = environment.apiUrl;

  // Bearer token is attached automatically by authInterceptor.

  listUsers(): Promise<AdminUserRow[]> {
    return firstValueFrom(this.http.get<AdminUserRow[]>(`${this.api}/admin/users`));
  }

  listDealerStatements(userId: string): Promise<Statement[]> {
    return firstValueFrom(this.http.get<Statement[]>(`${this.api}/admin/users/${userId}/statements`));
  }

  listRegistrations(status?: RegStatus): Promise<Registration[]> {
    const params = status ? `?status=${status}` : '';
    return firstValueFrom(
      this.http.get<Registration[]>(`${this.api}/admin/registrations${params}`),
    );
  }

  approve(id: string): Promise<Registration> {
    return firstValueFrom(
      this.http.post<Registration>(`${this.api}/admin/registrations/${id}/approve`, {}),
    );
  }

  reject(id: string, reason: string): Promise<Registration> {
    return firstValueFrom(
      this.http.post<Registration>(`${this.api}/admin/registrations/${id}/reject`, { reason }),
    );
  }
}
