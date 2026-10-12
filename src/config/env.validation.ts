import { plainToInstance, Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

enum NodeEnv {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

const toBool = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.toLowerCase() === 'true' : value;

export class EnvironmentVariables {
  @IsEnum(NodeEnv) NODE_ENV: NodeEnv = NodeEnv.Development;
  @Transform(({ value }) => parseInt(value, 10)) @IsInt() @Min(1) @Max(65535) PORT: number = 3000;

  @IsString() DB_HOST: string;
  @Transform(({ value }) => parseInt(value, 10)) @IsInt() DB_PORT: number = 5432;
  @IsString() DB_USER: string;
  @IsString() DB_PASSWORD: string;
  @IsString() DB_NAME: string;
  @Transform(toBool) @IsBoolean() @IsOptional() DB_SSL: boolean = false;
  /** Con DB_SSL=true se verifica el certificado del servidor, salvo que se ponga false explícitamente. */
  @Transform(toBool) @IsBoolean() @IsOptional() DB_SSL_REJECT_UNAUTHORIZED: boolean = true;

  @IsString() @MinLength(32) JWT_ACCESS_SECRET: string;
  @Transform(({ value }) => parseInt(value, 10)) @IsInt() @Min(30) JWT_ACCESS_TTL_SECONDS: number = 300;
  @Transform(({ value }) => parseInt(value, 10)) @IsInt() @Min(60) REFRESH_TTL_SECONDS: number = 900;
  @Transform(toBool) @IsBoolean() @IsOptional() COOKIE_SECURE: boolean = false;
  @IsEnum(['strict', 'lax', 'none']) @IsOptional() COOKIE_SAME_SITE: 'strict' | 'lax' | 'none' = 'strict';

  @IsString() @IsOptional() CORS_ORIGINS: string = '';
  @Transform(toBool) @IsBoolean() @IsOptional() SWAGGER_ENABLED: boolean = false;
  @Transform(toBool) @IsBoolean() @IsOptional() TRUST_PROXY: boolean = false;
}

export function validateEnv(config: Record<string, unknown>): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: false,
  });
  const errors = validateSync(validated, { skipMissingProperties: false });
  if (errors.length > 0) {
    const msg = errors.map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`);
    throw new Error(`Variables de entorno inválidas:\n - ${msg.join('\n - ')}`);
  }
  if (validated.NODE_ENV === 'production') {
    const problems: string[] = [];
    if (!validated.COOKIE_SECURE) problems.push('COOKIE_SECURE debe ser true en producción');
    if (validated.SWAGGER_ENABLED) problems.push('SWAGGER_ENABLED debe ser false en producción');
    if (/cambia_esto|dev_secret|test_secret/i.test(validated.JWT_ACCESS_SECRET)) {
      problems.push('JWT_ACCESS_SECRET parece un valor de ejemplo');
    }
    if (problems.length) throw new Error(`Configuración insegura para producción:\n - ${problems.join('\n - ')}`);
  }
  return validated;
}
