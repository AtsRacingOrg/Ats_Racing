import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminUsersController } from './admin-users.controller';
import { AdminStatementsController } from './admin-statements.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';

@Module({
  controllers: [AdminController, AdminUsersController, AdminStatementsController],
  providers: [AdminService, AdminGuard],
})
export class AdminModule {}
