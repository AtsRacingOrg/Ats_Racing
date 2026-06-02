import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseService } from '../supabase/supabase.service';
import { AccountType, RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  AuthUser,
  ProfileRow,
  toAuthUser,
} from './auth.types';

export interface LoginResult {
  token: string;
  refreshToken: string;
  user: AuthUser;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
  ) {}

  private get appUrl(): string {
    return this.config.get<string>('APP_URL') ?? 'http://localhost:4200';
  }

  /**
   * Register a new user or dealer. Always creates a PENDING account and
   * triggers Supabase's email-verification flow. Never grants a session —
   * the user must (1) confirm their email and (2) be approved by an admin.
   */
  async register(dto: RegisterDto): Promise<{ message: string }> {
    // Defensive: role is derived server-side; clients can never self-assign admin.
    const role: 'user' | 'dealer' =
      dto.accountType === AccountType.dealer ? 'dealer' : 'user';

    if (role === 'dealer' && !dto.dealershipName?.trim()) {
      throw new BadRequestException('Bayi kaydı için bayi adı zorunlu.');
    }

    const { data, error } = await this.supabase.anon.auth.signUp({
      email: dto.email,
      password: dto.password,
      options: {
        emailRedirectTo: `${this.appUrl}/login?verified=1`,
        data: {
          role,
          full_name: dto.fullName,
          phone: dto.phone ?? null,
          dealership_name: role === 'dealer' ? dto.dealershipName : null,
        },
      },
    });

    if (error) {
      // Supabase returns a generic message for already-registered emails.
      if (/already registered|already exists|User already/i.test(error.message)) {
        throw new ConflictException('Bu e-posta ile zaten bir hesap var.');
      }
      this.logger.error(`signUp failed: ${error.message}`);
      throw new BadRequestException(error.message);
    }

    if (!data.user) {
      throw new InternalServerErrorException('Kayıt oluşturulamadı.');
    }

    return {
      message: role === 'dealer'
        ? 'Bayi kaydın alındı. E-posta adresine gönderilen doğrulama bağlantısına tıkla. ' +
          'Doğrulamadan sonra hesabın admin onayına düşecek; onaylanınca giriş yapabilirsin.'
        : 'Kaydın alındı. E-posta adresine gönderilen doğrulama bağlantısına tıkla. ' +
          'Doğrulamadan sonra hemen giriş yapabilirsin.',
    };
  }

  /**
   * Authenticate, then enforce the double gate:
   *  1. Email must be confirmed (Supabase rejects unconfirmed sign-in).
   *  2. Profile status must be 'approved'.
   * Only then is a session token returned.
   */
  async login(dto: LoginDto): Promise<LoginResult> {
    const { data, error } = await this.supabase.anon.auth.signInWithPassword({
      email: dto.email,
      password: dto.password,
    });

    if (error) {
      if (/email not confirmed/i.test(error.message)) {
        throw new ForbiddenException(
          'E-posta adresin henüz doğrulanmamış. Gelen kutunu kontrol et.',
        );
      }
      // Genuine "wrong password" returns a 400 invalid_credentials from GoTrue.
      // Anything else (network error, bad SUPABASE_URL/key, fetch failure)
      // means the request never authenticated against Supabase — surface that
      // as a 500 so it is not silently masked as "wrong password".
      const status = (error as { status?: number }).status;
      if (status !== 400) {
        this.logger.error(
          `signIn unexpected failure (status=${status}, name=${error.name}): ${error.message}`,
        );
        throw new InternalServerErrorException(
          'Kimlik doğrulama servisine ulaşılamadı. Lütfen daha sonra tekrar dene.',
        );
      }
      throw new UnauthorizedException('E-posta veya şifre hatalı.');
    }

    if (!data.session || !data.user) {
      throw new UnauthorizedException('Oturum oluşturulamadı.');
    }

    // Read the profile using the user's own JWT (respects RLS: profiles_select_own).
    // Service-role key is NOT needed here.
    const profile = await this.getProfile(data.user.id, data.session.access_token);

    if (profile.status === 'rejected') {
      throw new ForbiddenException(
        profile.rejection_reason
          ? `Başvurun reddedildi: ${profile.rejection_reason}`
          : 'Başvurun reddedildi. Lütfen bizimle iletişime geç.',
      );
    }

    if (profile.status !== 'approved') {
      throw new ForbiddenException(
        'Hesabın admin onayı bekliyor. Onaylandığında giriş yapabileceksin.',
      );
    }

    return {
      token: data.session.access_token,
      refreshToken: data.session.refresh_token,
      user: toAuthUser(profile),
    };
  }

  /** Resolve the current user from a bearer access token. */
  async me(accessToken: string): Promise<AuthUser> {
    const userClient = this.supabase.clientFor(accessToken);
    const { data, error } = await userClient.auth.getUser();
    if (error || !data.user) {
      throw new UnauthorizedException('Geçersiz veya süresi dolmuş oturum.');
    }
    const profile = await this.getProfile(data.user.id, accessToken);
    if (profile.status !== 'approved') {
      throw new ForbiddenException('Hesabın aktif değil.');
    }
    return toAuthUser(profile);
  }

  /** Re-send the signup confirmation email. */
  async resendVerification(email: string): Promise<{ message: string }> {
    const { error } = await this.supabase.anon.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${this.appUrl}/login?verified=1` },
    });
    if (error) {
      this.logger.warn(`resend failed: ${error.message}`);
    }
    // Always return success to avoid leaking which emails are registered.
    return { message: 'Eğer bu e-posta kayıtlıysa doğrulama bağlantısı tekrar gönderildi.' };
  }

  private async getProfile(id: string, accessToken?: string): Promise<ProfileRow> {
    // Use the user's own JWT when available (no service-role key needed).
    // Fall back to the admin client for server-initiated calls (e.g. admin endpoints).
    const client = accessToken
      ? this.supabase.clientFor(accessToken)
      : this.supabase.admin;

    const { data, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single<ProfileRow>();

    if (error || !data) {
      this.logger.error(`profile not found for ${id}: ${error?.message}`);
      throw new InternalServerErrorException('Kullanıcı profili bulunamadı.');
    }
    return data;
  }
}
