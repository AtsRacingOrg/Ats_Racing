import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-site-footer',
  standalone: true,
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './site-footer.html',
  styleUrl: './site-footer.scss',
})
export class SiteFooter {
  protected readonly year = new Date().getFullYear();

  protected readonly sitemap: ReadonlyArray<{ label: string; path: string }> = [
    { label: 'Anasayfa', path: '/' },
    { label: 'Hakkımızda', path: '/about' },
    { label: 'İletişim', path: '/contact' },
    { label: 'Giriş Yap', path: '/login' },
  ];

  protected readonly socials: ReadonlyArray<{ label: string; icon: string; href: string }> = [
    { label: 'Instagram', icon: 'pi pi-instagram', href: '#' },
    { label: 'YouTube', icon: 'pi pi-youtube', href: '#' },
    { label: 'Facebook', icon: 'pi pi-facebook', href: '#' },
    { label: 'WhatsApp', icon: 'pi pi-whatsapp', href: '#' },
  ];
}
