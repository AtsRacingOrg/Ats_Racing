import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SectionHeading } from '../../../shared/ui/section-heading/section-heading';

interface Article {
  readonly title: string;
  readonly category: string;
  readonly date: string;
  readonly image: string;
  readonly excerpt: string;
}

@Component({
  selector: 'app-home-news',
  standalone: true,
  imports: [SectionHeading],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './news.html',
  styleUrl: './news.scss',
})
export class HomeNews {
  protected readonly articles: readonly Article[] = [
    {
      title: 'ECU yazılımı sonrası yakıt tasarrufu mümkün mü?',
      category: 'Rehber',
      date: '12 Nisan 2026',
      image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80',
      excerpt:
        'Doğru haritalama ile %5-12 arasında tüketim avantajı sağlayabilirsiniz; ancak sürüş tarzı belirleyici.',
    },
    {
      title: 'Seramik kaplama mı yoksa PPF mi tercih edilmeli?',
      category: 'Detayl',
      date: '03 Nisan 2026',
      image: 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=900&q=80',
      excerpt:
        'İki ürün farklı problemleri çözer. Birlikte kullanmak, çoğu zaman en iyi sonucu verir.',
    },
    {
      title: '2026 sezonu için pist günü hazırlık listesi',
      category: 'Performans',
      date: '24 Mart 2026',
      image: 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=900&q=80',
      excerpt:
        'Lastik, fren, sıvılar ve elektronik kontrol — pistte güvenli kalmanın temel listesi.',
    },
  ];
}
