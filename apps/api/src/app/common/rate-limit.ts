import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SupabaseService } from '../supabase/supabase.service';

export interface RateLimitOptions {
  /** Pencere içinde izinli istek sayısı (üstü → 429). */
  limit: number;
  /** Pencere (saniye). */
  window: number;
  /** Sert eşik — üstü geçici blok (403). Varsayılan: limit × 5. */
  hard?: number;
  /** Blok süresi (saniye). Varsayılan: 900 (15 dk). */
  block?: number;
  /** Sayaç kovası adı (uç bazlı ayrım). Varsayılan: 'base'. */
  name?: string;
}

export const RATE_LIMIT_KEY = 'ats_rate_limit';
/** Bir route/controller'a özel limit uygula. */
export const RateLimit = (opts: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, opts);

/** Limit uygulanmayacak uç. */
export const RATE_LIMIT_SKIP = 'ats_rate_limit_skip';
export const SkipRateLimit = () => SetMetadata(RATE_LIMIT_SKIP, true);

/** Global taban limit (dekoratör yoksa). */
const DEFAULT: RateLimitOptions = { limit: 120, window: 60, hard: 600, block: 600, name: 'base' };

interface RlResult { allowed: boolean; blocked: boolean; count: number; retryAt: string }

/**
 * IP bazlı rate limiting (Supabase tablosu — instance'lar arası tutarlı).
 * Tüm uçlara global uygulanır; @RateLimit ile uç bazlı sıkılaştırılır.
 * Sert eşik aşılınca IP geçici bloklanır (403, code: RATE_BLOCKED) — giriş
 * yapmış kullanıcı frontend'de otomatik logout olur.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly supabase: SupabaseService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const skip = this.reflector.getAllAndOverride<boolean>(RATE_LIMIT_SKIP, [
      ctx.getHandler(), ctx.getClass(),
    ]);
    if (skip) { return true; }

    const opts =
      this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
        ctx.getHandler(), ctx.getClass(),
      ]) ?? DEFAULT;

    const req = ctx.switchToHttp().getRequest();
    const ip = this.clientIp(req);
    const key = `rl:${opts.name ?? 'base'}:${ip}`;

    let r: RlResult | null = null;
    try {
      const { data } = await this.supabase.admin.rpc('rl_hit', {
        p_key: key,
        p_limit: opts.limit,
        p_window: opts.window,
        p_hard: opts.hard ?? opts.limit * 5,
        p_block: opts.block ?? 900,
      });
      r = data as RlResult;
    } catch (e) {
      // Rate limit altyapısı hata verirse API'yi düşürme — izin ver (fail-open).
      this.logger.warn(`rl_hit failed, allowing request: ${(e as Error).message}`);
      return true;
    }

    if (!r || r.allowed) { return true; }

    if (r.blocked) {
      throw new HttpException(
        { code: 'RATE_BLOCKED', message: 'Çok fazla istek nedeniyle geçici olarak engellendiniz. Lütfen bir süre sonra tekrar deneyin.', retryAt: r.retryAt },
        HttpStatus.FORBIDDEN,
      );
    }
    throw new HttpException(
      { code: 'RATE_LIMITED', message: 'Çok fazla istek. Lütfen biraz bekleyip tekrar deneyin.', retryAt: r.retryAt },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private clientIp(req: { headers: Record<string, string | string[] | undefined>; ip?: string }): string {
    const xff = req.headers['x-forwarded-for'];
    const fromXff = Array.isArray(xff) ? xff[0] : xff?.split(',')[0];
    return (fromXff || req.ip || 'unknown').trim();
  }
}
