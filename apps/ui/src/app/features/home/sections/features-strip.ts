import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SectionHeading } from '../../../shared/ui/section-heading/section-heading';

interface Feature {
  readonly icon: string;
  readonly title: string;
  readonly text: string;
}

@Component({
  selector: 'app-home-features',
  standalone: true,
  imports: [SectionHeading],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './features-strip.html',
  styleUrl: './features-strip.scss',
})
export class HomeFeatures {
  protected readonly features: readonly Feature[] = [
    { icon: 'pi pi-wrench', title: 'Sertifikalı Ekip', text: 'OEM eğitimli, deneyimli teknisyenler.' },
    { icon: 'pi pi-stopwatch', title: 'Zamanında Teslim', text: 'Söz verdiğimiz tarihte, gerçek randevu yönetimi.' },
    { icon: 'pi pi-verified', title: 'Garantili İş', text: 'Tüm modifiyeler 24 ay servis garantisi ile.' },
    { icon: 'pi pi-comments', title: 'Şeffaf İletişim', text: 'Her aşamada fotoğraf, video ve dyno raporu.' },
  ];
}
