import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Attaches the Bearer token to every outgoing API request automatically.
 * - 401 → clears session, redirects to /login.
 * - 403 RATE_BLOCKED → kullanıcı aşırı istek nedeniyle bloklandı: logout + login.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth   = inject(AuthService);
  const router = inject(Router);

  const token = auth.token;
  const authReq = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(authReq).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        const code = (err.error as { code?: string } | null)?.code;
        if (err.status === 401) {
          auth.logout();
          router.navigate(['/login']);
        } else if (err.status === 403 && code === 'RATE_BLOCKED') {
          // Aşırı istek → oturumu kapat ve giriş ekranına yönlendir (mesajla).
          auth.logout();
          router.navigate(['/login'], {
            queryParams: { blocked: '1' },
          });
        }
      }
      return throwError(() => err);
    }),
  );
};
