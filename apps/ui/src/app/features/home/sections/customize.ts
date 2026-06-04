import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RevealDirective } from '../../../shared/directives/reveal.directive';
import { TranslatePipe } from '../../../core/i18n/translate.pipe';

@Component({
  selector: 'app-home-customize',
  standalone: true,
  imports: [RouterLink, ButtonModule, RevealDirective, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customize.html',
  styleUrl: './customize.scss',
})
export class HomeCustomize {}
