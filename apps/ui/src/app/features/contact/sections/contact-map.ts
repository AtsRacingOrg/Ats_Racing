import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { inject } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

const MAP_QUERY = 'Kadıköy, İstanbul';
const MAP_EMBED_URL = `https://www.google.com/maps?q=${encodeURIComponent(MAP_QUERY)}&output=embed&z=15`;
const MAP_SEARCH_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(MAP_QUERY)}`;
const MAP_DIRECTIONS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(MAP_QUERY)}`;

@Component({
  selector: 'app-contact-map',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="map-band" aria-label="Atölye konumu">
      <div class="map-band__frame">
        <iframe
          [src]="mapUrl"
          title="ATS Racing — atölye konumu (Google Haritalar)"
          loading="lazy"
          referrerpolicy="no-referrer-when-downgrade"
          allowfullscreen
        ></iframe>
      </div>

      <div class="map-band__footer">
        <div class="map-band__inner">
          <div class="map-band__copy">
            <p class="map-band__eyebrow">{{ 'contact.map.eyebrow' | t }}</p>
            <h2 class="map-band__title">Atatürk Mah. Performans Cad. No:42</h2>
            <p class="map-band__sub">{{ 'contact.map.sub' | t }}</p>
          </div>
          <div class="map-band__actions">
            <a class="mb-btn mb-btn--ghost" [href]="searchUrl" target="_blank" rel="noopener">
              <i class="pi pi-map"></i>
              <span>{{ 'contact.map.open' | t }}</span>
            </a>
            <a class="mb-btn mb-btn--primary" [href]="directionsUrl" target="_blank" rel="noopener">
              <i class="pi pi-compass"></i>
              <span>{{ 'contact.map.directions' | t }}</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [
    `
      .map-band {
        background: #0d0c0f;
      }

      .map-band__frame {
        position: relative;
        width: 100%;
        height: clamp(360px, 55vh, 520px);
        overflow: hidden;
      }

      iframe {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        border: 0;
        display: block;
        filter: grayscale(0.25) contrast(1.02);
      }

      .map-band__footer {
        background: #0d0c0f;
        color: #ffffff;
        border-top: 1px solid rgba(255, 255, 255, 0.06);
      }

      .map-band__inner {
        max-width: 1600px;
        margin-inline: auto;
        padding: 2rem 1.5rem;
        display: grid;
        gap: 1.5rem;
        align-items: center;

        @media (min-width: 768px) {
          padding: 2rem 3rem;
          grid-template-columns: 1.6fr 1fr;
        }

        @media (min-width: 1280px) { padding: 2rem 70px; }
      }

      .map-band__eyebrow {
        font-family: 'DM Sans', sans-serif;
        text-transform: uppercase;
        letter-spacing: 0.22em;
        font-size: 0.75rem;
        font-weight: 600;
        color: #ea0a0b;
        margin: 0 0 0.5rem;
      }

      .map-band__title {
        font-family: 'Barlow Condensed', sans-serif;
        font-weight: 700;
        text-transform: uppercase;
        font-size: clamp(1.375rem, 2.4vw, 1.875rem);
        line-height: 1.1;
        color: #ffffff;
        margin: 0 0 0.4rem;
      }

      .map-band__sub {
        margin: 0;
        color: rgba(255, 255, 255, 0.65);
        font-size: 0.875rem;
        line-height: 1.5;
      }

      .map-band__actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.6rem;

        @media (min-width: 768px) {
          justify-content: flex-end;
        }
      }

      .mb-btn {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.7rem 1.1rem;
        font-family: 'DM Sans', sans-serif;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        font-size: 0.75rem;
        text-decoration: none;
        transition: background-color 200ms ease, border-color 200ms ease, color 200ms ease;
      }

      .mb-btn--primary {
        background: #ea0a0b;
        color: #ffffff;
        border: 1px solid #ea0a0b;

        &:hover { background: #ff2020; border-color: #ff2020; }
      }

      .mb-btn--ghost {
        background: transparent;
        color: #ffffff;
        border: 1px solid rgba(255, 255, 255, 0.2);

        &:hover { background: rgba(255, 255, 255, 0.08); border-color: #ffffff; }
      }
    `,
  ],
})
export class ContactMap {
  private readonly sanitizer = inject(DomSanitizer);
  protected readonly mapUrl: SafeResourceUrl = this.sanitizer.bypassSecurityTrustResourceUrl(MAP_EMBED_URL);
  protected readonly searchUrl = MAP_SEARCH_URL;
  protected readonly directionsUrl = MAP_DIRECTIONS_URL;
}
