import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-contact-map',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="map-band" aria-label="Atölye konumu">
      <a
        class="map-band__frame"
        href="https://www.google.com/maps/search/?api=1&query=Atat%C3%BCrk+Mahallesi+%C4%B0stanbul"
        target="_blank"
        rel="noopener"
        aria-label="Google Haritalar'da aç"
      >
        <img
          src="https://staticmap.openstreetmap.de/staticmap.php?center=41.0367,28.9850&zoom=13&size=1600x420&maptype=mapnik&markers=41.0367,28.9850,red-pushpin"
          alt="Atölye konum haritası"
          loading="lazy"
          decoding="async"
        />
        <div class="map-band__veil" aria-hidden="true"></div>
        <div class="map-band__pin" aria-hidden="true">
          <i class="pi pi-map-marker"></i>
        </div>
        <div class="map-band__cta">
          <span class="map-band__cta-eyebrow">Bizi Ziyaret Et</span>
          <span class="map-band__cta-title">Atatürk Mah. Performans Cad. No:42 · İstanbul</span>
          <span class="map-band__cta-link">Google Haritalar'da aç <i class="pi pi-arrow-up-right"></i></span>
        </div>
      </a>
    </section>
  `,
  styles: [
    `
      .map-band {
        background: #0d0c0f;
      }
      .map-band__frame {
        position: relative;
        display: block;
        height: clamp(320px, 50vh, 480px);
        width: 100%;
        overflow: hidden;
        text-decoration: none;
        color: #ffffff;
      }
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
        filter: grayscale(0.6) contrast(1.05) brightness(0.9);
      }
      .map-band__veil {
        position: absolute;
        inset: 0;
        background: linear-gradient(180deg, rgba(13, 12, 15, 0.25) 0%, rgba(13, 12, 15, 0.85) 100%);
      }
      .map-band__pin {
        position: absolute;
        inset: 50% auto auto 50%;
        transform: translate(-50%, -120%);
        background: #ea0a0b;
        color: #ffffff;
        width: 52px;
        height: 52px;
        display: grid;
        place-items: center;
        border-radius: 999px;
        box-shadow: 0 12px 28px rgba(234, 10, 11, 0.5), 0 0 0 6px rgba(234, 10, 11, 0.2);
        font-size: 1.35rem;
        pointer-events: none;
        animation: pin-pulse 2.6s ease-in-out infinite;
      }
      @keyframes pin-pulse {
        0%, 100% { box-shadow: 0 12px 28px rgba(234, 10, 11, 0.5), 0 0 0 6px rgba(234, 10, 11, 0.2); }
        50%      { box-shadow: 0 12px 28px rgba(234, 10, 11, 0.55), 0 0 0 14px rgba(234, 10, 11, 0); }
      }
      .map-band__cta {
        position: absolute;
        left: 1.5rem;
        right: 1.5rem;
        bottom: 1.5rem;
        max-width: 1600px;
        margin-inline: auto;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }
      @media (min-width: 768px) {
        .map-band__cta { left: 3rem; right: 3rem; bottom: 2rem; }
      }
      @media (min-width: 1280px) {
        .map-band__cta { left: 70px; right: 70px; }
      }
      .map-band__cta-eyebrow {
        font-family: 'DM Sans', sans-serif;
        text-transform: uppercase;
        letter-spacing: 0.22em;
        font-size: 0.75rem;
        font-weight: 600;
        color: #ea0a0b;
      }
      .map-band__cta-title {
        font-family: 'Barlow Condensed', sans-serif;
        font-weight: 600;
        text-transform: uppercase;
        font-size: clamp(1.25rem, 2.5vw, 1.875rem);
        line-height: 1.1;
        color: #ffffff;
      }
      .map-band__cta-link {
        font-family: 'DM Sans', sans-serif;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.16em;
        font-size: 0.8125rem;
        color: rgba(255, 255, 255, 0.8);
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        margin-top: 0.4rem;
      }
      .map-band__frame:hover .map-band__cta-link {
        color: #ea0a0b;
      }
      @media (prefers-reduced-motion: reduce) {
        .map-band__pin { animation: none; }
      }
    `,
  ],
})
export class ContactMap {}
