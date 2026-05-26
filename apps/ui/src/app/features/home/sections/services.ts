import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { SectionHeading } from '../../../shared/ui/section-heading/section-heading';

interface Service {
  readonly icon: string;
  readonly title: string;
  readonly description: string;
  readonly link: string;
}

@Component({
  selector: 'app-home-services',
  standalone: true,
  imports: [RouterLink, SectionHeading],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './services.html',
  styleUrl: './services.scss',
})
export class HomeServices {
  protected readonly services: readonly Service[] = [
    {
      icon: 'pi pi-cog',
      title: 'ECU Yazılımı',
      description: 'Stage 1–3 chip tuning, hassas dyno ayarları ve tepkisel haritalama.',
      link: '/shop',
    },
    {
      icon: 'pi pi-bolt',
      title: 'Performans Modifiye',
      description: 'Egzoz, turbo, intake ve şanzıman optimizasyonu — sahada test edilmiş.',
      link: '/shop',
    },
    {
      icon: 'pi pi-sparkles',
      title: 'Detaylı Bakım',
      description: 'Seramik kaplama, PPF, iç-dış detayl, motor temizliği, profesyonel cila.',
      link: '/shop',
    },
    {
      icon: 'pi pi-shield',
      title: 'Güvenlik & Frenleme',
      description: 'Brembo / AP Racing fren kitleri, kaliper boya, performans hortumları.',
      link: '/shop',
    },
  ];
}
