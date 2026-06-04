import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AccountService, Billing, BillingType } from '../../../../core/account/account.service';
import { PageLoader } from '../../../../shared/page-loader';

@Component({
  selector: 'app-profile-page',
  standalone: true,
  imports: [FormsModule, PageLoader],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
@if (!loaded()) { <app-page-loader /> } @else {
<div class="pr">
  <div class="pr__header">
    <h1 class="pr__title">Profilim</h1>
    <p class="pr__sub">Hesap, şifre ve fatura bilgilerin</p>
  </div>

  @if (!billingComplete()) {
    <div class="pr__warn">
      <i class="pi pi-exclamation-triangle"></i>
      <span>Fatura bilgilerin tanımlı değil. Sipariş verebilmek için aşağıdaki <strong>Fatura Bilgileri</strong> bölümünü doldur.</span>
    </div>
  }

  <div class="pr__grid">

    <!-- Profil bilgileri -->
    <section class="pr__card">
      <h2 class="pr__card-title"><i class="pi pi-user"></i> Hesap Bilgileri</h2>
      <div class="pr__field">
        <label>Ad Soyad</label>
        <input class="pr__input" [(ngModel)]="fullName" placeholder="Ad Soyad" />
      </div>
      <div class="pr__field">
        <label>E-posta</label>
        <input class="pr__input" [value]="account()?.email || ''" disabled />
      </div>
      @if (isDealer()) {
        <div class="pr__field">
          <label>Bayi Adı</label>
          <input class="pr__input" [(ngModel)]="dealershipName" placeholder="Bayi / firma adı" />
        </div>
      }
      <div class="pr__field">
        <label>Telefon</label>
        <input class="pr__input" [(ngModel)]="phone" placeholder="05xx xxx xx xx" />
      </div>
      <button class="pr__btn" type="button" [disabled]="savingProfile()" (click)="saveProfile()">
        <i class="pi" [class.pi-save]="!savingProfile()" [class.pi-spin]="savingProfile()" [class.pi-spinner]="savingProfile()"></i>
        {{ savingProfile() ? 'Kaydediliyor…' : 'Kaydet' }}
      </button>
      @if (profileMsg()) { <p class="pr__ok">{{ profileMsg() }}</p> }
    </section>

    <!-- Şifre değiştir -->
    <section class="pr__card">
      <h2 class="pr__card-title"><i class="pi pi-lock"></i> Şifre Değiştir</h2>
      <div class="pr__field">
        <label>Yeni Şifre</label>
        <input class="pr__input" type="password" [(ngModel)]="newPassword" placeholder="En az 8 karakter" />
      </div>
      <div class="pr__field">
        <label>Yeni Şifre (Tekrar)</label>
        <input class="pr__input" type="password" [(ngModel)]="newPassword2" placeholder="Tekrar" />
      </div>
      <button class="pr__btn" type="button" [disabled]="savingPw()" (click)="savePassword()">
        <i class="pi" [class.pi-key]="!savingPw()" [class.pi-spin]="savingPw()" [class.pi-spinner]="savingPw()"></i>
        {{ savingPw() ? 'Güncelleniyor…' : 'Şifreyi Güncelle' }}
      </button>
      @if (pwError()) { <p class="pr__err">{{ pwError() }}</p> }
      @if (pwMsg()) { <p class="pr__ok">{{ pwMsg() }}</p> }
    </section>

    <!-- Fatura bilgileri -->
    <section class="pr__card pr__card--wide">
      <h2 class="pr__card-title">
        <i class="pi pi-file"></i> Fatura Bilgileri
        @if (billingComplete()) {
          <span class="pr__badge pr__badge--ok"><i class="pi pi-check-circle"></i> Tanımlı</span>
        } @else {
          <span class="pr__badge pr__badge--warn"><i class="pi pi-exclamation-circle"></i> Eksik</span>
        }
      </h2>

      @if (showBillingForm()) {
        <!-- DÜZENLEME / İLK KAYIT FORMU -->
        <div class="pr__type">
          <button type="button" class="pr__type-btn" [class.pr__type-btn--active]="bType() === 'individual'" (click)="switchType('individual')">
            <i class="pi pi-user"></i> Bireysel
          </button>
          <button type="button" class="pr__type-btn" [class.pr__type-btn--active]="bType() === 'corporate'" (click)="switchType('corporate')">
            <i class="pi pi-building"></i> Kurumsal
          </button>
        </div>

        <div class="pr__brow">
          @if (bType() === 'individual') {
            <div class="pr__field"><label>Ad Soyad *</label><input class="pr__input" [(ngModel)]="bFullName" placeholder="Ad Soyad" /></div>
            <div class="pr__field"><label>T.C. Kimlik No *</label><input class="pr__input" [(ngModel)]="bTcNo" maxlength="11" placeholder="11 haneli" /></div>
          } @else {
            <div class="pr__field"><label>Firma Ünvanı *</label><input class="pr__input" [(ngModel)]="bCompany" placeholder="Firma ünvanı" /></div>
            <div class="pr__field"><label>Vergi Dairesi *</label><input class="pr__input" [(ngModel)]="bTaxOffice" placeholder="Vergi dairesi" /></div>
            <div class="pr__field"><label>Vergi No *</label><input class="pr__input" [(ngModel)]="bTaxNumber" placeholder="Vergi numarası" /></div>
          }
          <div class="pr__field"><label>Telefon</label><input class="pr__input" [(ngModel)]="bPhone" placeholder="Telefon" /></div>
          <div class="pr__field"><label>İl *</label><input class="pr__input" [(ngModel)]="bCity" placeholder="İl" /></div>
          <div class="pr__field"><label>İlçe</label><input class="pr__input" [(ngModel)]="bDistrict" placeholder="İlçe" /></div>
          <div class="pr__field pr__field--full"><label>Adres *</label><textarea class="pr__input" rows="2" [(ngModel)]="bAddress" placeholder="Açık adres"></textarea></div>
        </div>

        <div class="pr__brow-actions">
          <button class="pr__btn pr__btn--primary" type="button" [disabled]="savingBilling()" (click)="saveBilling()">
            <i class="pi" [class.pi-save]="!savingBilling()" [class.pi-spin]="savingBilling()" [class.pi-spinner]="savingBilling()"></i>
            {{ savingBilling() ? 'Kaydediliyor…' : 'Fatura Bilgilerini Kaydet' }}
          </button>
          @if (account()?.billing) {
            <button class="pr__btn" type="button" (click)="cancelEdit()">
              <i class="pi pi-times"></i> Vazgeç
            </button>
          }
        </div>
        @if (billingError()) { <p class="pr__err">{{ billingError() }}</p> }
        @if (billingMsg()) { <p class="pr__ok">{{ billingMsg() }}</p> }
      } @else {
        <!-- ÖZET (OKUMA) GÖRÜNÜMÜ -->
        <div class="pr__summary">
          <span class="pr__btype">
            <i class="pi" [class.pi-user]="account()?.billing?.type === 'individual'" [class.pi-building]="account()?.billing?.type === 'corporate'"></i>
            {{ account()?.billing?.type === 'corporate' ? 'Kurumsal' : 'Bireysel' }}
          </span>
          <div class="pr__sgrid">
            @if (account()?.billing?.type === 'individual') {
              <div class="pr__srow"><span>Ad Soyad</span><b>{{ account()?.billing?.fullName || '—' }}</b></div>
              <div class="pr__srow"><span>T.C. Kimlik No</span><b>{{ account()?.billing?.tcNo || '—' }}</b></div>
            } @else {
              <div class="pr__srow"><span>Firma Ünvanı</span><b>{{ account()?.billing?.companyName || '—' }}</b></div>
              <div class="pr__srow"><span>Vergi Dairesi</span><b>{{ account()?.billing?.taxOffice || '—' }}</b></div>
              <div class="pr__srow"><span>Vergi No</span><b>{{ account()?.billing?.taxNumber || '—' }}</b></div>
            }
            <div class="pr__srow"><span>Telefon</span><b>{{ account()?.billing?.phone || '—' }}</b></div>
            <div class="pr__srow"><span>İl / İlçe</span><b>{{ account()?.billing?.city || '—' }}{{ account()?.billing?.district ? ' / ' + account()?.billing?.district : '' }}</b></div>
            <div class="pr__srow pr__srow--full"><span>Adres</span><b>{{ account()?.billing?.address || '—' }}</b></div>
          </div>
          <div class="pr__brow-actions">
            <button class="pr__btn pr__btn--primary" type="button" (click)="startEdit()">
              <i class="pi pi-pencil"></i> Düzenle
            </button>
            <button class="pr__btn pr__btn--danger" type="button" [disabled]="deletingBilling()" (click)="deleteBilling()">
              <i class="pi" [class.pi-trash]="!deletingBilling()" [class.pi-spin]="deletingBilling()" [class.pi-spinner]="deletingBilling()"></i>
              Sil
            </button>
          </div>
          @if (billingMsg()) { <p class="pr__ok">{{ billingMsg() }}</p> }
          @if (billingError()) { <p class="pr__err">{{ billingError() }}</p> }
        </div>
      }
    </section>

  </div>
</div>
}
  `,
  styles: [`
    .pr { display: flex; flex-direction: column; gap: 1.5rem; }
    .pr__title { font-size: 1.6rem; font-weight: 700; color: #fff; margin: 0; }
    .pr__sub { font-size: 0.875rem; color: rgba(255,255,255,0.4); margin: 0.25rem 0 0; }
    .pr__warn {
      display: flex; align-items: flex-start; gap: 0.6rem; padding: 0.9rem 1.2rem; border-radius: 12px;
      background: rgba(251,191,36,0.1); border: 1px solid rgba(251,191,36,0.3); color: #fbbf24; font-size: 0.85rem;
      i { font-size: 1.05rem; margin-top: 1px; flex-shrink: 0; } strong { color: #fff; }
    }
    .pr__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; @media(max-width:880px){ grid-template-columns: 1fr; } }
    .pr__card { background: #1a1d27; border: 1px solid rgba(255,255,255,0.08); border-radius: 18px; padding: 1.5rem; display: flex; flex-direction: column; gap: 0.9rem; }
    .pr__card--wide { grid-column: 1 / -1; }
    .pr__card-title { font-size: 0.95rem; font-weight: 700; color: #fff; margin: 0 0 0.3rem; display: flex; align-items: center; gap: 0.5rem; i { color: #e63946; } }
    .pr__field { display: flex; flex-direction: column; gap: 0.35rem; &--full { grid-column: 1 / -1; } }
    .pr__field label { font-size: 0.72rem; font-weight: 600; color: rgba(255,255,255,0.45); text-transform: uppercase; letter-spacing: 0.04em; }
    .pr__input {
      width: 100%; box-sizing: border-box; padding: 0.6rem 0.8rem; border-radius: 9px;
      background: #0d0f14; border: 1px solid rgba(255,255,255,0.1); color: #fff; font: inherit; font-size: 0.85rem;
      &:focus { outline: none; border-color: rgba(230,57,70,0.5); }
      &:disabled { opacity: 0.5; }
      &::placeholder { color: rgba(255,255,255,0.25); }
    }
    .pr__btn {
      align-self: flex-start; display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.6rem 1.1rem; border-radius: 10px; border: 1px solid rgba(255,255,255,0.12); cursor: pointer;
      background: rgba(255,255,255,0.06); color: #fff; font-size: 0.85rem; font-weight: 600;
      &:hover:not(:disabled){ background: rgba(255,255,255,0.12); } &:disabled{ opacity: 0.5; cursor: not-allowed; }
      &--primary { background: linear-gradient(135deg,#e63946,#c1121f); border: none; }
      &--danger { background: rgba(248,113,113,0.1); border-color: rgba(248,113,113,0.35); color: #f87171; &:hover:not(:disabled){ background: rgba(248,113,113,0.18); } }
    }
    .pr__brow-actions { display: flex; gap: 0.6rem; flex-wrap: wrap; }
    .pr__ok { margin: 0; font-size: 0.8rem; color: #4ade80; }
    .pr__err { margin: 0; font-size: 0.8rem; color: #f87171; }
    .pr__badge { margin-left: auto; font-size: 0.68rem; font-weight: 700; padding: 3px 9px; border-radius: 20px; display: inline-flex; align-items: center; gap: 4px;
      &--ok { background: rgba(74,222,128,0.12); color: #4ade80; } &--warn { background: rgba(251,191,36,0.12); color: #fbbf24; } }
    .pr__type { display: inline-flex; gap: 0.25rem; padding: 0.25rem; background: #13151c; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; }
    .pr__type-btn { display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.5rem 1rem; border-radius: 9px; border: none; cursor: pointer; background: transparent; color: rgba(255,255,255,0.5); font-size: 0.82rem; font-weight: 600;
      &:hover { color: #fff; } &--active { background: rgba(230,57,70,0.15); color: #e63946; } }
    .pr__brow { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.9rem; @media(max-width:680px){ grid-template-columns: 1fr; } }
    .pr__summary { display: flex; flex-direction: column; gap: 1rem; }
    .pr__btype { align-self: flex-start; display: inline-flex; align-items: center; gap: 0.45rem; padding: 0.35rem 0.85rem; border-radius: 20px; font-size: 0.78rem; font-weight: 700; background: rgba(230,57,70,0.12); color: #e63946; i { font-size: 0.85rem; } }
    .pr__sgrid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem 1.5rem; @media(max-width:680px){ grid-template-columns: 1fr; } }
    .pr__srow { display: flex; flex-direction: column; gap: 3px; &--full { grid-column: 1 / -1; }
      span { font-size: 0.7rem; font-weight: 600; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.04em; }
      b { font-size: 0.9rem; font-weight: 600; color: #fff; word-break: break-word; } }
  `],
})
export class ProfilePage implements OnInit {
  private readonly accountSvc = inject(AccountService);
  private readonly cdr = inject(ChangeDetectorRef);

  protected readonly loaded = this.accountSvc.loaded;
  protected readonly account = this.accountSvc.account;
  protected readonly billingComplete = this.accountSvc.billingComplete;

  protected readonly isDealer = computed(() => this.account()?.role === 'dealer');

  protected fullName = '';
  protected phone = '';
  protected dealershipName = '';
  protected newPassword = '';
  protected newPassword2 = '';

  protected readonly editingBilling = signal(false);
  /** Form göster: fatura kayıtlı değilse ya da düzenleme modundaysa. */
  protected readonly showBillingForm = computed(() => !this.account()?.billing || this.editingBilling());

  protected readonly bType = signal<BillingType>('individual');
  protected bFullName = ''; protected bTcNo = '';
  protected bCompany = ''; protected bTaxOffice = ''; protected bTaxNumber = '';
  protected bPhone = ''; protected bAddress = ''; protected bCity = ''; protected bDistrict = '';

  protected readonly savingProfile = signal(false);
  protected readonly savingPw = signal(false);
  protected readonly savingBilling = signal(false);
  protected readonly deletingBilling = signal(false);
  protected readonly profileMsg = signal('');
  protected readonly pwMsg = signal('');
  protected readonly pwError = signal('');
  protected readonly billingMsg = signal('');
  protected readonly billingError = signal('');

  async ngOnInit(): Promise<void> {
    if (!this.accountSvc.loaded()) { await this.accountSvc.load(); }
    this.hydrate();
    this.cdr.markForCheck();
  }

  private hydrate(): void {
    const a = this.account();
    if (!a) { return; }
    this.fullName = a.fullName ?? '';
    this.phone = a.phone ?? '';
    this.dealershipName = a.dealershipName ?? '';
    const b = a.billing;
    if (b) {
      this.bType.set(b.type);
      this.bFullName = b.fullName ?? ''; this.bTcNo = b.tcNo ?? '';
      this.bCompany = b.companyName ?? ''; this.bTaxOffice = b.taxOffice ?? ''; this.bTaxNumber = b.taxNumber ?? '';
      this.bPhone = b.phone ?? ''; this.bAddress = b.address ?? ''; this.bCity = b.city ?? ''; this.bDistrict = b.district ?? '';
    }
  }

  /** Tip değiştirince diğer tipe özel alanları temizle (paylaşılan alanlar kalır). */
  switchType(t: BillingType): void {
    if (this.bType() === t) { return; }
    this.bType.set(t);
    if (t === 'individual') {
      this.bCompany = ''; this.bTaxOffice = ''; this.bTaxNumber = '';
    } else {
      this.bFullName = ''; this.bTcNo = '';
    }
  }

  startEdit(): void {
    this.billingMsg.set(''); this.billingError.set('');
    this.hydrate();
    this.editingBilling.set(true);
  }

  cancelEdit(): void {
    this.billingMsg.set(''); this.billingError.set('');
    this.hydrate();
    this.editingBilling.set(false);
  }

  async saveProfile(): Promise<void> {
    if (this.savingProfile()) { return; }
    this.savingProfile.set(true); this.profileMsg.set('');
    try {
      await this.accountSvc.updateProfile(
        this.fullName.trim(),
        this.phone.trim(),
        this.isDealer() ? this.dealershipName.trim() : undefined,
      );
      this.profileMsg.set('Kaydedildi.');
    } catch { this.profileMsg.set('Kaydedilemedi.'); }
    finally { this.savingProfile.set(false); this.cdr.markForCheck(); }
  }

  async savePassword(): Promise<void> {
    this.pwError.set(''); this.pwMsg.set('');
    if (this.newPassword.length < 8) { this.pwError.set('Şifre en az 8 karakter olmalı.'); return; }
    if (this.newPassword !== this.newPassword2) { this.pwError.set('Şifreler eşleşmiyor.'); return; }
    if (this.savingPw()) { return; }
    this.savingPw.set(true);
    try {
      await this.accountSvc.changePassword(this.newPassword);
      this.pwMsg.set('Şifren güncellendi.');
      this.newPassword = ''; this.newPassword2 = '';
    } catch (e) {
      this.pwError.set((e as { error?: { message?: string } })?.error?.message ?? 'Şifre değiştirilemedi.');
    } finally { this.savingPw.set(false); this.cdr.markForCheck(); }
  }

  async saveBilling(): Promise<void> {
    this.billingError.set(''); this.billingMsg.set('');
    const t = this.bType();
    if (t === 'individual') {
      if (!this.bFullName.trim() || !this.bTcNo.trim() || !this.bAddress.trim() || !this.bCity.trim()) {
        this.billingError.set('Lütfen zorunlu (*) alanları doldur: Ad Soyad, T.C. No, İl, Adres.'); return;
      }
    } else {
      if (!this.bCompany.trim() || !this.bTaxOffice.trim() || !this.bTaxNumber.trim() || !this.bAddress.trim() || !this.bCity.trim()) {
        this.billingError.set('Lütfen zorunlu (*) alanları doldur: Ünvan, Vergi Dairesi, Vergi No, İl, Adres.'); return;
      }
    }
    if (this.savingBilling()) { return; }
    this.savingBilling.set(true);
    const payload: Billing = {
      type: t,
      fullName: this.bFullName.trim() || null,
      tcNo: this.bTcNo.trim() || null,
      companyName: this.bCompany.trim() || null,
      taxOffice: this.bTaxOffice.trim() || null,
      taxNumber: this.bTaxNumber.trim() || null,
      phone: this.bPhone.trim() || null,
      address: this.bAddress.trim() || null,
      city: this.bCity.trim() || null,
      district: this.bDistrict.trim() || null,
    };
    try {
      await this.accountSvc.saveBilling(payload);
      this.hydrate();
      this.editingBilling.set(false);
      this.billingMsg.set('Fatura bilgilerin kaydedildi.');
    } catch { this.billingError.set('Kaydedilemedi. Tekrar dene.'); }
    finally { this.savingBilling.set(false); this.cdr.markForCheck(); }
  }

  async deleteBilling(): Promise<void> {
    if (this.deletingBilling()) { return; }
    if (!confirm('Fatura bilgilerini silmek istediğine emin misin? Silersen sipariş veremezsin.')) { return; }
    this.deletingBilling.set(true);
    this.billingError.set(''); this.billingMsg.set('');
    try {
      await this.accountSvc.deleteBilling();
      // Formu temizle
      this.bType.set('individual');
      this.bFullName = ''; this.bTcNo = ''; this.bCompany = ''; this.bTaxOffice = '';
      this.bTaxNumber = ''; this.bPhone = ''; this.bAddress = ''; this.bCity = ''; this.bDistrict = '';
      this.billingMsg.set('Fatura bilgilerin silindi.');
    } catch { this.billingError.set('Silinemedi. Tekrar dene.'); }
    finally { this.deletingBilling.set(false); this.cdr.markForCheck(); }
  }
}
