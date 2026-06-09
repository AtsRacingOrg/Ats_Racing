import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { AuthService, AccountType } from '../../core/auth/auth.service';
import { TranslatePipe } from '../../core/i18n/translate.pipe';
import { I18nService } from '../../core/i18n/i18n.service';
import { CountrySelect } from '../../shared/ui/country-select/country-select';

type AuthTab = 'login' | 'register';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const pwd = group.get('password')?.value;
  const confirm = group.get('confirm')?.value;
  return pwd && confirm && pwd !== confirm ? { mismatch: true } : null;
}

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    CheckboxModule,
    TranslatePipe,
    CountrySelect,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export default class LoginPage {
  private readonly fb     = inject(FormBuilder);
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);
  private readonly i18n   = inject(I18nService);

  protected readonly tab = signal<AuthTab>('login');
  protected readonly accountType = signal<AccountType>('user');

  protected readonly loginForm = this.fb.nonNullable.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    remember: new FormControl<boolean>(true, { nonNullable: true }),
  });

  protected readonly registerForm = this.fb.nonNullable.group(
    {
      name:           ['', [Validators.required, Validators.minLength(2)]],
      email:          ['', [Validators.required, Validators.email]],
      phone:          [''],
      country:        ['TR', [Validators.required]],
      dealershipName: [''],
      password:       ['', [Validators.required, Validators.minLength(6)]],
      confirm:        ['', [Validators.required]],
      terms:          new FormControl<boolean>(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
    },
    { validators: passwordsMatch },
  );

  constructor() {
    const qp = this.route.snapshot.queryParamMap;
    // Returning from the email verification link → ?verified=1
    if (qp.get('verified') === '1') {
      this.success.set(this.i18n.t('auth.msg.verified'));
    }
    // Aşırı istek nedeniyle bloklandı → ?blocked=1
    if (qp.get('blocked') === '1') {
      this.serverError.set(this.i18n.t('auth.msg.blocked'));
    }
  }

  protected setAccountType(t: AccountType): void {
    this.accountType.set(t);
    const dealership = this.registerForm.get('dealershipName');
    if (t === 'dealer') {
      dealership?.addValidators([Validators.required, Validators.minLength(2)]);
    } else {
      dealership?.clearValidators();
      dealership?.setValue('');
    }
    dealership?.updateValueAndValidity();
  }

  protected readonly form = computed<FormGroup>(() =>
    this.tab() === 'login' ? this.loginForm : this.registerForm,
  );

  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);
  /** E-posta doğrulanmamış hatasında "tekrar gönder" akışı. */
  protected readonly unverifiedEmail = signal<string | null>(null);
  protected readonly resending = signal(false);
  protected readonly resendSent = signal(false);
  protected readonly success = signal<string | null>(null);

  protected setTab(t: AuthTab): void {
    this.tab.set(t);
    this.serverError.set(null);
    this.success.set(null);
  }

  protected hasError(name: string): boolean {
    const c = this.form().get(name);
    return !!c && c.invalid && (c.touched || c.dirty);
  }

  protected errorOf(name: string): string | null {
    const c = this.form().get(name);
    if (!c || !c.errors || !(c.touched || c.dirty)) return null;
    if (c.errors['required']) return this.i18n.t('auth.err.required');
    if (c.errors['requiredTrue']) return this.i18n.t('auth.err.requiredTrue');
    if (c.errors['email']) return this.i18n.t('auth.err.email');
    if (c.errors['minlength']) return this.i18n.t('auth.err.minlength', { n: c.errors['minlength'].requiredLength });
    return this.i18n.t('auth.err.invalid');
  }

  protected formError(): string | null {
    const f = this.form();
    if (f.errors?.['mismatch'] && f.touched) return this.i18n.t('auth.err.mismatch');
    return null;
  }

  protected async submit(): Promise<void> {
    this.serverError.set(null);
    this.success.set(null);
    this.unverifiedEmail.set(null);
    this.resendSent.set(false);
    const f = this.form();
    f.markAllAsTouched();
    if (f.invalid) return;

    this.submitting.set(true);
    try {
      if (this.tab() === 'login') {
        const { email, password } = this.loginForm.getRawValue();
        const user = await this.auth.login(email, password);
        const dest = user.role === 'admin' ? '/admin' : '/dashboard';
        this.router.navigate([dest]);
      } else {
        const v = this.registerForm.getRawValue();
        const message = await this.auth.register({
          email: v.email,
          password: v.password,
          fullName: v.name,
          phone: v.phone?.trim() || undefined,
          country: v.country || 'TR',
          accountType: this.accountType(),
          dealershipName:
            this.accountType() === 'dealer' ? v.dealershipName?.trim() : undefined,
        });
        this.registerForm.reset({ terms: false, country: 'TR' });
        this.setAccountType('user');
        this.setTab('login');
        this.success.set(message);
      }
    } catch (err) {
      const msg = AuthService.messageFrom(err);
      this.serverError.set(msg);
      // E-posta doğrulanmamış hatasında "tekrar gönder" butonu göster.
      if (this.tab() === 'login' && /doğrulan/i.test(msg)) {
        this.unverifiedEmail.set(this.loginForm.getRawValue().email);
      }
    } finally {
      this.submitting.set(false);
    }
  }

  protected async resendVerification(): Promise<void> {
    const email = this.unverifiedEmail();
    if (!email || this.resending()) { return; }
    this.resending.set(true);
    try {
      await this.auth.resendVerification(email);
      this.resendSent.set(true);
    } catch {
      this.serverError.set(this.i18n.t('auth.msg.resendFailed'));
    } finally {
      this.resending.set(false);
    }
  }
}
