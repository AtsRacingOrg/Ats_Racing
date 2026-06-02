import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard, AuthContext } from '../auth/auth.guard';
import { NotificationsService } from './notifications.service';

interface AuthedReq {
  user: AuthContext;
  accessToken: string;
}

@ApiTags('notifications')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Bildirimlerim (en yeni önce)' })
  list(@Req() req: AuthedReq) {
    return this.notifications.listMine(req.user.id);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Okunmamış bildirim sayıları' })
  summary(@Req() req: AuthedReq) {
    return this.notifications.summary(req.user.id);
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Tüm (veya kategori) bildirimleri okundu işaretle' })
  readAll(@Body() body: { category?: string }, @Req() req: AuthedReq) {
    return this.notifications.markAllRead(req.user.id, body?.category);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'Bildirimi okundu işaretle' })
  read(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthedReq) {
    return this.notifications.markRead(req.user.id, id);
  }
}
