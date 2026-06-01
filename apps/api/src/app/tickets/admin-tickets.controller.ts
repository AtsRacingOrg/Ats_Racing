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
import { AdminGuard } from '../admin/admin.guard';
import { TicketsService } from './tickets.service';
import { ReplyTicketDto, TicketStatusDto } from './dto/ticket.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/tickets')
export class AdminTicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Get()
  @ApiOperation({ summary: 'Tüm destek talepleri (müşteri bilgisiyle)' })
  list() {
    return this.tickets.adminList();
  }

  @Post(':id/reply')
  @ApiOperation({ summary: 'Talebe destek yanıtı yaz' })
  reply(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplyTicketDto,
    @Req() req: { adminUser: { id: string } },
  ) {
    return this.tickets.adminReply(id, dto.body, req.adminUser.id);
  }

  @Post(':id/status')
  @ApiOperation({ summary: 'Talep durumunu güncelle' })
  setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TicketStatusDto,
  ) {
    return this.tickets.adminSetStatus(id, dto.status);
  }
}
