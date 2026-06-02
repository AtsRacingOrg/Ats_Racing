import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/**
 * Ortak sayfa yükleme göstergesi — admin başvurular ekranıyla aynı shimmer
 * iskelet (3 satır) görünümü. Tüm dashboard/admin ekranlarında kullanılır.
 */
@Component({
  selector: 'app-page-loader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pl-skeleton-list" [attr.aria-label]="text">
      @for (i of rows; track i) {
        <div class="pl-skeleton"></div>
      }
    </div>
  `,
  styles: [`
    .pl-skeleton-list { display: flex; flex-direction: column; gap: 0.75rem; }
    .pl-skeleton {
      height: 96px; border-radius: 16px;
      background: linear-gradient(90deg, #13151c 25%, #1a1d27 50%, #13151c 75%);
      background-size: 200% 100%;
      animation: pl-shimmer 1.4s infinite;
    }
    @keyframes pl-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  `],
})
export class PageLoader {
  @Input() text = 'Yükleniyor…';
  /** Gösterilecek shimmer satır sayısı (varsayılan 3). */
  @Input() count = 3;
  protected get rows(): number[] {
    return Array.from({ length: Math.max(1, this.count) }, (_, i) => i);
  }
}
