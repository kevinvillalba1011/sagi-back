# SAGI API — Sistema Automatizado de Gestión de Inventario

Backend (NestJS 12 + TypeORM + PostgreSQL 16) basado en el documento de requerimientos v1.0 (RF01–RF07).
No incluye front end.

## Puesta en marcha (Windows / PowerShell)

```powershell
pnpm install
Copy-Item .env.example .env        # edita JWT_ACCESS_SECRET y SEED_SUPERADMIN_PASSWORD
docker compose up -d               # PostgreSQL local (puerto 5432, solo localhost)
pnpm migration:run                 # crea las tablas
pnpm seed                          # permisos, roles base y primer super administrador
pnpm start:dev                     # http://localhost:3000/api/v1  ·  Swagger: /api/docs
```

El super administrador se crea con las variables `SEED_SUPERADMIN_*` y **debe cambiar su contraseña en el primer ingreso**.
El seed es idempotente y no sobrescribe roles ya editados.

Cambios de esquema: modifica las entidades y ejecuta `pnpm migration:generate src/database/migrations/NombreCambio`,
revisa el archivo y aplícalo con `pnpm migration:run`. La API nunca sincroniza ni migra la base por sí sola.

## Funcionalidades listas para el front (`/api/v1`)

| Área | Endpoints | Permiso |
|---|---|---|
| Sesión (RF06) | `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me`, `POST /auth/change-password` | públicos / autenticado |
| Usuarios (RF07) | `POST /users`, `GET /users`, `GET /users/:id`, `PATCH /users/:id` (datos, **rol**, activar/desactivar), `POST /users/:id/reset-password` | `users:*` (solo super admin) |
| Roles | `GET /permissions`, `GET/POST /roles`, `GET/PATCH/DELETE /roles/:id` | `roles:read` / `roles:manage` |
| Categorías | `GET/POST /categories`, `GET/PATCH /categories/:id` | `categories:*` |
| Productos (RF01) | `POST /products`, `GET /products` (filtros `search`, `categoryId`, `isActive`, `stockStatus`; orden `sortBy`/`order`), `GET /products/stats`, `GET/PATCH /products/:id`, `POST /products/:id/deactivate`, `POST /products/:id/activate` | `products:*` |
| Movimientos (RF02, RF05) | `GET /movements/reasons`, `POST /movements`, `GET /movements` (filtros `productId`, `type`, `from`, `to`, `search`, `order`), `GET /movements/:id` | `movements:create` / `movements:read` |
| Inventario (RF03, RF04) | `GET /inventory` (búsqueda, categoría, estado, orden), `GET /inventory/summary` (panel: totales, categorías, movimientos de hoy, últimos 7 días), `GET /inventory/alerts` (paginado, filtro `stockStatus`) | `inventory:read` / `alerts:read` |
| Salud | `GET /api/health` | público |

Listados paginados: `?page=1&limit=20` → `{ data, meta: { page, limit, total, totalPages } }`.
Documentación interactiva con todos los DTOs en `/api/docs` (solo si `SWAGGER_ENABLED=true`).

### Cómo consume el front la sesión
1. `POST /auth/login` → `{ accessToken, expiresIn, user }`; el refresh token llega en cookie `httpOnly` (`sagi_rt`).
2. Enviar `Authorization: Bearer <accessToken>` y usar `fetch(..., { credentials: 'include' })`.
3. Al recibir 401, llamar `POST /auth/refresh` (rota el refresh y devuelve un nuevo access token). Si falla, ir al login.
4. Access token: 5 min. Refresh: ventana deslizante de 15 min → **cierre automático tras 15 min de inactividad** (RF06).
5. Si `user.mustChangePassword` es `true`, toda ruta responde 403 `PASSWORD_CHANGE_REQUIRED` salvo `/auth/me`, `/auth/change-password`.
6. `GET /auth/me` devuelve `permissions[]` para mostrar/ocultar opciones del menú. Configura `CORS_ORIGINS` con el origen del front.

## Roles y permisos
Roles dinámicos en base de datos. El seed crea `SUPER_ADMIN` (acceso total, inmodificable) y los 5 del documento:
Administrador, Otro administrador, Encargado de inventario, Personal de compras y Gerencia o propietario.
**Solo el super admin crea usuarios y asigna roles** (en el documento esa función era del Administrador; se movió por tu indicación).
El super admin puede crear roles nuevos y editar los permisos de los existentes desde la API.
Los permisos se consultan en cada petición: un cambio de rol o una desactivación aplican de inmediato.

