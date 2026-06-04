import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';
import { I18nService } from '../../../core/i18n/i18n.service';

@Component({
  selector: 'app-contact-form',
  standalone: true,
  imports: [ReactiveFormsModule, InputTextModule, TextareaModule, ButtonModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact-form.html',
  styleUrl: './contact-form.scss',
})
export class ContactForm {
  private readonly fb = inject(FormBuilder);
  private readonly i18n = inject(I18nService);

  protected readonly form = this.fb.nonNullable.group({
    name:    ['', [Validators.required, Validators.minLength(2)]],
    email:   ['', [Validators.required, Validators.email]],
    phone:   ['', [Validators.required, Validators.minLength(7)]],
    subject: ['', [Validators.required, Validators.minLength(3)]],
    message: ['', [Validators.required, Validators.minLength(10)]],
  });

  protected readonly submitting = signal(false);
  protected readonly submitted = signal(false);
  protected readonly error = signal<string | null>(null);

  protected hasError(control: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[control];
    return c.invalid && (c.touched || c.dirty);
  }

  protected errorOf(control: keyof typeof this.form.controls): string | null {
    const c = this.form.controls[control];
    if (!c.errors || !(c.touched || c.dirty)) return null;
    if (c.errors['required']) return this.i18n.t('auth.err.required');
    if (c.errors['email']) return this.i18n.t('auth.err.email');
    if (c.errors['minlength']) return this.i18n.t('auth.err.minlength', { n: c.errors['minlength'].requiredLength });
    return this.i18n.t('auth.err.invalid');
  }

  protected async submit(): Promise<void> {
    this.error.set(null);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.submitting.set(true);
    try {
      await new Promise((r) => setTimeout(r, 800));
      this.submitted.set(true);
      this.form.reset();
    } catch {
      this.error.set(this.i18n.t('contact.form.fail'));
    } finally {
      this.submitting.set(false);
    }
  }
}
