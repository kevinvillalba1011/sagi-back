import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1 }) @IsOptional() @Type(() => Number) @IsInt() @Min(1) page: number = 1;
  @ApiPropertyOptional({ default: 20, maximum: 100 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit: number = 20;
}

export interface Paginated<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export const paginated = <T>(data: T[], total: number, p: PaginationQueryDto): Paginated<T> => ({
  data,
  meta: { page: p.page, limit: p.limit, total, totalPages: Math.max(1, Math.ceil(total / p.limit)) },
});
