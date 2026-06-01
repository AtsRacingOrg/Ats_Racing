import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export type StatementStatus = 'accruing' | 'due' | 'paid' | 'overdue';

export interface StatementOrder {
  orderNo: string;
  createdAt: string;
  make: string | null;
  model: string | null;
  stage: string;
  amount: number;
}

export interface Statement {
  id: string;
  statementNo: string;
  periodYear: number;
  periodMonth: number;
  dueDate: string;
  status: StatementStatus;
  total: number;
  paidAt: string | null;
  orders: StatementOrder[];
}

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private readonly http = inject(HttpClient);
  private readonly api = environment.apiUrl;

  listStatements(): Promise<Statement[]> {
    return firstValueFrom(this.http.get<Statement[]>(`${this.api}/payments/statements`));
  }
}
