import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthGuard, AuthContext } from '../auth/auth.guard';
import { OrdersService, UploadedFileLike } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { RateLimit } from '../common/rate-limit';

interface AuthedReq {
  user: AuthContext;
  accessToken: string;
}

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller()
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post('orders')
  @RateLimit({ limit: 20, window: 60, hard: 80, block: 900, name: 'order-create' })
  @ApiOperation({ summary: 'Yeni sipariş oluştur (Araçlar ekranından)' })
  create(@Body() dto: CreateOrderDto, @Req() req: AuthedReq) {
    return this.orders.create(req.accessToken, dto);
  }

  @Post('orders/:id/file')
  @RateLimit({ limit: 20, window: 60, hard: 80, block: 900, name: 'order-file' })
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Siparişe orijinal ECU dosyası yükle' })
  @UseInterceptors(FileInterceptor('file'))
  uploadFile(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: UploadedFileLike,
    @Req() req: AuthedReq,
  ) {
    return this.orders.uploadOriginalFile(req.user.id, id, file);
  }

  @Get('orders')
  @ApiOperation({ summary: 'Siparişlerim' })
  myOrders(@Req() req: AuthedReq) {
    return this.orders.listMine(req.accessToken);
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Sipariş detayı' })
  getOne(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthedReq) {
    return this.orders.getOne(req.accessToken, id);
  }

  @Get('orders/:id/download')
  @ApiOperation({ summary: 'Dosya için imzalı indirme linki (kind: delivered/original)' })
  download(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: AuthedReq,
    @Query('kind') kind?: 'original' | 'delivered',
  ) {
    return this.orders.getDownloadUrl(req.accessToken, id, kind ?? 'delivered');
  }

  @Get('payments/statements')
  @ApiOperation({ summary: 'Bayi ekstreleri (Ödeme Borçlarım)' })
  statements(@Req() req: AuthedReq) {
    if (req.user.role !== 'dealer') {
      return [];
    }
    return this.orders.listStatements(req.accessToken);
  }

  @Post('payments/statements/:id/pay')
  @RateLimit({ limit: 10, window: 60, hard: 40, block: 900, name: 'statement-pay' })
  @ApiOperation({ summary: 'Bayi ekstresini öder (mock tahsilat)' })
  payStatement(@Param('id', ParseUUIDPipe) id: string, @Req() req: AuthedReq) {
    return this.orders.payStatement(req.user.id, id);
  }
}
