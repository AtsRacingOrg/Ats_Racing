import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
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
  register(@Body() dto: RegisterDto, @Headers('origin') origin?: string) {
    return this.auth.register(dto, origin);
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
  resend(@Body() dto: ResendDto, @Headers('origin') origin?: string) {
    return this.auth.resendVerification(dto.email, origin);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mevcut oturumdaki kullanıcıyı getir' })
  me(@Headers('authorization') authorization?: string) {
    return this.auth.me(extractBearer(authorization));
  }
}
