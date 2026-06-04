import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { SectionHeading } from '../../../shared/ui/section-heading/section-heading';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

interface Member {
  readonly name: string;
  readonly roleKey: string;
  readonly photo: string;
  readonly socials: ReadonlyArray<{ icon: string; href: string; label: string }>;
}

@Component({
  selector: 'app-about-team',
  standalone: true,
  imports: [SectionHeading, RevealDirective, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './team.html',
  styleUrl: './team.scss',
})
export class AboutTeam {
  // İsimler evrensel; sadece rol çevrilir.
  protected readonly team: readonly Member[] = [
    {
      name: 'Ahmet Yıldız',
      roleKey: 'about.team.role.founder',
      photo: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=600&q=80',
      socials: [
        { icon: 'pi pi-instagram', href: '#', label: 'Instagram' },
        { icon: 'pi pi-linkedin', href: '#', label: 'LinkedIn' },
      ],
    },
    {
      name: 'Selin Demir',
      roleKey: 'about.team.role.detailing',
      photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80',
      socials: [
        { icon: 'pi pi-instagram', href: '#', label: 'Instagram' },
      ],
    },
    {
      name: 'Burak Şahin',
      roleKey: 'about.team.role.ecu',
      photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80',
      socials: [
        { icon: 'pi pi-linkedin', href: '#', label: 'LinkedIn' },
      ],
    },
    {
      name: 'Deniz Kara',
      roleKey: 'about.team.role.cx',
      photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=600&q=80',
      socials: [
        { icon: 'pi pi-instagram', href: '#', label: 'Instagram' },
      ],
    },
  ];
}
