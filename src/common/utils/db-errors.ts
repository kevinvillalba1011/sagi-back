import { ConflictException } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

/** Convierte violaciones de unicidad de Postgres (23505) en 409 con el mensaje dado. */
export function rethrowUnique(e: unknown, message: string): never {
  if (e instanceof QueryFailedError && (e as any).driverError?.code === '23505') {
    throw new ConflictException(message);
  }
  throw e;
}

export const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
