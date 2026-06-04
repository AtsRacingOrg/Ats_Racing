import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { EvcBadge } from '../../shared/ui/evc-badge/evc-badge';
import { TranslatePipe } from '../../core/i18n/translate.pipe';

@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [RouterLink, EvcBadge, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.scss',
})
export class SiteFooter {
  protected readonly year = new Date().getFullYear();

  protected readonly sitemap: ReadonlyArray<{ key: string; path: string }> = [
    { key: 'nav.home', path: '/' },
    { key: 'nav.about', path: '/about' },
    { key: 'nav.contact', path: '/contact' },
    { key: 'common.login', path: '/login' },
  ];

  protected readonly socials: ReadonlyArray<{ label: string; icon: string; href: string }> = [
    { label: 'Instagram', icon: 'pi pi-instagram', href: '#' },
    { label: 'YouTube', icon: 'pi pi-youtube', href: '#' },
    { label: 'Facebook', icon: 'pi pi-facebook', href: '#' },
    { label: 'WhatsApp', icon: 'pi pi-whatsapp', href: '#' },
  ];
}
