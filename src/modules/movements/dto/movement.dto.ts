import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsISO8601, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import { MovementReason, MovementType } from '../entities/inventory-movement.entity.js';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateMovementDto {
  @ApiProperty() @IsUUID() productId: string;
  @ApiProperty({ enum: MovementType, description: 'IN = entrada, OUT = salida' }) @IsEnum(MovementType) type: MovementType;
  @ApiProperty({ minimum: 1 }) @Type(() => Number) @IsInt() @Min(1) @Max(2_000_000_000) quantity: number;
  @ApiProperty({
    enum: MovementReason,
    description: 'Entrada: Compra, Devolución, Ajuste de inventario. Salida: Consumo interno, Entrega o venta, Merma o daño, Ajuste de inventario',
  })
  @IsEnum(MovementReason) reason: MovementReason;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(255) observation?: string;
}

export class ListMovementsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsUUID() productId?: string;
  @ApiPropertyOptional({ description: 'Nombre o código del producto' }) @IsOptional() @Transform(trim) @IsString() @MaxLength(100) search?: string;
  @ApiPropertyOptional({ enum: MovementType }) @IsOptional() @IsEnum(MovementType) type?: MovementType;
  @ApiPropertyOptional({ example: '2026-09-01', description: 'Fecha inicial (inclusive, hora Colombia)' })
  @IsOptional() @IsISO8601({ strict: true }) from?: string;
  @ApiPropertyOptional({ example: '2026-09-30', description: 'Fecha final (inclusive, hora Colombia)' })
  @IsOptional() @IsISO8601({ strict: true }) to?: string;
  @ApiPropertyOptional({ enum: ['asc', 'desc'], description: 'Por defecto: asc si se filtra por producto (cronológico), desc en caso contrario' })
  @IsOptional() @IsEnum(['asc', 'desc']) order?: 'asc' | 'desc';
}
