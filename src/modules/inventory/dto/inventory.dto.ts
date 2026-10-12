import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import { ProductSort } from '../../products/dto/product.dto.js';
import { StockFilter } from '../../products/product-view.js';

export class InventoryQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Nombre o código' })
  @IsOptional() @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value)) @IsString() @MaxLength(100) search?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional({ enum: StockFilter }) @IsOptional() @IsEnum(StockFilter) stockStatus?: StockFilter;
  @ApiPropertyOptional({ enum: ProductSort }) @IsOptional() @IsEnum(ProductSort) sortBy: ProductSort = ProductSort.NAME;
  @ApiPropertyOptional({ enum: ['asc', 'desc'] }) @IsOptional() @IsEnum(['asc', 'desc']) order: 'asc' | 'desc' = 'asc';
}
