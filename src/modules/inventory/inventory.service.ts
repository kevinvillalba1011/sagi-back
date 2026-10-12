import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginated } from '../../common/dto/pagination.dto.js';
import { escapeLike } from '../../common/utils/db-errors.js';
import { InventoryMovement } from '../movements/entities/inventory-movement.entity.js';
import { applyStockFilter, PRODUCT_SORT_COLUMNS, toProductView } from '../products/product-view.js';
import { Product } from '../products/entities/product.entity.js';
import { ProductSort } from '../products/dto/product.dto.js';
import { InventoryQueryDto } from './dto/inventory.dto.js';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Product) private readonly products: Repository<Product>,
    @InjectRepository(InventoryMovement) private readonly movements: Repository<InventoryMovement>,
  ) {}

  /** RF03: existencias de productos ACTIVOS, con búsqueda por nombre/código, filtro por categoría y orden. */
  async list(q: InventoryQueryDto) {
    return this.page(this.filtered(q), q);
  }

  /** RF04: productos activos con existencia <= stock mínimo. Desaparecen solos al reponerse. */
  async alerts(q: InventoryQueryDto) {
    const qb = this.filtered(q).andWhere('p.stock <= p.min_stock');
    if (!q.stockStatus) q.sortBy = q.sortBy ?? ProductSort.STOCK;
    return this.page(qb, q);
  }

  private filtered(q: InventoryQueryDto) {
    const qb = this.activeQuery();
    if (q.search) {
      qb.andWhere("(p.name ILIKE :s ESCAPE '\\' OR p.code ILIKE :s ESCAPE '\\')", { s: `%${escapeLike(q.search)}%` });
    }
    if (q.categoryId) qb.andWhere('p.category_id = :cat', { cat: q.categoryId });
    return applyStockFilter(qb, q.stockStatus);
  }

  private async page(qb: ReturnType<InventoryService['activeQuery']>, q: InventoryQueryDto) {
    const [rows, total] = await qb
      .orderBy(PRODUCT_SORT_COLUMNS[q.sortBy], q.order.toUpperCase() as 'ASC' | 'DESC')
      .addOrderBy('p.id', 'ASC')
      .skip((q.page - 1) * q.limit)
      .take(q.limit)
      .getManyAndCount();
    return paginated(rows.map(toProductView), total, q);
  }

  /** Panel principal: resumen + entradas/salidas de los últimos 7 días (hora Colombia). */
  async summary() {
    const totals = await this.products
      .createQueryBuilder('p')
      .select('COUNT(*)::int', 'products')
      .addSelect('COALESCE(SUM(p.stock), 0)::int', 'units')
      .addSelect('COUNT(*) FILTER (WHERE p.stock <= p.min_stock)::int', 'lowStock')
      .addSelect('COUNT(*) FILTER (WHERE p.stock = 0)::int', 'outOfStock')
      .addSelect('COUNT(*) FILTER (WHERE p.stock > p.min_stock)::int', 'available')
      .addSelect('COUNT(DISTINCT p.category_id)::int', 'categories')
      .where('p.is_active = true')
      .getRawOne();

    const byCategory: { category: string; units: number }[] = await this.products
      .createQueryBuilder('p')
      .innerJoin('p.category', 'c')
      .select('c.name', 'category')
      .addSelect('COALESCE(SUM(p.stock), 0)::int', 'units')
      .where('p.is_active = true')
      .groupBy('c.name')
      .orderBy('units', 'DESC')
      .addOrderBy('c.name', 'ASC')
      .getRawMany();

    const todayRows: { type: string; n: number }[] = await this.movements
      .createQueryBuilder('m')
      .select('m.type', 'type')
      .addSelect('COUNT(*)::int', 'n')
      .where("m.created_at >= date_trunc('day', now() AT TIME ZONE 'America/Bogota') AT TIME ZONE 'America/Bogota'")
      .groupBy('m.type')
      .getRawMany();
    const inToday = todayRows.find((r) => r.type === 'IN')?.n ?? 0;
    const outToday = todayRows.find((r) => r.type === 'OUT')?.n ?? 0;

    const rows: { day: string; type: string; units: number }[] = await this.movements
      .createQueryBuilder('m')
      .select("to_char(m.created_at AT TIME ZONE 'America/Bogota', 'YYYY-MM-DD')", 'day')
      .addSelect('m.type', 'type')
      .addSelect('SUM(m.quantity)::int', 'units')
      .where("m.created_at >= (date_trunc('day', now() AT TIME ZONE 'America/Bogota') - interval '6 days') AT TIME ZONE 'America/Bogota'")
      .groupBy('day')
      .addGroupBy('m.type')
      .getRawMany();

    const days: { date: string; in: number; out: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - 5 * 3600_000 - i * 86_400_000).toISOString().slice(0, 10);
      days.push({
        date: d,
        in: rows.find((r) => r.day === d && r.type === 'IN')?.units ?? 0,
        out: rows.find((r) => r.day === d && r.type === 'OUT')?.units ?? 0,
      });
    }
    return {
      activeProducts: totals.products,
      totalUnits: totals.units,
      lowStockCount: totals.lowStock,
      outOfStockCount: totals.outOfStock,
      availableCount: totals.available,
      categoriesCount: totals.categories,
      unitsByCategory: byCategory,
      todayMovements: { in: inToday, out: outToday, total: inToday + outToday },
      last7Days: days,
    };
  }

  private activeQuery() {
    return this.products.createQueryBuilder('p').leftJoinAndSelect('p.category', 'c').where('p.is_active = true');
  }
}
