import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'Auxiliar de bodega' }) @IsString() @IsNotEmpty() @MaxLength(60) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) description?: string;
  @ApiProperty({ example: ['products:read', 'inventory:read'] })
  @IsArray() @ArrayUnique() @IsString({ each: true }) permissions: string[];
}

export class UpdateRoleDto extends PartialType(CreateRoleDto) {}
