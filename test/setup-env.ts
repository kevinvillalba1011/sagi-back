// Las pruebas e2e usan SIEMPRE una base de datos aparte (nombre terminado en _test).
const name = process.env.DB_NAME_TEST ?? 'sagi_test';
if (!name.endsWith('_test')) {
  throw new Error(`DB_NAME_TEST debe terminar en "_test" (recibido: ${name}). Se aborta para no tocar datos reales.`);
}
process.env.DB_NAME = name;
process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET ??= 'test_secret_test_secret_test_secret_123456';
