import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ResendDto } from './dto/resend.dto';
import { RateLimit } from '../common/rate-limit';

type Hdrs = Record<string, string | string[] | undefined>;

/**
 * İsteğin geldiği site adresini (origin) çıkarır:
 *  1) Origin header (cross-origin isteklerde güvenilir)
 *  2) Referer header'ından origin
 *  3) x-forwarded-proto + (x-forwarded-host | host) — same-origin'de Origin
 *     gönderilmese bile isteğin kendi host'undan kurar (Vercel domain'i).
 */
function originFromRequest(req: { headers: Hdrs }): string {
  const h = req.headers;
  const first = (v: string | string[] | undefined) =>
    (Array.isArray(v) ? v[0] : v)?.split(',')[0]?.trim();

  const origin = first(h['origin']);
  if (origin && /^https?:\/\//i.test(origin)) { return origin; }

  const referer = first(h['referer']);
  if (referer) { try { return new URL(referer).origin; } catch { /* yoksay */ } }

  const proto = first(h['x-forwarded-proto']) || 'https';
  const host = first(h['x-forwarded-host']) || first(h['host']);
  if (host) { return `${proto}://${host}`; }
  return '';
}

function extractBearer(header?: string): string {
  if (!header?.startsWith('Bearer ')) {
    throw new UnauthorizedException('Yetkilendirme başlığı eksik.');
  }
  return header.slice('Bearer '.length).trim();
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @RateLimit({ limit: 6, window: 60, hard: 20, block: 1800, name: 'register' })
  @ApiOperation({ summary: 'Kullanıcı veya bayi kaydı (e-posta doğrulama + admin onay gerektirir)' })
  @ApiOkResponse({ description: 'Kayıt alındı, doğrulama e-postası gönderildi.' })
  register(@Body() dto: RegisterDto, @Req() req: { headers: Hdrs }) {
    return this.auth.register(dto, originFromRequest(req));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 10, window: 60, hard: 40, block: 900, name: 'login' })
  @ApiOperation({ summary: 'Giriş yap (yalnızca doğrulanmış + onaylanmış hesaplar)' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @RateLimit({ limit: 5, window: 60, hard: 15, block: 900, name: 'resend' })
  @ApiOperation({ summary: 'Doğrulama e-postasını tekrar gönder' })
  resend(@Body() dto: ResendDto, @Req() req: { headers: Hdrs }) {
    return this.auth.resendVerification(dto.email, originFromRequest(req));
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mevcut oturumdaki kullanıcıyı getir' })
  me(@Headers('authorization') authorization?: string) {
    return this.auth.me(extractBearer(authorization));
  }
}
