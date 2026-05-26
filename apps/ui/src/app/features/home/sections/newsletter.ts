import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-home-newsletter',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, InputTextModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './newsletter.html',
  styleUrl: './newsletter.scss',
})
export class HomeNewsletter {
  protected readonly email = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });

  protected readonly submitted = signal(false);

  protected submit(): void {
    this.email.markAsTouched();
    if (this.email.invalid) return;
    this.submitted.set(true);
    this.email.reset();
  }
}
