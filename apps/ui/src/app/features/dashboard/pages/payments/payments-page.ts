import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject, signal } from '@angular/core';
import { PageLoader } from '../../../../shared/page-loader';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../../core/auth/auth.service';
import { PaymentsService, Statement } from '../../../../core/payments/payments.service';
import { StatementsPanel } from '../../../../shared/statements-panel';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-payments-page',
  standalone: true,
  imports: [RouterLink, PageLoader, StatementsPanel, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
@if (loading()) { <app-page-loader /> } @else {
<div class="pay">

  <!-- Sadece bayiler içindir -->
  @if (!isDealer()) {
    <div class="pay__guard">
      <i class="pi pi-info-circle"></i>
      <div>
        <h2>{{ 'pay.guardTitle' | t }}</h2>
        <p>
          {{ 'pay.guardText1' | t }} <a routerLink="/dashboard/orders">{{ 'dash.nav.orders' | t }}</a> {{ 'pay.guardText2' | t }}
        </p>
      </div>
    </div>
  } @else {

  <!-- HEADER -->
  <div class="pay__header">
    <div>
      <h1 class="pay__title">{{ 'dash.nav.payments' | t }}</h1>
    </div>
  </div>

  <app-statements-panel [statements]="statements()" />

  }
</div>
}
  `,
  styles: [`
    .pay { display: flex; flex-direction: column; gap: 1.5rem; }
    .pay__guard {
      display: flex; align-items: flex-start; gap: 1rem; max-width: 560px;
      background: #1a1d27; border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 1.75rem;
      i { font-size: 1.5rem; color: #60a5fa; flex-shrink: 0; }
      h2 { font-size: 1.05rem; color: #fff; margin: 0 0 0.4rem; }
      p { font-size: 0.85rem; color: rgba(255,255,255,0.55); margin: 0; line-height: 1.6; }
      a { color: #e63946; text-decoration: none; &:hover { text-decoration: underline; } }
    }
    .pay__title { font-size: 1.6rem; font-weight: 700; color: #fff; margin: 0; }
    .pay__sub   { font-size: 0.875rem; color: rgba(255,255,255,0.4); margin: 0.25rem 0 0; }
  `],
})
export class PaymentsPage implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly paymentsApi = inject(PaymentsService);
  private readonly cdr = inject(ChangeDetectorRef);
  protected readonly isDealer = this.auth.isDealer;

  protected readonly statements = signal<Statement[]>([]);
  protected readonly loading = signal(true);

  ngOnInit(): void {
    if (!this.isDealer()) { this.loading.set(false); return; }
    const cached = this.paymentsApi.peekStatements();
    if (cached) { this.statements.set(cached); this.loading.set(false); }

    this.paymentsApi.listStatements()
      .then(s => this.statements.set(s))
      .catch(() => { /* sessiz */ })
      .finally(() => { this.loading.set(false); this.cdr.markForCheck(); });
  }
}
