import { ChangeDetectionStrategy, Component } from '@angular/core';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

interface InfoItem {
  readonly icon: string;
  readonly labelKey: string;
  readonly value: string;
  readonly href?: string;
}

@Component({
  selector: 'app-contact-info',
  standalone: true,
  imports: [TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './contact-info.html',
  styleUrl: './contact-info.scss',
})
export class ContactInfo {
  // Değerler (adres, telefon, e-posta) sabit; sadece etiketler çevrilir.
  protected readonly items: readonly InfoItem[] = [
    { icon: 'pi pi-map-marker', labelKey: 'contact.info.address', value: 'ATS RACING GULEN HAN NO: 21 NO: 9 GUNGOREN MEHMET NESIH OZMEN MAH. UZUN SK ISTANBUL GUNGOREN, TIISTANBUL AREA 34169 TR' },
    { icon: 'pi pi-phone',      labelKey: 'contact.info.phone',  value: '+90 (212) 000 00 00', href: 'tel:+902120000000' },
    { icon: 'pi pi-envelope',   labelKey: 'contact.info.email',  value: 'mapping@atsracing.com.tr',  href: 'mailto:mapping@atsracing.com.tr' },
    { icon: 'pi pi-clock',      labelKey: 'contact.info.hours',  value: 'Pzt – Cts · 09:00 – 19:00' },
  ];

  protected readonly socials: ReadonlyArray<{ icon: string; href: string; label: string }> = [
    { icon: 'pi pi-instagram', href: '#', label: 'Instagram' },
    { icon: 'pi pi-youtube',   href: '#', label: 'YouTube' },
    { icon: 'pi pi-facebook',  href: '#', label: 'Facebook' },
    { icon: 'pi pi-whatsapp',  href: '#', label: 'WhatsApp' },
  ];
}
