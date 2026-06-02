import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { getCachedProfile, setCachedProfile } from './token-cache';

export interface AuthContext {
  id: string;
  role: 'user' | 'dealer' | 'admin';
  status: string;
}

/**
 * Onaylı (approved) herhangi bir kullanıcıyı doğrular — user / dealer / admin.
 * `req.user` (profil) ve `req.accessToken` (RLS'li sorgular için ham JWT) ekler.
 * AdminGuard'ın rol-bağımsız sürümü.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const header: string | undefined = req.headers['authorization'];

    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Yetkilendirme başlığı eksik.');
    }
    const token = header.slice('Bearer '.length).trim();

    const cached = getCachedProfile(token);
    if (cached) {
      if (cached.status !== 'approved') {
        throw new ForbiddenException('Hesabınız onaylı değil.');
      }
      req.user = cached;
      req.accessToken = token;
      return true;
    }

    const { data, error } = await this.supabase.admin.auth.getUser(token);
    if (error || !data.user) {
      throw new UnauthorizedException('Geçersiz veya süresi dolmuş oturum.');
    }

    const { data: profile } = await this.supabase.admin
      .from('profiles')
      .select('id, role, status')
      .eq('id', data.user.id)
      .single<AuthContext>();

    if (!profile || profile.status !== 'approved') {
      throw new ForbiddenException('Hesabınız onaylı değil.');
    }

    setCachedProfile(token, profile);
    req.user = profile;
    req.accessToken = token;
    return true;
  }
}
