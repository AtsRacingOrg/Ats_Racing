import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';

@Module({
  controllers: [AdminController, AdminUsersController],
  providers: [AdminService, AdminGuard],
})
export class AdminModule {}
