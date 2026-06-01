import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Ortak sayfa yükleme göstergesi — veri gelene kadar gösterilir. */
@Component({
  selector: 'app-page-loader',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="pl">
      <div class="pl__spinner"></div>
      <span class="pl__text">{{ text }}</span>
    </div>
  `,
  styles: [`
    .pl {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 1rem; padding: 5rem 1rem; min-height: 320px;
    }
    .pl__spinner {
      width: 38px; height: 38px; border-radius: 50%;
      border: 3px solid rgba(255,255,255,0.1);
      border-top-color: #e63946;
      animation: pl-spin 0.7s linear infinite;
    }
    .pl__text { font-size: 0.82rem; color: rgba(255,255,255,0.4); }
    @keyframes pl-spin { to { transform: rotate(360deg); } }
  `],
})
export class PageLoader {
  @Input() text = 'Yükleniyor…';
}
