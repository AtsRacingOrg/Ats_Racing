import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

interface Hour {
  readonly dayKey: string;
  readonly time: string;
  readonly timeKey?: string;
}

interface Faq {
  readonly qKey: string;
  readonly aKey: string;
}

@Component({
  selector: 'app-contact-hours-faq',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hours-faq.html',
  styleUrl: './hours-faq.scss',
})
export class ContactHoursFaq {
  protected readonly hours: readonly Hour[] = [
    { dayKey: 'contact.hf.day.weekdays', time: '09:00 – 19:00' },
    { dayKey: 'contact.hf.day.sat',      time: '10:00 – 17:00' },
    { dayKey: 'contact.hf.day.sun',      time: '', timeKey: 'contact.hf.time.sunOnly' },
  ];

  protected readonly faqs: readonly Faq[] = [
    { qKey: 'contact.hf.q1', aKey: 'contact.hf.a1' },
  ];
}
