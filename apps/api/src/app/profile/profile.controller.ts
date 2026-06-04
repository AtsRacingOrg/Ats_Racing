import { Body, Controller, Delete, Get, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard, AuthContext } from '../auth/auth.guard';
import { ProfileService } from './profile.service';
import { ChangePasswordDto, UpdateProfileDto, UpsertBillingDto } from './profile.dto';
import { RateLimit } from '../common/rate-limit';

interface AuthedReq {
  user: AuthContext;
  accessToken: string;
}

@ApiTags('account')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('account')
export class ProfileController {
  constructor(private readonly profile: ProfileService) {}

  @Get()
  @ApiOperation({ summary: 'Hesap + fatura bilgileri' })
  account(@Req() req: AuthedReq) {
    return this.profile.getAccount(req.user.id);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Ad / telefon güncelle' })
  updateProfile(@Body() dto: UpdateProfileDto, @Req() req: AuthedReq) {
    return this.profile.updateProfile(req.user.id, dto);
  }

  @Post('password')
  @RateLimit({ limit: 5, window: 60, hard: 20, block: 900, name: 'pw-change' })
  @ApiOperation({ summary: 'Şifre değiştir' })
  changePassword(@Body() dto: ChangePasswordDto, @Req() req: AuthedReq) {
    return this.profile.changePassword(req.accessToken, dto.newPassword);
  }

  @Put('billing')
  @ApiOperation({ summary: 'Fatura bilgilerini kaydet (bireysel/kurumsal)' })
  upsertBilling(@Body() dto: UpsertBillingDto, @Req() req: AuthedReq) {
    return this.profile.upsertBilling(req.user.id, dto);
  }

  @Delete('billing')
  @ApiOperation({ summary: 'Fatura bilgilerini sil' })
  deleteBilling(@Req() req: AuthedReq) {
    return this.profile.deleteBilling(req.user.id);
  }
}
