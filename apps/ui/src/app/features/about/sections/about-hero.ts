import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-about-hero',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './about-hero.html',
  styleUrl: './about-hero.scss',
})
export class AboutHero {}
