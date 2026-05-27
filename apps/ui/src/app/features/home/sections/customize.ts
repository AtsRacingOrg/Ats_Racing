import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RevealDirective } from '../../../shared/directives/reveal.directive';

@Component({
  selector: 'app-home-customize',
  standalone: true,
  imports: [RouterLink, ButtonModule, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './customize.html',
  styleUrl: './customize.scss',
})
export class HomeCustomize {}