## Decisiones y supuestos (documento vs. mockup)
- **Guiado por el documento.** No se implementaron los módulos del mockup que no están en el documento (reposición sugerida, análisis ABC, línea de tiempo, auditoría de cambios, corrección de movimientos, estado «pendiente»).
- Lo único tomado del mockup: el **catálogo de motivos** de movimiento (Entrada: Compra, Devolución, Ajuste de inventario · Salida: Consumo interno, Entrega o venta, Merma o daño, Ajuste de inventario) y un campo opcional `observation`.
- La matriz de permisos de la sección 7.8 del .docx quedó ambigua en la conversión; se interpretó con las secciones 5 y 11 (ver `src/modules/roles/permissions.constants.ts`). Ajustar allí y volver a ejecutar `pnpm seed` solo afecta roles nuevos; los existentes se editan por `PATCH /roles/:id`.
- «Eliminar producto» = **desactivar** (RF01.3): conserva historial, bloquea movimientos y lo excluye del inventario y alertas. Se puede reactivar.
- Código de producto único e inmutable; la existencia solo cambia por movimientos. Si el producto se crea con existencia inicial > 0, se registra un movimiento «Inventario inicial» para mantener trazabilidad.
- Movimientos inmutables (sin PATCH/DELETE); los errores se corrigen con un movimiento compensatorio. `balanceAfter` guarda el saldo tras cada movimiento.
- Salidas con bloqueo de fila (`FOR UPDATE`) en transacción: nunca hay saldo negativo ni con peticiones simultáneas; además hay `CHECK` en base de datos.
- Fechas de filtros en hora Colombia (UTC-5). El historial va en orden cronológico cuando se filtra por producto.

## Seguridad (resumen de la auditoría)
- Contraseñas con **argon2id**; mínimo 8 caracteres con letras y números. Nunca se devuelven ni se loguean.
- Login sin enumeración de usuarios (mismo mensaje y tiempo comparable), límite 5 intentos/min por IP. Límite general 100 peticiones/min.
- JWT HS256 con algoritmo fijado; refresh token opaco guardado como hash SHA-256, **rotativo con detección de reutilización** (revoca todas las sesiones), cookie `httpOnly` + `SameSite=Strict` + `Secure` en producción, ruta restringida a `/api/v1/auth`.
- Validación estricta de entrada: `whitelist` + `forbidNonWhitelisted` (anti mass-assignment), UUID validados, límites de tamaño y de paginación (máx. 100).
- SQL siempre parametrizado; orden por lista blanca; comodines de búsqueda (`%`, `_`) escapados.
- `helmet`, CORS por lista blanca, `x-powered-by` oculto. Swagger apagado por defecto.
- En producción la app **se niega a arrancar** si `COOKIE_SECURE` no es `true`, Swagger está activo o el secreto JWT es de ejemplo.
- Base de datos: sin `synchronize`, migraciones versionadas, FK `RESTRICT`, puerto de Docker ligado a `127.0.0.1`, SSL verificado con `DB_SSL=true`.
- `pnpm audit`: sin vulnerabilidades conocidas al momento de la entrega. Repite `pnpm audit` periódicamente.

Pendientes recomendados antes de producción: servir solo por HTTPS (`TRUST_PROXY=true` tras el proxy), rotar `JWT_ACCESS_SECRET`
con un valor aleatorio largo (`node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`),
bloqueo temporal por cuenta tras varios intentos fallidos, y una política de protección de datos personales (Ley 1581 de 2012) para el documento legal.

## Pruebas
- `pnpm test` — unitarias.
- `pnpm test:e2e` — 25 pruebas de flujos completos contra PostgreSQL real. **Usa una base aparte** cuyo nombre termine en `_test`
  (`sagi_test` la crea `docker compose` la primera vez) y debe estar **recién migrada y sembrada**:

```powershell
$env:DB_NAME="sagi_test"; $env:SEED_SUPERADMIN_PASSWORD="Clave12345"
pnpm migration:run; pnpm seed
Remove-Item Env:DB_NAME; $env:DB_NAME_TEST="sagi_test"
pnpm test:e2e
```
  Las pruebas cambian el estado de esa base; para repetirlas, recréala (no se automatiza para no borrar datos sin tu aprobación).
