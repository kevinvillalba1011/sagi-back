import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser, RequirePermissions } from '../../common/decorators/index.js';
import { Perm } from '../roles/permissions.constants.js';
import { CreateUserDto, ListUsersQueryDto, ResetPasswordDto, UpdateUserDto } from './dto/user.dto.js';
import { UsersService } from './users.service.js';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @RequirePermissions(Perm.USERS_CREATE)
  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthUser) {
    return this.users.create(dto, actor);
  }

  @RequirePermissions(Perm.USERS_READ)
  @Get()
  list(@Query() q: ListUsersQueryDto) {
    return this.users.list(q);
  }

  @RequirePermissions(Perm.USERS_READ)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.users.findOne(id);
  }

  @RequirePermissions(Perm.USERS_UPDATE)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateUserDto, @CurrentUser() actor: AuthUser) {
    return this.users.update(id, dto, actor);
  }

  @RequirePermissions(Perm.USERS_UPDATE)
  @HttpCode(204)
  @Post(':id/reset-password')
  resetPassword(@Param('id', ParseUUIDPipe) id: string, @Body() dto: ResetPasswordDto) {
    return this.users.resetPassword(id, dto.password);
  }
}
