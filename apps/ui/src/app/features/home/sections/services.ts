import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

interface ServiceTile {
  readonly title: string;
  readonly tag: string;
  readonly image: string;
  readonly link: string;
}

@Component({
  selector: 'app-home-services',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './services.html',
  styleUrl: './services.scss',
})
export class HomeServices {
  protected readonly services: readonly ServiceTile[] = [
    {
      title: 'Interior Customization',
      tag: 'Detayl Bakım',
      image: 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=1200&q=80',
      link: '/shop',
    },
    {
      title: 'Aero Upgrades',
      tag: 'Aerodinamik',
      image: 'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1200&q=80',
      link: '/shop',
    },
    {
      title: 'Performance Tuning',
      tag: 'ECU Yazılımı',
      image: 'https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&w=1200&q=80',
      link: '/shop',
    },
    {
      title: 'Stance Setup',
      tag: 'Jant & Süspansiyon',
      image: 'https://images.unsplash.com/photo-1626668893632-6f3a4466d109?auto=format&fit=crop&w=1200&q=80',
      link: '/shop',
    },
  ];
}
