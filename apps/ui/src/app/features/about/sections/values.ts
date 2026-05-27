import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { SectionHeading } from '../../../shared/ui/section-heading/section-heading';

interface Value {
  readonly icon: string;
  readonly title: string;
  readonly text: string;
}

@Component({
  selector: 'app-about-values',
  standalone: true,
  imports: [SectionHeading, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './values.html',
  styleUrl: './values.scss',
})
export class AboutValues {
  protected readonly values: readonly Value[] = [
    {
      icon: 'pi pi-shield',
      title: 'Şeffaflık',
      text: 'Her işin öncesi, süreci ve sonrası fotoğraf, video ve dyno raporu ile belgelenir.',
    },
    {
      icon: 'pi pi-cog',
      title: 'Mühendislik',
      text: 'Tahmin yok. Ölçüm, test ve veri-temelli kararlar.',
    },
    {
      icon: 'pi pi-heart',
      title: 'Tutku',
      text: 'Aracın bizim için sadece iş değil — bir hikaye, bir karakter.',
    },
    {
      icon: 'pi pi-verified',
      title: 'Garanti',
      text: 'Her hizmet 24 ay servis garantisi ile teslim edilir.',
    },
  ];
}
