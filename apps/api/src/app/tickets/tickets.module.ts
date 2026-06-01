import { Module } from '@nestjs/common';
import { TicketsController } from './tickets.controller';
import { AdminTicketsController } from './admin-tickets.controller';
import { TicketsService } from './tickets.service';
import { AuthGuard } from '../auth/auth.guard';
import { AdminGuard } from '../admin/admin.guard';

@Module({
  controllers: [TicketsController, AdminTicketsController],
  providers: [TicketsService, AuthGuard, AdminGuard],
})
export class TicketsModule {}
