import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
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

  @Get(':id/statements')
  @ApiOperation({ summary: 'Bayinin aylık ekstreleri' })
  statements(@Param('id', ParseUUIDPipe) id: string) {
    return this.admin.listDealerStatements(id);
  }

  @Post(':id/active')
  @ApiOperation({ summary: 'Kullanıcı/bayi hesabını aktif veya pasif yap' })
  setActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { active: boolean },
    @Req() req: { adminUser: { id: string } },
  ) {
    return this.admin.setActive(id, req.adminUser.id, !!body?.active);
  }
}
