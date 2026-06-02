import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { AuthGuard } from '../auth/auth.guard';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, AuthGuard],
})
export class NotificationsModule {}
