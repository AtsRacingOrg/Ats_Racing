import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { SectionHeading } from '../../../shared/ui/section-heading/section-heading';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

interface Value {
  readonly icon: string;
  readonly titleKey: string;
  readonly textKey: string;
}

@Component({
  selector: 'app-about-values',
  standalone: true,
  imports: [SectionHeading, RevealDirective, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './values.html',
  styleUrl: './values.scss',
})
export class AboutValues {
  protected readonly values: readonly Value[] = [
    { icon: 'pi pi-shield',   titleKey: 'about.values.1.title', textKey: 'about.values.1.text' },
    { icon: 'pi pi-cog',      titleKey: 'about.values.2.title', textKey: 'about.values.2.text' },
    { icon: 'pi pi-heart',    titleKey: 'about.values.3.title', textKey: 'about.values.3.text' },
    { icon: 'pi pi-verified', titleKey: 'about.values.4.title', textKey: 'about.values.4.text' },
  ];
}
