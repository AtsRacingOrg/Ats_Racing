import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { SectionHeading } from '../../../shared/ui/section-heading/section-heading';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

interface Article {
  readonly titleKey: string;
  readonly categoryKey: string;
  readonly date: string;
  readonly image: string;
  readonly excerptKey: string;
}

@Component({
  selector: 'app-home-news',
  standalone: true,
  imports: [SectionHeading, RevealDirective, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './news.html',
  styleUrl: './news.scss',
})
export class HomeNews {
  protected readonly articles: readonly Article[] = [
    {
      titleKey: 'news.1.title', categoryKey: 'news.1.cat', excerptKey: 'news.1.excerpt',
      date: '12 Nisan 2026',
      image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80',
    },
    {
      titleKey: 'news.2.title', categoryKey: 'news.2.cat', excerptKey: 'news.2.excerpt',
      date: '03 Nisan 2026',
      image: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=900&q=80',
    },
    {
      titleKey: 'news.3.title', categoryKey: 'news.3.cat', excerptKey: 'news.3.excerpt',
      date: '24 Mart 2026',
      image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=900&q=80',
    },
  ];
}
