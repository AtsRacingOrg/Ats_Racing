import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/users')
export class AdminUsersController {
  constructor(private readonly admin: AdminService) {}

  @Get()
  @ApiOperation({ summary: 'Tüm kullanıcılar (sipariş özetiyle)' })
  list() {
    return this.admin.listUsers();
  }
}
