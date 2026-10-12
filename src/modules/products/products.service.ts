import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuthUser } from '../../common/decorators/index.js';
import { paginated } from '../../common/dto/pagination.dto.js';
import { escapeLike, rethrowUnique } from '../../common/utils/db-errors.js';
import { Category } from '../categories/entities/category.entity.js';
import { InventoryMovement, MovementReason, MovementType } from '../movements/entities/inventory-movement.entity.js';
import { CreateProductDto, ListProductsQueryDto, UpdateProductDto } from './dto/product.dto.js';
import { Product } from './entities/product.entity.js';
import { applyStockFilter, PRODUCT_SORT_COLUMNS, toProductView } from './product-view.js';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private readonly repo: Repository<Product>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    private readonly ds: DataSource,
  ) {}

  /** RF01.1 */
  async create(dto: CreateProductDto, actor: AuthUser) {
    await this.assertCategory(dto.categoryId);
    try {
      const id = await this.ds.transaction(async (em) => {
        const product = await em.save(
          em.create(Product, {
            code: dto.code,
            name: dto.name,
            description: dto.description ?? null,
            categoryId: dto.categoryId,
            stock: dto.initialStock,
            minStock: dto.minStock,
            createdById: actor.id,
            updatedById: actor.id,
          }),
        );
        if (dto.initialStock > 0) {
          await em.save(
            em.create(InventoryMovement, {
              productId: product.id,
              type: MovementType.IN,
              quantity: dto.initialStock,
              balanceAfter: dto.initialStock,
              reason: MovementReason.INITIAL,
              userId: actor.id,
            }),
          );
        }
        return product.id;
      });
      return this.findOne(id);
    } catch (e) {
      rethrowUnique(e, 'Ya existe un producto con ese código');
    }
  }

  /** RF03 (búsqueda/filtro) — por defecto solo productos activos. */
  async list(q: ListProductsQueryDto) {
    const qb = this.repo.createQueryBuilder('p').leftJoinAndSelect('p.category', 'c');
    qb.andWhere('p.is_active = :active', { active: q.isActive ?? true });
    if (q.search) {
      qb.andWhere("(p.name ILIKE :s ESCAPE '\\' OR p.code ILIKE :s ESCAPE '\\')", { s: `%${escapeLike(q.search)}%` });
    }
    if (q.categoryId) qb.andWhere('p.category_id = :cat', { cat: q.categoryId });
    applyStockFilter(qb, q.stockStatus);
    const [rows, total] = await qb
      .orderBy(PRODUCT_SORT_COLUMNS[q.sortBy], q.order.toUpperCase() as 'ASC' | 'DESC')
      .addOrderBy('p.id', 'ASC')
      .skip((q.page - 1) * q.limit)
      .take(q.limit)
      .getManyAndCount();
    return paginated(rows.map(toProductView), total, q);
  }

  /** Contadores para los filtros de la pantalla de productos. */
  async stats() {
    const r = await this.repo
      .createQueryBuilder('p')
      .select('COUNT(*) FILTER (WHERE p.is_active)::int', 'active')
      .addSelect('COUNT(*) FILTER (WHERE NOT p.is_active)::int', 'inactive')
      .addSelect('COUNT(*) FILTER (WHERE p.is_active AND p.stock > 0 AND p.stock <= p.min_stock)::int', 'lowStock')
      .addSelect('COUNT(*) FILTER (WHERE p.is_active AND p.stock = 0)::int', 'outOfStock')
      .getRawOne();
    return r as { active: number; inactive: number; lowStock: number; outOfStock: number };
  }

  async findOne(id: string) {
    const p = await this.repo.findOne({ where: { id }, relations: { category: true } });
    if (!p) throw new NotFoundException('Producto no encontrado');
    return toProductView(p);
  }

  /** RF01.2 — el código y la existencia no son modificables. */
  async update(id: string, dto: UpdateProductDto, actor: AuthUser) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Producto no encontrado');
    if (!p.isActive) throw new ConflictException('El producto está inactivo; reactívalo para modificarlo');
    if (dto.categoryId && dto.categoryId !== p.categoryId) await this.assertCategory(dto.categoryId);
    if (dto.name !== undefined) p.name = dto.name;
    if (dto.description !== undefined) p.description = dto.description;
    if (dto.categoryId !== undefined) p.categoryId = dto.categoryId;
    if (dto.minStock !== undefined) p.minStock = dto.minStock;
    p.updatedById = actor.id;
    await this.repo.save(p);
    return this.findOne(id);
  }

  /** RF01.3 — se conserva el historial; el producto deja de admitir movimientos. */
  async setActive(id: string, isActive: boolean, actor: AuthUser) {
    const p = await this.repo.findOne({ where: { id } });
    if (!p) throw new NotFoundException('Producto no encontrado');
    if (isActive) await this.assertCategory(p.categoryId);
    p.isActive = isActive;
    p.updatedById = actor.id;
    await this.repo.save(p);
    return this.findOne(id);
  }

  private async assertCategory(categoryId: string) {
    const c = await this.categories.findOne({ where: { id: categoryId } });
    if (!c) throw new BadRequestException('La categoría indicada no existe');
    if (!c.isActive) throw new BadRequestException('La categoría indicada está inactiva');
  }
}
