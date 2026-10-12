import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser, RequirePermissions } from '../../common/decorators/index.js';
import { Perm } from '../roles/permissions.constants.js';
import { CreateMovementDto, ListMovementsQueryDto } from './dto/movement.dto.js';
import { MovementsService } from './movements.service.js';

@ApiTags('movements')
@ApiBearerAuth()
@Controller('movements')
export class MovementsController {
  constructor(private readonly movements: MovementsService) {}

  /** Catálogo de motivos por tipo (cualquier usuario autenticado). */
  @Get('reasons')
  reasons() {
    return this.movements.reasons();
  }

  @RequirePermissions(Perm.MOVEMENTS_CREATE)
  @Post()
  create(@Body() dto: CreateMovementDto, @CurrentUser() user: AuthUser) {
    return this.movements.create(dto, user);
  }

  @RequirePermissions(Perm.MOVEMENTS_READ)
  @Get()
  list(@Query() q: ListMovementsQueryDto) {
    return this.movements.list(q);
  }

  @RequirePermissions(Perm.MOVEMENTS_READ)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.movements.findOne(id);
  }
}
