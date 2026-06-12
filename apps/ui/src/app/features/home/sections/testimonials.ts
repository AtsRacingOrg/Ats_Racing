import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import { CarouselModule } from 'primeng/carousel';
import { SectionHeading } from '../../../shared/ui/section-heading/section-heading';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

interface Testimonial {
  readonly name: string;
  readonly car: string;
  readonly serviceKey: string;   // yapılan iş etiketi (UI → çevrilir)
  readonly quote: string;        // GERÇEK müşteri yorumu — kendi dilinde, ÇEVRİLMEZ
  readonly flag: string;         // yorumun dili/ülkesi
  readonly rating: number;       // 1..5
  readonly accent: string;       // avatar rengi
}

@Component({
  selector: 'app-home-testimonials',
  standalone: true,
  imports: [CarouselModule, SectionHeading, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './testimonials.html',
  styleUrl: './testimonials.scss',
})
export class HomeTestimonials {
  /**
   * Gerçek müşteri yorumları. İsim/araç ve YORUM METNİ olduğu gibi kalır
   * (müşteri hangi dilde yazdıysa o dilde). Yalnızca arayüz/etiketler çevrilir.
   */
  protected readonly testimonials: Testimonial[] = [
    {
      name: 'Mert K.', car: 'BMW M340i', serviceKey: 'testi.s.stage2ecu', flag: '🇹🇷', rating: 5, accent: '#ea0a0b',
      quote: 'M340i’ye Stage 2 yazılım yaptırdım, dyno raporu söz verilen beygirin üzerinde çıktı. Gaz tepkisi tamamen değişti, farkı ilk virajda hissettim.',
    },
    {
      name: 'Emre D.', car: 'VW Golf 7 GTI', serviceKey: 'testi.s.stage1dsg', flag: '🇹🇷', rating: 5, accent: '#2563eb',
      quote: 'Golf’e Stage 1 ve DSG yazılımı yapıldı. Vites geçişleri çok daha sert ve hızlı, şehir içinde bile farkını hissediyorsun. Temiz ve hızlı iş.',
    },
    {
      name: 'James W.', car: 'BMW 335i', serviceKey: 'testi.s.stage2ecu', flag: '🇬🇧', rating: 5, accent: '#0891b2',
      quote: 'Had Stage 2 done on my 335i and the dyno backed up every number they promised. Throttle response is night and day — best money I’ve spent on the car.',
    },
    {
      name: 'Onur T.', car: 'Audi A4 2.0 TDI', serviceKey: 'testi.s.dpfegr', flag: '🇹🇷', rating: 5, accent: '#16a34a',
      quote: 'Dizel aracımda DPF/EGR ve AdBlue çözümü için geldim. Arıza lambaları tamamen gitti, yakıt tüketimi gözle görülür düştü. Her adımı tek tek anlattılar.',
    },
    {
      name: 'Lukas M.', car: 'VW Golf R', serviceKey: 'testi.s.stage2dyno', flag: '🇩🇪', rating: 5, accent: '#9333ea',
      quote: 'Stage 2 auf meinem Golf R — der Prüfstand hat die versprochene Leistung sogar übertroffen. Sauberes Mapping, alles transparent erklärt. Absolut empfehlenswert.',
    },
    {
      name: 'Burak S.', car: 'Mercedes A45 AMG', serviceKey: 'testi.s.stage2dyno', flag: '🇹🇷', rating: 4, accent: '#d97706',
      quote: 'A45’e Stage 2 sonrası dyno testinde net rakamları gördüm. Sonuç harika; tek eksik randevu biraz gecikti, ama iş kalitesi kusursuz.',
    },
    {
      name: 'Daniel K.', car: 'Audi S3', serviceKey: 'testi.s.stage1dsg', flag: '🇬🇧', rating: 4, accent: '#dc2626',
      quote: 'Stage 1 map on my S3 feels great, much stronger mid-range. Booking took a couple of days but the result and the dyno printout were spot on.',
    },
    {
      name: 'Caner Y.', car: 'Ford Focus ST', serviceKey: 'testi.s.ecucustom', flag: '🇹🇷', rating: 5, accent: '#f59e0b',
      quote: 'ECU yazılımıyla hız limiti ve pop&bang açıldı, araç bambaşka bir karakter kazandı. Ekip işinin ehli, aracını gönül rahatlığıyla bırakıyorsun.',
    },
    {
      name: 'Stefan B.', car: 'BMW 120d', serviceKey: 'testi.s.dpfegr', flag: '🇩🇪', rating: 5, accent: '#0d9488',
      quote: 'DPF und EGR an meinem 120d sauber gelöst, keine Fehlermeldungen mehr und spürbar weniger Verbrauch. Professionelles Team, schnelle Abwicklung.',
    },
    {
      name: 'RS Performance', car: 'Yetkili Bayi', serviceKey: 'testi.s.dealer', flag: '🇹🇷', rating: 5, accent: '#7c3aed',
      quote: 'Bayi olarak dosya gönderiyoruz; dönüş süreleri çok hızlı ve dosyalar sorunsuz geliyor. Panel üzerinden sipariş takibi ve ekstre sistemi işimizi gerçekten kolaylaştırdı.',
    },
  ];

  /** Ortalama puan (1 ondalık). */
  protected readonly average = computed(() => {
    const sum = this.testimonials.reduce((s, t) => s + t.rating, 0);
    return Math.round((sum / this.testimonials.length) * 10) / 10;
  });
  protected readonly count = this.testimonials.length;
  /** Ortalama bloğunun yıldız dolum yüzdesi. */
  protected readonly avgFillPct = computed(() => (this.average() / 5) * 100);

  protected readonly stars = [0, 1, 2, 3, 4];

  /** İsimden baş harfler (avatar). */
  protected initials(name: string): string {
    return name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  }

  protected readonly responsive = [
    { breakpoint: '1024px', numVisible: 2, numScroll: 1 },
    { breakpoint: '640px', numVisible: 1, numScroll: 1 },
  ];
}
