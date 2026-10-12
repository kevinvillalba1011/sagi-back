import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export const PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).+$/;
export const PASSWORD_MESSAGE = 'La contraseña debe tener entre 8 y 128 caracteres, con letras y números';

export class LoginDto {
  @ApiProperty({ example: 'superadmin' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsString() @IsNotEmpty() @MaxLength(50)
  username: string;

  @ApiProperty() @IsString() @IsNotEmpty() @MaxLength(128) password: string;
}

export class ChangePasswordDto {
  @ApiProperty() @IsString() @IsNotEmpty() currentPassword: string;

  @ApiProperty()
  @IsString() @MinLength(8) @MaxLength(128) @Matches(PASSWORD_RULE, { message: PASSWORD_MESSAGE })
  newPassword: string;
}
