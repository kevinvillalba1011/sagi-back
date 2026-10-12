import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/index.js';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto.js';
import { Perm } from './permissions.constants.js';
import { RolesService } from './roles.service.js';

@ApiTags('roles')
@ApiBearerAuth()
@Controller()
export class RolesController {
  constructor(private readonly roles: RolesService) {}

  @RequirePermissions(Perm.ROLES_READ)
  @Get('permissions')
  permissions() {
    return this.roles.listPermissions();
  }

  @RequirePermissions(Perm.ROLES_READ)
  @Get('roles')
  list() {
    return this.roles.list();
  }

  @RequirePermissions(Perm.ROLES_READ)
  @Get('roles/:id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.roles.findOne(id);
  }

  @RequirePermissions(Perm.ROLES_MANAGE)
  @Post('roles')
  create(@Body() dto: CreateRoleDto) {
    return this.roles.create(dto);
  }

  @RequirePermissions(Perm.ROLES_MANAGE)
  @Patch('roles/:id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoleDto) {
    return this.roles.update(id, dto);
  }

  @RequirePermissions(Perm.ROLES_MANAGE)
  @HttpCode(204)
  @Delete('roles/:id')
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.roles.remove(id);
  }
}
