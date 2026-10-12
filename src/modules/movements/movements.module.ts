import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InventoryMovement } from './entities/inventory-movement.entity.js';
import { MovementsController } from './movements.controller.js';
import { MovementsService } from './movements.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([InventoryMovement])],
  controllers: [MovementsController],
  providers: [MovementsService],
  exports: [MovementsService],
})
export class MovementsModule {}
