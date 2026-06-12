import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AccountService } from '../../../../core/account/account.service';
import { AuthService } from '../../../../core/auth/auth.service';
import { TranslatePipe } from '../../../../core/i18n/translate.pipe';
import { I18nService } from '../../../../core/i18n/i18n.service';

@Component({
  selector: 'app-admin-profile-page',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<div class="apf">
  <header class="apf__head">
    <h1>{{ 'dash.nav.profile' | t }}</h1>
    <p>{{ 'pr.sub' | t }}</p>
  </header>

  <div class="apf__grid">
    <!-- Hesap bilgileri -->
    <section class="apf__card">
      <h2><i class="pi pi-user"></i> {{ 'pr.account' | t }}</h2>

      <label class="apf__lbl">{{ 'auth.email' | t }}</label>
      <input class="apf__input" [value]="account()?.email || ''" disabled />

      <label class="apf__lbl">{{ 'auth.fullName' | t }}</label>
      <input class="apf__input" [(ngModel)]="fullName" name="fullName" />

      <label class="apf__lbl">{{ 'pr.phone' | t }}</label>
      <input class="apf__input" [(ngModel)]="phone" name="phone" />

      <button class="apf__btn" [disabled]="savingProfile()" (click)="saveProfile()">
        {{ savingProfile() ? ('pr.saving' | t) : ('common.save' | t) }}
      </button>
      @if (profileMsg()) { <p class="apf__msg" [class.apf__msg--err]="profileErr()">{{ profileMsg() }}</p> }
    </section>

    <!-- Şifre değiştir -->
    <section class="apf__card">
      <h2><i class="pi pi-lock"></i> {{ 'pr.changePw' | t }}</h2>

      <label class="apf__lbl">{{ 'pr.newPw' | t }}</label>
      <input class="apf__input" type="password" [(ngModel)]="newPw" name="newPw" [placeholder]="'pr.newPwPh' | t" />

      <label class="apf__lbl">{{ 'pr.newPw2' | t }}</label>
      <input class="apf__input" type="password" [(ngModel)]="newPw2" name="newPw2" [placeholder]="'pr.repeat' | t" />

      <button class="apf__btn" [disabled]="savingPw()" (click)="changePw()">
        {{ savingPw() ? ('pr.updating' | t) : ('pr.updatePw' | t) }}
      </button>
      @if (pwMsg()) { <p class="apf__msg" [class.apf__msg--err]="pwErr()">{{ pwMsg() }}</p> }
    </section>
  </div>
</div>
  `,
  styles: [`
    :host { display: block; }
    .apf__head { margin-bottom: 1.5rem; }
    .apf__head h1 { font-size: 1.5rem; font-weight: 700; color: #fff; margin: 0; }
    .apf__head p { font-size: 0.875rem; color: rgba(255,255,255,0.4); margin: 0.25rem 0 0; }
    .apf__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; @media (max-width: 800px) { grid-template-columns: 1fr; } }
    .apf__card {
      background: #15171f; border: 1px solid rgba(255,255,255,0.07); border-radius: 16px; padding: 1.5rem;
      h2 { display: flex; align-items: center; gap: 0.5rem; font-size: 1rem; font-weight: 700; color: #fff; margin: 0 0 1.25rem;
           i { color: #e63946; } }
    }
    .apf__lbl { display: block; font-size: 0.75rem; font-weight: 600; color: rgba(255,255,255,0.45);
                text-transform: uppercase; letter-spacing: 0.05em; margin: 0.85rem 0 0.35rem; }
    .apf__input {
      width: 100%; background: #0e1016; border: 1px solid rgba(255,255,255,0.1); border-radius: 9px;
      padding: 0.65rem 0.85rem; color: #fff; font: inherit; font-size: 0.9rem;
      &:focus { outline: none; border-color: #e63946; box-shadow: 0 0 0 3px rgba(230,57,70,0.15); }
      &:disabled { opacity: 0.55; }
    }
    .apf__btn {
      margin-top: 1.25rem; width: 100%; background: #e63946; color: #fff; border: none; cursor: pointer;
      padding: 0.7rem; border-radius: 9px; font: inherit; font-weight: 700; font-size: 0.9rem;
      transition: background 160ms;
      &:hover:not(:disabled) { background: #c1121f; }
      &:disabled { opacity: 0.6; cursor: not-allowed; }
    }
    .apf__msg { margin: 0.85rem 0 0; font-size: 0.82rem; color: #4ade80; }
    .apf__msg--err { color: #ff6b6b; }
  `],
})
export class AdminProfilePage implements OnInit {
  private readonly accountSvc = inject(AccountService);
  private readonly auth = inject(AuthService);
  private readonly i18n = inject(I18nService);

  protected readonly account = this.accountSvc.account;

  protected fullName = '';
  protected phone = '';
  protected newPw = '';
  protected newPw2 = '';

  protected readonly savingProfile = signal(false);
  protected readonly profileMsg = signal('');
  protected readonly profileErr = signal(false);
  protected readonly savingPw = signal(false);
  protected readonly pwMsg = signal('');
  protected readonly pwErr = signal(false);

  async ngOnInit(): Promise<void> {
    if (!this.accountSvc.loaded()) { await this.accountSvc.load(); }
    const a = this.account();
    this.fullName = a?.fullName ?? this.auth.currentUser()?.name ?? '';
    this.phone = a?.phone ?? '';
  }

  async saveProfile(): Promise<void> {
    this.profileMsg.set(''); this.profileErr.set(false);
    if (this.fullName.trim().length < 2) {
      this.profileErr.set(true); this.profileMsg.set(this.i18nReq()); return;
    }
    this.savingProfile.set(true);
    try {
      await this.accountSvc.updateProfile(this.fullName.trim(), this.phone.trim());
      this.profileMsg.set(this.t('pr.savedProfile'));
    } catch {
      this.profileErr.set(true); this.profileMsg.set(this.t('pr.saveFailed'));
    } finally { this.savingProfile.set(false); }
  }

  async changePw(): Promise<void> {
    this.pwMsg.set(''); this.pwErr.set(false);
    if (this.newPw.length < 8) { this.pwErr.set(true); this.pwMsg.set(this.t('pr.pwShort')); return; }
    if (this.newPw !== this.newPw2) { this.pwErr.set(true); this.pwMsg.set(this.t('auth.err.mismatch')); return; }
    this.savingPw.set(true);
    try {
      await this.accountSvc.changePassword(this.newPw);
      this.newPw = ''; this.newPw2 = '';
      this.pwMsg.set(this.t('pr.pwUpdated'));
    } catch {
      this.pwErr.set(true); this.pwMsg.set(this.t('pr.pwFailed'));
    } finally { this.savingPw.set(false); }
  }

  private t(k: string): string { return this.i18n.t(k); }
  private i18nReq(): string { return this.t('auth.err.required'); }
}
