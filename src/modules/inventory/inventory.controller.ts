import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/index.js';
import { Perm } from '../roles/permissions.constants.js';
import { InventoryQueryDto } from './dto/inventory.dto.js';
import { InventoryService } from './inventory.service.js';

@ApiTags('inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @RequirePermissions(Perm.INVENTORY_READ)
  @Get()
  list(@Query() q: InventoryQueryDto) {
    return this.inventory.list(q);
  }

  @RequirePermissions(Perm.INVENTORY_READ)
  @Get('summary')
  summary() {
    return this.inventory.summary();
  }

  @RequirePermissions(Perm.ALERTS_READ)
  @Get('alerts')
  alerts(@Query() q: InventoryQueryDto) {
    return this.inventory.alerts(q);
  }
}
