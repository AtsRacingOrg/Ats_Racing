import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

interface ServiceTile {
  readonly titleKey: string;
  /** Modül/ürün etiketi (DSG, AdBlue gibi) sabit; çevrilecekse tagKey verilir. */
  readonly tag?: string;
  readonly tagKey?: string;
  readonly image: string;
  readonly link: string;
}

@Component({
  selector: 'app-home-services',
  standalone: true,
  imports: [RouterLink, RevealDirective, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './services.html',
  styleUrl: './services.scss',
})
export class HomeServices {
  protected readonly services: readonly ServiceTile[] = [
    {
      titleKey: 'services.dsg.title',
      tag: 'DSG',
      image: 'https://images.unsplash.com/photo-1601362840469-51e4d8d58785?auto=format&fit=crop&w=1200&q=80',
      link: '/contact',
    },
    {
      titleKey: 'services.dpf.title',
      tag: 'DPF EGR',
      image: 'https://images.unsplash.com/photo-1542362567-b07e54358753?auto=format&fit=crop&w=1200&q=80',
      link: '/contact',
    },
    {
      titleKey: 'services.perf.title',
      tagKey: 'services.perf.tag',
      image: 'https://images.unsplash.com/photo-1486006920555-c77dcf18193c?auto=format&fit=crop&w=1200&q=80',
      link: '/contact',
    },
    {
      titleKey: 'services.adblue.title',
      tag: 'AdBlue',
      image: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?auto=format&fit=crop&w=1200&q=80',
      link: '/contact',
    },
  ];
}
