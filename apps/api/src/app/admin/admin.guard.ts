import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { getCachedProfile, setCachedProfile } from '../auth/token-cache';

export interface AdminContext {
  id: string;
  role: string;
  status: string;
}

/**
 * Validates the bearer access token via Supabase and ensures the caller
 * is an approved admin. Attaches `req.adminUser` for downstream handlers.
 */
@Injectable()
export class AdminGuard implements CanActivate {
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
      if (cached.role !== 'admin' || cached.status !== 'approved') {
        throw new ForbiddenException('Bu işlem için onaylı admin yetkisi gerekli.');
      }
      req.adminUser = cached;
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
      .single<AdminContext>();

    if (!profile || profile.role !== 'admin' || profile.status !== 'approved') {
      throw new ForbiddenException('Bu işlem için onaylı admin yetkisi gerekli.');
    }

    setCachedProfile(token, profile as { id: string; role: 'user' | 'dealer' | 'admin'; status: string });
    req.adminUser = profile;
    return true;
  }
}
