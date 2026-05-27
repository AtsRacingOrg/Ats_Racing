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
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';

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
    RouterLink,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    CheckboxModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export default class LoginPage {
  private readonly fb = inject(FormBuilder);

  protected readonly tab = signal<AuthTab>('login');

  protected readonly loginForm = this.fb.nonNullable.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    remember: new FormControl<boolean>(true, { nonNullable: true }),
  });

  protected readonly registerForm = this.fb.nonNullable.group(
    {
      name:     ['', [Validators.required, Validators.minLength(2)]],
      email:    ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirm:  ['', [Validators.required]],
      terms:    new FormControl<boolean>(false, { nonNullable: true, validators: [Validators.requiredTrue] }),
    },
    { validators: passwordsMatch },
  );

  protected readonly form = computed<FormGroup>(() =>
    this.tab() === 'login' ? this.loginForm : this.registerForm,
  );

  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);
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
    if (c.errors['required']) return 'Bu alan zorunlu.';
    if (c.errors['requiredTrue']) return 'Devam etmek için kabul et.';
    if (c.errors['email']) return 'Geçerli bir e-posta gir.';
    if (c.errors['minlength']) return `En az ${c.errors['minlength'].requiredLength} karakter olmalı.`;
    return 'Geçersiz değer.';
  }

  protected formError(): string | null {
    const f = this.form();
    if (f.errors?.['mismatch'] && f.touched) return 'Şifreler eşleşmiyor.';
    return null;
  }

  protected async submit(): Promise<void> {
    this.serverError.set(null);
    this.success.set(null);
    const f = this.form();
    f.markAllAsTouched();
    if (f.invalid) return;

    this.submitting.set(true);
    try {
      await new Promise((r) => setTimeout(r, 700));
      if (this.tab() === 'register') {
        this.success.set('Hesabın oluşturuldu. Giriş yapabilirsin.');
        this.registerForm.reset({ terms: false });
        this.setTab('login');
      }
    } catch {
      this.serverError.set('İşlem başarısız. Tekrar dene.');
    } finally {
      this.submitting.set(false);
    }
  }
}
