import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminGuard } from '../admin/admin.guard';
import { OrdersService, UploadedFileLike } from './orders.service';
import { UpdateOrderStatusDto } from './dto/create-order.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Tüm siparişler (müşteri bilgisiyle)' })
  list() {
    return this.orders.adminList();
  }

  @Post(':id/status')
  @ApiOperation({ summary: 'Sipariş durumunu güncelle' })
  setStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
    @Req() req: { adminUser: { id: string } },
  ) {
    return this.orders.adminSetStatus(id, dto.status, req.adminUser.id, dto.reason ?? null);
  }

  @Post(':id/deliver')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Hazırlanan yazılım dosyasını müşteriye gönder' })
  @UseInterceptors(FileInterceptor('file'))
  deliver(
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: UploadedFileLike,
    @Body() body: { note?: string },
    @Req() req: { adminUser: { id: string } },
  ) {
    return this.orders.adminDeliverFile(id, file, req.adminUser.id, body?.note);
  }

  @Post(':id/delivered-note')
  @ApiOperation({ summary: 'Gönderilmiş yazılım dosyasının notunu güncelle' })
  updateDeliveredNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { note?: string | null },
  ) {
    return this.orders.adminUpdateDeliveredNote(id, body?.note ?? null);
  }
}
