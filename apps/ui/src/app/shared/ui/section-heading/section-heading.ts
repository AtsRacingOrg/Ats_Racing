import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-section-heading',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (eyebrow()) {
      <p class="eyebrow">{{ eyebrow() }}</p>
    }
    <h2 [class.on-dark]="onDark()">{{ title() }}</h2>
    @if (lead()) {
      <p class="lead" [class.on-dark]="onDark()">{{ lead() }}</p>
    }
  `,
  styles: [
    `
      :host {
        display: block;
        max-width: 48rem;
      }
      :host([align='center']) {
        margin-inline: auto;
        text-align: center;
      }
      .eyebrow {
        font-family: 'DM Sans', sans-serif;
        text-transform: uppercase;
        letter-spacing: 0.22em;
        color: #ea0a0b;
        font-size: 0.8125rem;
        font-weight: 600;
        margin: 0 0 1rem;
      }
      h2.on-dark {
        color: #ffffff;
      }
      .lead {
        margin: 1.25rem 0 0;
        color: #615f5c;
        font-size: 1.0625rem;
        line-height: 1.65;
      }
      .lead.on-dark {
        color: rgba(255, 255, 255, 0.72);
      }
    `,
  ],
})
export class SectionHeading {
  readonly eyebrow = input<string>('');
  readonly title = input.required<string>();
  readonly lead = input<string>('');
  readonly onDark = input<boolean>(false);
}
