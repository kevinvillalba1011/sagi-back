import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateCategoryDto {
  @ApiProperty({ example: 'Tecnología' }) @Transform(trim) @IsString() @IsNotEmpty() @MaxLength(80) name: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(255) description?: string;
}

export class UpdateCategoryDto extends PartialType(CreateCategoryDto) {
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}
