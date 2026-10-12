import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryMovement } from '../movements/entities/inventory-movement.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { InventoryController } from './inventory.controller.js';
import { InventoryService } from './inventory.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Product, InventoryMovement])],
  controllers: [InventoryController],
  providers: [InventoryService],
})
export class InventoryModule {}
