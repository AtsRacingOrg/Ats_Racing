import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { AdminOrdersController } from './admin-orders.controller';
import { OrdersService } from './orders.service';
import { PaytrService } from '../payments/paytr.service';
import { AuthGuard } from '../auth/auth.guard';
import { AdminGuard } from '../admin/admin.guard';

@Module({
  controllers: [OrdersController, AdminOrdersController],
  providers: [OrdersService, PaytrService, AuthGuard, AdminGuard],
})
export class OrdersModule {}
