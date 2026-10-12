import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean, IsEnum, IsInt, IsNotEmpty, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import { StockFilter } from '../product-view.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const upper = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value);
const toBool = ({ value }: { value: unknown }) => (value === 'true' ? true : value === 'false' ? false : value);
const MAX_INT = 2_000_000_000;

export class CreateProductDto {
  @ApiProperty({ example: 'PRD-0142', description: 'Único e inmutable' })
  @Transform(upper) @IsString() @IsNotEmpty() @MaxLength(50) @Matches(/^[A-Z0-9._-]+$/, { message: 'Código: solo letras, números, punto, guion y guion bajo' })
  code: string;

  @ApiProperty() @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(160) name: string;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(500) description?: string;
  @ApiProperty() @IsUUID() categoryId: string;

  @ApiProperty({ minimum: 0, description: 'Cantidad inicial (>= 0)' })
  @Type(() => Number) @IsInt() @Min(0) @Max(MAX_INT) initialStock: number;

  @ApiProperty({ minimum: 0 }) @Type(() => Number) @IsInt() @Min(0) @Max(MAX_INT) minStock: number;
}

/** RF01.2: solo nombre, categoría y stock mínimo (más descripción). Código y existencia no se modifican. */
export class UpdateProductDto {
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(160) name?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(500) description?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(MAX_INT) minStock?: number;
}

export enum ProductSort {
  NAME = 'name',
  CODE = 'code',
  STOCK = 'stock',
  MIN_STOCK = 'minStock',
  CATEGORY = 'category',
  CREATED_AT = 'createdAt',
}

export class ListProductsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Busca por nombre o código' })
  @IsOptional() @Transform(trim) @IsString() @MaxLength(100) search?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() categoryId?: string;
  @ApiPropertyOptional({ description: 'Por defecto solo activos' })
  @IsOptional() @Transform(toBool) @IsBoolean() isActive?: boolean;
  @ApiPropertyOptional({ enum: StockFilter }) @IsOptional() @IsEnum(StockFilter) stockStatus?: StockFilter;
  @ApiPropertyOptional({ enum: ProductSort }) @IsOptional() @IsEnum(ProductSort) sortBy: ProductSort = ProductSort.NAME;
  @ApiPropertyOptional({ enum: ['asc', 'desc'] }) @IsOptional() @IsEnum(['asc', 'desc']) order: 'asc' | 'desc' = 'asc';
}
