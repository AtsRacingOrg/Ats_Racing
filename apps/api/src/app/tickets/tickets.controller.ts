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
import { TicketsService } from './tickets.service';
import { CreateTicketDto, ReplyTicketDto } from './dto/ticket.dto';

interface AuthedReq {
  user: AuthContext;
  accessToken: string;
}

@ApiTags('tickets')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller('tickets')
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Yeni destek talebi (sipariş ile ilgili veya özel)' })
  create(@Body() dto: CreateTicketDto, @Req() req: AuthedReq) {
    return this.tickets.create(req.accessToken, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Destek taleplerim' })
  myTickets(@Req() req: AuthedReq) {
    return this.tickets.listMine(req.accessToken);
  }

  @Post(':id/reply')
  @ApiOperation({ summary: 'Talebe yanıt yaz' })
  reply(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplyTicketDto,
    @Req() req: AuthedReq,
  ) {
    return this.tickets.reply(req.accessToken, id, dto.body);
  }
}
