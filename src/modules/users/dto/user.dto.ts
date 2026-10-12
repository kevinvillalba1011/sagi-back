import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean, IsEmail, IsOptional, IsString, IsUUID, Matches, MaxLength, MinLength,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination.dto.js';
import { PASSWORD_MESSAGE, PASSWORD_RULE } from '../../auth/dto/auth.dto.js';

const lower = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value);
const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateUserDto {
  @ApiProperty({ example: 'dbarreto' }) @Transform(lower)
  @IsString() @MinLength(3) @MaxLength(50) @Matches(/^[a-z0-9._-]+$/, { message: 'Usuario: solo letras minúsculas, números, punto, guion y guion bajo' })
  username: string;

  @ApiProperty() @Transform(lower) @IsEmail() @MaxLength(160) email: string;
  @ApiProperty() @Transform(trim) @IsString() @MinLength(2) @MaxLength(120) fullName: string;

  @ApiProperty({ description: 'Contraseña temporal; el usuario deberá cambiarla al ingresar' })
  @IsString() @MinLength(8) @MaxLength(128) @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE })
  password: string;

  @ApiProperty() @IsUUID() roleId: string;
}

export class UpdateUserDto {
  @ApiPropertyOptional() @IsOptional() @Transform(lower) @IsEmail() @MaxLength(160) email?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MinLength(2) @MaxLength(120) fullName?: string;
  @ApiPropertyOptional({ description: 'Asignar / cambiar rol (RF07)' }) @IsOptional() @IsUUID() roleId?: string;
  @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString() @MinLength(8) @MaxLength(128) @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE })
  password: string;
}

export class ListUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional() @IsOptional() @Transform(trim) @IsString() @MaxLength(100) search?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() roleId?: string;
  @ApiPropertyOptional() @IsOptional() @Transform(({ value }) => (value === 'true' ? true : value === 'false' ? false : value)) @IsBoolean() isActive?: boolean;
}
