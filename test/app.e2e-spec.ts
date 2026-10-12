import './setup-env.js';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';

const SUFFIX = Date.now().toString(36);
const PASS = 'Clave12345';
const NEW_PASS = 'NuevaClave789';

async function createApp(withThrottle = false) {
  process.env.THROTTLE_DISABLED = withThrottle ? 'false' : 'true';
  const app = (await Test.createTestingModule({ imports: [AppModule] }).compile()).createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

describe('SAGI API (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  let adminToken: string;
  const ids: Record<string, string> = {};
  const roleId: Record<string, string> = {};

  const api = (path: string) => `/api/v1${path}`;
  const as = (token: string) => ({ Authorization: `Bearer ${token}` });

  async function login(username: string, password: string) {
    return request(app.getHttpServer()).post(api('/auth/login')).send({ username, password });
  }
  async function tokenFor(username: string, password: string, newPassword?: string) {
    let res = await login(username, password);
    expect(res.status).toBe(200);
    if (newPassword) {
      res = await request(app.getHttpServer())
        .post(api('/auth/change-password'))
        .set(as(res.body.accessToken))
        .send({ currentPassword: password, newPassword });
      expect(res.status).toBe(200);
    }
    return res.body.accessToken as string;
  }
  async function makeUser(username: string, role: string) {
    const res = await request(app.getHttpServer())
      .post(api('/users'))
      .set(as(adminToken))
      .send({ username, email: `${username}@sagi.test`, fullName: `Usuario ${username}`, password: PASS, roleId: roleId[role] });
    expect(res.status).toBe(201);
    expect(res.body.passwordHash).toBeUndefined();
    return res.body.id as string;
  }

  beforeAll(async () => {
    app = await createApp();
    http = request(app.getHttpServer());
  });
  afterAll(async () => {
    await app.close();
  });

  describe('autenticación', () => {
    it('health responde ok sin autenticación', async () => {
      await http.get('/api/health').expect(200, { status: 'ok' });
    });

    it('rutas protegidas exigen token', async () => {
      await http.get(api('/products')).expect(401);
      await http.get(api('/users')).set(as('token.invalido.x')).expect(401);
    });

    it('credenciales erróneas: mismo mensaje para usuario inexistente y contraseña errónea', async () => {
      const a = await login('superadmin', 'incorrecta1');
      const b = await login('noexiste', 'incorrecta1');
      expect(a.status).toBe(401);
      expect(b.status).toBe(401);
      expect(a.body.message).toBe(b.body.message);
    });

    it('el super admin debe cambiar la contraseña antes de operar', async () => {
      const res = await login('superadmin', PASS);
      expect(res.status).toBe(200);
      expect(res.body.user.mustChangePassword).toBe(true);
      expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly/i);
      const blocked = await http.get(api('/users')).set(as(res.body.accessToken));
      expect(blocked.status).toBe(403);
      expect(blocked.body.code).toBe('PASSWORD_CHANGE_REQUIRED');
      await http.get(api('/auth/me')).set(as(res.body.accessToken)).expect(200);

      await http.post(api('/auth/change-password')).set(as(res.body.accessToken))
        .send({ currentPassword: 'mala', newPassword: NEW_PASS }).expect(400);
      await http.post(api('/auth/change-password')).set(as(res.body.accessToken))
        .send({ currentPassword: PASS, newPassword: 'corta' }).expect(400);
      const ok = await http.post(api('/auth/change-password')).set(as(res.body.accessToken))
        .send({ currentPassword: PASS, newPassword: NEW_PASS });
      expect(ok.status).toBe(200);
      adminToken = ok.body.accessToken;
      await http.get(api('/users')).set(as(adminToken)).expect(200);
    });

    it('refresh rota el token y detecta reutilización', async () => {
      const agent = request.agent(app.getHttpServer());
      const l = await agent.post(api('/auth/login')).send({ username: 'superadmin', password: NEW_PASS });
      const firstCookie = l.headers['set-cookie'][0].split(';')[0];
      const r = await agent.post(api('/auth/refresh'));
      expect(r.status).toBe(200);
      expect(r.body.accessToken).toBeTruthy();
      // reutilizar el token viejo ya rotado => 401 y se revoca la familia
      const reuse = await request(app.getHttpServer()).post(api('/auth/refresh')).set('Cookie', firstCookie);
      expect(reuse.status).toBe(401);
      await agent.post(api('/auth/refresh')).expect(401);
      await request(app.getHttpServer()).post(api('/auth/refresh')).expect(401);
    });

    it('logout revoca el refresh token', async () => {
      const agent = request.agent(app.getHttpServer());
      await agent.post(api('/auth/login')).send({ username: 'superadmin', password: NEW_PASS });
      await agent.post(api('/auth/logout')).expect(204);
      await agent.post(api('/auth/refresh')).expect(401);
    });
  });

  describe('roles y usuarios (solo super admin)', () => {
    it('lista roles base y permisos', async () => {
      const roles = await http.get(api('/roles')).set(as(adminToken)).expect(200);
      for (const r of roles.body) roleId[r.name] = r.id;
      expect(Object.keys(roleId)).toEqual(expect.arrayContaining(['SUPER_ADMIN', 'Administrador', 'Encargado de inventario', 'Personal de compras', 'Gerencia o propietario', 'Otro administrador']));
      const perms = await http.get(api('/permissions')).set(as(adminToken)).expect(200);
      expect(perms.body.length).toBeGreaterThan(10);
    });

    it('crea usuarios con distintos roles y valida duplicados', async () => {
      ids.enc = await makeUser(`enc_${SUFFIX}`, 'Encargado de inventario');
      ids.adm = await makeUser(`adm_${SUFFIX}`, 'Administrador');
      ids.com = await makeUser(`com_${SUFFIX}`, 'Personal de compras');
      ids.ger = await makeUser(`ger_${SUFFIX}`, 'Gerencia o propietario');
      await http.post(api('/users')).set(as(adminToken))
        .send({ username: `enc_${SUFFIX}`, email: 'otro@sagi.test', fullName: 'Dup', password: PASS, roleId: roleId['Administrador'] }).expect(409);
      await http.post(api('/users')).set(as(adminToken))
        .send({ username: 'x1', email: 'no-es-correo', fullName: 'X', password: '123', roleId: 'no-uuid' }).expect(400);
    });

    it('rol personalizado con permisos válidos; rechaza permisos inexistentes', async () => {
      const r = await http.post(api('/roles')).set(as(adminToken))
        .send({ name: `Auxiliar ${SUFFIX}`, permissions: ['products:read', 'inventory:read'] });
      expect(r.status).toBe(201);
      await http.post(api('/roles')).set(as(adminToken)).send({ name: 'Malo', permissions: ['nada:nada'] }).expect(400);
      await http.delete(api(`/roles/${r.body.id}`)).set(as(adminToken)).expect(204);
      await http.delete(api(`/roles/${roleId['SUPER_ADMIN']}`)).set(as(adminToken)).expect(403);
      await http.patch(api(`/roles/${roleId['SUPER_ADMIN']}`)).set(as(adminToken)).send({ permissions: [] }).expect(403);
    });

    it('los demás roles no gestionan usuarios ni roles', async () => {
      const adm = await tokenFor(`adm_${SUFFIX}`, PASS, NEW_PASS);
      await http.get(api('/users')).set(as(adm)).expect(403);
      await http.post(api('/users')).set(as(adm)).send({}).expect(403);
      await http.get(api('/roles')).set(as(adm)).expect(403);
    });

    it('no puede desactivarse a sí mismo ni dejar el sistema sin super admin', async () => {
      const me = await http.get(api('/auth/me')).set(as(adminToken)).expect(200);
      await http.patch(api(`/users/${me.body.id}`)).set(as(adminToken)).send({ isActive: false }).expect(403);
      await http.patch(api(`/users/${me.body.id}`)).set(as(adminToken)).send({ roleId: roleId['Administrador'] }).expect(403);
    });
  });

  describe('productos, movimientos e inventario', () => {
    let enc: string, adm: string, com: string, ger: string;
    beforeAll(async () => {
      enc = await tokenFor(`enc_${SUFFIX}`, PASS, NEW_PASS);
      adm = await tokenFor(`adm_${SUFFIX}`, NEW_PASS);
      com = await tokenFor(`com_${SUFFIX}`, PASS, NEW_PASS);
      ger = await tokenFor(`ger_${SUFFIX}`, PASS, NEW_PASS);
      const cat = await http.post(api('/categories')).set(as(adm)).send({ name: `Tecnología ${SUFFIX}` }).expect(201);
      ids.cat = cat.body.id;
    });
    const code = `PRD-${SUFFIX}`.toUpperCase();

    it('RF01.1 registra producto con validaciones', async () => {
      const body = { code, name: 'Teclado', categoryId: ids.cat, initialStock: 10, minStock: 5 };
      const ok = await http.post(api('/products')).set(as(enc)).send(body);
      expect(ok.status).toBe(201);
      expect(ok.body).toMatchObject({ code, stock: 10, minStock: 5, isActive: true, stockStatus: 'AVAILABLE' });
      ids.prod = ok.body.id;
      await http.post(api('/products')).set(as(enc)).send(body).expect(409);
      await http.post(api('/products')).set(as(enc)).send({ ...body, code: 'X-1', initialStock: -1 }).expect(400);
      await http.post(api('/products')).set(as(enc)).send({ ...body, code: 'X-2', minStock: -3 }).expect(400);
      await http.post(api('/products')).set(as(enc)).send({ code: 'X-3', name: 'Sin categoría' }).expect(400);
      await http.post(api('/products')).set(as(com)).send({ ...body, code: 'X-4' }).expect(403);
      // el stock inicial genera un movimiento de trazabilidad
      const h = await http.get(api(`/movements?productId=${ids.prod}`)).set(as(adm)).expect(200);
      expect(h.body.data).toHaveLength(1);
      expect(h.body.data[0]).toMatchObject({ type: 'IN', quantity: 10, balanceAfter: 10, reason: 'Inventario inicial' });
    });

    it('RF01.2 modifica nombre/categoría/mínimo; código y existencia son inmutables', async () => {
      const ok = await http.patch(api(`/products/${ids.prod}`)).set(as(enc)).send({ name: 'Teclado inalámbrico', minStock: 6 });
      expect(ok.status).toBe(200);
      expect(ok.body).toMatchObject({ name: 'Teclado inalámbrico', minStock: 6, code, stock: 10 });
      await http.patch(api(`/products/${ids.prod}`)).set(as(enc)).send({ code: 'OTRO' }).expect(400);
      await http.patch(api(`/products/${ids.prod}`)).set(as(enc)).send({ stock: 999 }).expect(400);
    });

    it('RF02 entradas y salidas actualizan el saldo y validan existencia', async () => {
      const out = await http.post(api('/movements')).set(as(enc)).send({ productId: ids.prod, type: 'OUT', quantity: 4, reason: 'Consumo interno' });
      expect(out.status).toBe(201);
      expect(out.body).toMatchObject({ balanceAfter: 6, quantity: 4, type: 'OUT' });
      expect(out.body.user.username).toBe(`enc_${SUFFIX}`);
      await http.post(api('/movements')).set(as(enc)).send({ productId: ids.prod, type: 'OUT', quantity: 100, reason: 'Entrega o venta' }).expect(422);
      await http.post(api('/movements')).set(as(enc)).send({ productId: ids.prod, type: 'OUT', quantity: 0, reason: 'Entrega o venta' }).expect(400);
      await http.post(api('/movements')).set(as(enc)).send({ productId: ids.prod, type: 'OUT', quantity: 1, reason: 'Compra' }).expect(400);
      await http.post(api('/movements')).set(as(enc)).send({ productId: ids.prod, type: 'IN', quantity: 1, reason: 'Inventado' }).expect(400);
      await http.post(api('/movements')).set(as(com)).send({ productId: ids.prod, type: 'IN', quantity: 1, reason: 'Compra' }).expect(403);
      const p = await http.get(api(`/products/${ids.prod}`)).set(as(enc)).expect(200);
      expect(p.body.stock).toBe(6); // intentos fallidos no alteran el saldo
    });

    it('salidas concurrentes nunca dejan saldo negativo', async () => {
      const res = await Promise.all(
        Array.from({ length: 5 }, () =>
          request(app.getHttpServer()).post(api('/movements')).set(as(enc))
            .send({ productId: ids.prod, type: 'OUT', quantity: 2, reason: 'Entrega o venta' }),
        ),
      );
      const okCount = res.filter((r) => r.status === 201).length;
      expect(okCount).toBe(3);
      expect(res.filter((r) => r.status === 422)).toHaveLength(2);
      const p = await http.get(api(`/products/${ids.prod}`)).set(as(enc)).expect(200);
      expect(p.body.stock).toBe(0);
      expect(p.body.stockStatus).toBe('OUT_OF_STOCK');
      await http.post(api('/movements')).set(as(enc)).send({ productId: ids.prod, type: 'IN', quantity: 7, reason: 'Compra' }).expect(201);
    });

    it('RF03 consulta de inventario (búsqueda, filtro) con permisos por rol', async () => {
      const r = await http.get(api(`/inventory?search=${code.slice(0, 6).toLowerCase()}&categoryId=${ids.cat}`)).set(as(com)).expect(200);
      expect(r.body.data.map((p: any) => p.code)).toContain(code);
      expect(r.body.meta.total).toBeGreaterThanOrEqual(1);
      await http.get(api('/inventory?search=%25_%5C')).set(as(com)).expect(200); // comodines escapados
      await http.get(api('/inventory?limit=1000')).set(as(com)).expect(400);
      await http.get(api('/inventory')).set(as(ger)).expect(200);
      const s = await http.get(api('/inventory/summary')).set(as(adm)).expect(200);
      expect(s.body.last7Days).toHaveLength(7);
    });

    it('RF04 alertas: aparecen con stock <= mínimo y desaparecen al reponer', async () => {
      // stock actual 7, mínimo 6 → sin alerta
      let a = await http.get(api('/inventory/alerts')).set(as(com)).expect(200);
      expect(a.body.data.map((p: any) => p.id)).not.toContain(ids.prod);
      await http.patch(api(`/products/${ids.prod}`)).set(as(enc)).send({ minStock: 7 }).expect(200);
      a = await http.get(api('/inventory/alerts')).set(as(com)).expect(200);
      expect(a.body.data.map((p: any) => p.id)).toContain(ids.prod);
      await http.post(api('/movements')).set(as(enc)).send({ productId: ids.prod, type: 'IN', quantity: 3, reason: 'Devolución' }).expect(201);
      a = await http.get(api('/inventory/alerts')).set(as(com)).expect(200);
      expect(a.body.data.map((p: any) => p.id)).not.toContain(ids.prod);
      await http.get(api('/inventory/alerts')).set(as(enc)).expect(403);
    });

    it('listados del front: orden, filtro por estado, contadores y resumen', async () => {
      const sorted = await http.get(api('/inventory?sortBy=stock&order=desc&limit=100')).set(as(com)).expect(200);
      const stocks = sorted.body.data.map((p: any) => p.stock);
      expect([...stocks].sort((a, b) => b - a)).toEqual(stocks);
      await http.get(api('/inventory?sortBy=category&order=asc')).set(as(com)).expect(200);
      await http.get(api('/inventory?sortBy=precio')).set(as(com)).expect(400); // lista blanca de orden
      const low = await http.get(api('/inventory/alerts?stockStatus=LOW_STOCK')).set(as(com)).expect(200);
      for (const p of low.body.data) expect(p.stock > 0 && p.stock <= p.minStock).toBe(true);
      const out = await http.get(api('/inventory/alerts?stockStatus=OUT_OF_STOCK')).set(as(com)).expect(200);
      for (const p of out.body.data) expect(p.stock).toBe(0);
      const st = await http.get(api('/products/stats')).set(as(enc)).expect(200);
      expect(st.body.active).toBeGreaterThanOrEqual(1);
      await http.get(api('/products/stats')).set(as(ger)).expect(200);
      const sum = await http.get(api('/inventory/summary')).set(as(adm)).expect(200);
      expect(sum.body).toMatchObject({ activeProducts: expect.any(Number), availableCount: expect.any(Number), categoriesCount: expect.any(Number) });
      expect(sum.body.unitsByCategory.length).toBeGreaterThanOrEqual(1);
      expect(sum.body.todayMovements.total).toBeGreaterThanOrEqual(5);
      const byName = await http.get(api(`/movements?search=${code.slice(0, 6).toLowerCase()}`)).set(as(ger)).expect(200);
      expect(byName.body.data.length).toBeGreaterThanOrEqual(5);
      await http.get(api('/movements?search=%25_%5C')).set(as(ger)).expect(200);
    });

    it('RF05 historial cronológico por producto y periodo', async () => {
      const today = new Date(Date.now() - 5 * 3600_000).toISOString().slice(0, 10);
      const h = await http.get(api(`/movements?productId=${ids.prod}&from=${today}&to=${today}`)).set(as(ger)).expect(200);
      expect(h.body.data.length).toBeGreaterThanOrEqual(5);
      const times = h.body.data.map((m: any) => new Date(m.createdAt).getTime());
      expect([...times].sort((a, b) => a - b)).toEqual(times);
      // reconstrucción del saldo
      let balance = 0;
      for (const m of h.body.data) {
        balance += m.type === 'IN' ? m.quantity : -m.quantity;
        expect(m.balanceAfter).toBe(balance);
      }
      const none = await http.get(api(`/movements?productId=${ids.prod}&from=2000-01-01&to=2000-01-02`)).set(as(ger)).expect(200);
      expect(none.body.data).toHaveLength(0);
      await http.get(api('/movements?from=2026-02-01&to=2026-01-01')).set(as(ger)).expect(400);
      await http.get(api('/movements')).set(as(enc)).expect(403);
    });

    it('RF01.3 desactivar conserva historial y bloquea nuevos movimientos', async () => {
      await http.post(api(`/products/${ids.prod}/deactivate`)).set(as(enc)).expect(403); // encargado no puede
      const d = await http.post(api(`/products/${ids.prod}/deactivate`)).set(as(adm)).expect(200);
      expect(d.body.isActive).toBe(false);
      await http.post(api('/movements')).set(as(enc)).send({ productId: ids.prod, type: 'IN', quantity: 1, reason: 'Compra' }).expect(409);
      const inv = await http.get(api(`/inventory?search=${code}`)).set(as(com)).expect(200);
      expect(inv.body.data).toHaveLength(0);
      const hist = await http.get(api(`/movements?productId=${ids.prod}`)).set(as(ger)).expect(200);
      expect(hist.body.data.length).toBeGreaterThanOrEqual(5);
      const inactive = await http.get(api(`/products?isActive=false&search=${code}`)).set(as(adm)).expect(200);
      expect(inactive.body.data).toHaveLength(1);
      await http.post(api(`/products/${ids.prod}/activate`)).set(as(adm)).expect(200);
    });
  });

  describe('gestión de sesiones por el super admin', () => {
    it('desactivar o resetear a un usuario invalida sus sesiones', async () => {
      const username = `tmp_${SUFFIX}`;
      const id = await makeUser(username, 'Gerencia o propietario');
      const agent = request.agent(app.getHttpServer());
      const l = await agent.post(api('/auth/login')).send({ username, password: PASS });
      const tok = l.body.accessToken;
      await http.patch(api(`/users/${id}`)).set(as(adminToken)).send({ isActive: false }).expect(200);
      await http.get(api('/auth/me')).set(as(tok)).expect(401);
      await agent.post(api('/auth/refresh')).expect(401);
      await login(username, PASS).then((r) => expect(r.status).toBe(401));

      await http.patch(api(`/users/${id}`)).set(as(adminToken)).send({ isActive: true }).expect(200);
      await http.post(api(`/users/${id}/reset-password`)).set(as(adminToken)).send({ password: 'Otra12345' }).expect(204);
      await login(username, PASS).then((r) => expect(r.status).toBe(401));
      const again = await login(username, 'Otra12345');
      expect(again.status).toBe(200);
      expect(again.body.user.mustChangePassword).toBe(true);
    });

    it('cambiar el rol aplica de inmediato', async () => {
      const username = `rol_${SUFFIX}`;
      const id = await makeUser(username, 'Gerencia o propietario');
      const tok = await tokenFor(username, PASS, NEW_PASS);
      await http.get(api('/inventory/alerts')).set(as(tok)).expect(403);
      await http.patch(api(`/users/${id}`)).set(as(adminToken)).send({ roleId: roleId['Personal de compras'] }).expect(200);
      await http.get(api('/inventory/alerts')).set(as(tok)).expect(200);
    });
  });

  describe('seguridad', () => {
    it('cabeceras de seguridad y sin fuga de información sensible', async () => {
      const res = await http.get('/api/health');
      expect(res.headers['x-powered-by']).toBeUndefined();
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      const users = await http.get(api('/users')).set(as(adminToken)).expect(200);
      expect(JSON.stringify(users.body)).not.toMatch(/passwordHash|password_hash|argon2/);
    });

    it('rechaza propiedades no declaradas (mass assignment)', async () => {
      await http.post(api('/users')).set(as(adminToken))
        .send({ username: `ma_${SUFFIX}`, email: `ma_${SUFFIX}@sagi.test`, fullName: 'MA', password: PASS, roleId: roleId['Administrador'], isActive: true, id: 'x' })
        .expect(400);
    });

    it('IDs mal formados devuelven 400 y no 500', async () => {
      await http.get(api('/products/no-es-uuid')).set(as(adminToken)).expect(400);
      await http.get(api('/products/00000000-0000-0000-0000-000000000000')).set(as(adminToken)).expect(404);
    });

    it('login limitado por tasa (5/min)', async () => {
      const limited = await createApp(true);
      let last = 0;
      for (let i = 0; i < 7; i++) {
        last = (await request(limited.getHttpServer()).post(api('/auth/login')).send({ username: 'x', password: 'y' })).status;
      }
      expect(last).toBe(429);
      await limited.close();
      process.env.THROTTLE_DISABLED = 'true';
    });
  });
});
