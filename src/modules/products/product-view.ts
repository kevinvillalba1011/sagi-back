import type { SelectQueryBuilder } from 'typeorm';
import { Product } from './entities/product.entity.js';

export type StockStatus = 'OUT_OF_STOCK' | 'LOW_STOCK' | 'AVAILABLE';

export const stockStatus = (stock: number, minStock: number): StockStatus =>
  stock === 0 ? 'OUT_OF_STOCK' : stock <= minStock ? 'LOW_STOCK' : 'AVAILABLE';

export function toProductView(p: Product) {
  return {
    id: p.id,
    code: p.code,
    name: p.name,
    description: p.description,
    category: p.category ? { id: p.category.id, name: p.category.name } : undefined,
    categoryId: p.categoryId,
    stock: p.stock,
    minStock: p.minStock,
    isActive: p.isActive,
    stockStatus: stockStatus(p.stock, p.minStock),
    lowStockAlert: p.isActive && p.stock <= p.minStock,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

export enum StockFilter {
  OUT_OF_STOCK = 'OUT_OF_STOCK',
  LOW_STOCK = 'LOW_STOCK',
  AVAILABLE = 'AVAILABLE',
}

/** Columnas permitidas para ordenar (lista blanca). El alias `c` es la categoría. */
export const PRODUCT_SORT_COLUMNS = {
  name: 'p.name',
  code: 'p.code',
  stock: 'p.stock',
  minStock: 'p.minStock',
  category: 'c.name',
  createdAt: 'p.createdAt',
} as const;
export type ProductSortKey = keyof typeof PRODUCT_SORT_COLUMNS;

/** Filtra por estado de stock (mismas reglas que `stockStatus`). */
export function applyStockFilter<T extends object>(qb: SelectQueryBuilder<T>, status?: StockFilter) {
  if (status === StockFilter.OUT_OF_STOCK) qb.andWhere('p.stock = 0');
  else if (status === StockFilter.LOW_STOCK) qb.andWhere('p.stock > 0 AND p.stock <= p.min_stock');
  else if (status === StockFilter.AVAILABLE) qb.andWhere('p.stock > p.min_stock');
  return qb;
}
