import { ChangeDetectionStrategy, Component } from '@angular/core';

interface Hour {
  readonly day: string;
  readonly time: string;
}

interface Faq {
  readonly q: string;
  readonly a: string;
}

@Component({
  selector: 'app-contact-hours-faq',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './hours-faq.html',
  styleUrl: './hours-faq.scss',
})
export class ContactHoursFaq {
  protected readonly hours: readonly Hour[] = [
    { day: 'Pazartesi – Cuma', time: '09:00 – 19:00' },
    { day: 'Cumartesi',         time: '10:00 – 17:00' },
    { day: 'Pazar',             time: 'Sadece randevulu' },
  ];

  protected readonly faqs: readonly Faq[] = [
    {
      q: 'Randevu için nasıl iletişime geçebilirim?',
      a: 'Yukarıdaki formu ya da WhatsApp hattımızı kullanabilirsin. Aynı gün içinde dönüş yapıyoruz.',
    },
    {
      q: 'Yedek araç sağlıyor musunuz?',
      a: 'Stage 2 ve üzeri tüm modifiye projelerinde isteğe bağlı olarak yedek araç sunuyoruz.',
    },
    {
      q: 'Yaptığınız işleri garanti ediyor musunuz?',
      a: 'Evet — tüm modifiye ve detaylı işlerimiz 24 ay servis garantisi ile teslim edilir.',
    },
  ];
}
