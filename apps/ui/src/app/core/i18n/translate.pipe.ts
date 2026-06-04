import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18nService } from './i18n.service';

/**
 * `{{ 'key' | t }}` — anahtarı aktif dile çevirir.
 * `pure: false` + servis içinde signal okuması sayesinde dil değişince
 * OnPush bileşenlerde bile metin anında güncellenir.
 */
@Pipe({ name: 't', standalone: true, pure: false })
export class TranslatePipe implements PipeTransform {
  private readonly i18n = inject(I18nService);

  transform(key: string, params?: Record<string, string | number>): string {
    return this.i18n.t(key, params);
  }
}
