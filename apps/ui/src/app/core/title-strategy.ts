import { Injectable, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import {
  ActivatedRouteSnapshot,
  RouterStateSnapshot,
  TitleStrategy,
} from '@angular/router';

const APP_NAME = 'Ats Racing';

@Injectable({ providedIn: 'root' })
export class BrandTitleStrategy extends TitleStrategy {
  private readonly title = inject(Title);

  override updateTitle(state: RouterStateSnapshot): void {
    const fromData = this.firstTitle(state.root);
    this.title.setTitle(fromData ? `${fromData} · ${APP_NAME}` : APP_NAME);
  }

  private firstTitle(route: ActivatedRouteSnapshot | null): string | undefined {
    let current: ActivatedRouteSnapshot | null = route;
    let title: string | undefined;
    while (current) {
      const t = current.data['title'];
      if (typeof t === 'string') title = t;
      current = current.firstChild;
    }
    return title;
  }
}
