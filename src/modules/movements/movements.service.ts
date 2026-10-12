import { BadRequestException, ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AuthUser } from '../../common/decorators/index.js';
import { paginated } from '../../common/dto/pagination.dto.js';
import { escapeLike } from '../../common/utils/db-errors.js';
import { Product } from '../products/entities/product.entity.js';
import { CreateMovementDto, ListMovementsQueryDto } from './dto/movement.dto.js';
import { InventoryMovement, MovementType, REASONS_BY_TYPE } from './entities/inventory-movement.entity.js';

/** Colombia no usa horario de verano: UTC-5 fijo. */
const TZ_OFFSET = '-05:00';

@Injectable()
export class MovementsService {
  constructor(
    @InjectRepository(InventoryMovement) private readonly repo: Repository<InventoryMovement>,
    private readonly ds: DataSource,
  ) {}

  reasons() {
    return {
      [MovementType.IN]: REASONS_BY_TYPE[MovementType.IN],
      [MovementType.OUT]: REASONS_BY_TYPE[MovementType.OUT],
    };
  }

  /** RF02: valida, actualiza el saldo y registra el movimiento en una sola transacción. */
  async create(dto: CreateMovementDto, actor: AuthUser) {
    if (!REASONS_BY_TYPE[dto.type].includes(dto.reason)) {
      throw new BadRequestException(
        `Motivo no válido para ${dto.type === MovementType.IN ? 'una entrada' : 'una salida'}. Permitidos: ${REASONS_BY_TYPE[dto.type].join(', ')}`,
      );
    }
    const movementId = await this.ds.transaction(async (em) => {
      // Bloqueo de fila: evita saldos negativos por salidas concurrentes.
      const product = await em.findOne(Product, { where: { id: dto.productId }, lock: { mode: 'pessimistic_write' } });
      if (!product) throw new NotFoundException('Producto no encontrado');
      if (!product.isActive) throw new ConflictException('El producto está inactivo y no admite nuevos movimientos');

      if (dto.type === MovementType.OUT && dto.quantity > product.stock) {
        throw new UnprocessableEntityException(
          `Existencia insuficiente: disponible ${product.stock}, solicitado ${dto.quantity}`,
        );
      }
      const balance = product.stock + (dto.type === MovementType.IN ? dto.quantity : -dto.quantity);
      if (balance > 2_000_000_000) throw new UnprocessableEntityException('La existencia superaría el máximo permitido');

      await em.update(Product, product.id, { stock: balance, updatedById: actor.id });
      const m = await em.save(
        em.create(InventoryMovement, {
          productId: product.id,
          type: dto.type,
          quantity: dto.quantity,
          balanceAfter: balance,
          reason: dto.reason,
          observation: dto.observation || null,
          userId: actor.id,
        }),
      );
      return m.id;
    });
    return this.findOne(movementId);
  }

  async findOne(id: string) {
    const m = await this.baseQuery().where('m.id = :id', { id }).getOne();
    if (!m) throw new NotFoundException('Movimiento no encontrado');
    return this.view(m);
  }

  /** RF05: historial por producto y periodo. */
  async list(q: ListMovementsQueryDto) {
    const qb = this.baseQuery();
    if (q.productId) qb.andWhere('m.product_id = :pid', { pid: q.productId });
    if (q.type) qb.andWhere('m.type = :type', { type: q.type });
    if (q.search) {
      qb.andWhere("(p.name ILIKE :s ESCAPE '\\' OR p.code ILIKE :s ESCAPE '\\')", { s: `%${escapeLike(q.search)}%` });
    }
    if (q.from) qb.andWhere('m.created_at >= :from', { from: new Date(`${q.from.slice(0, 10)}T00:00:00.000${TZ_OFFSET}`) });
    if (q.to) {
      const end = new Date(`${q.to.slice(0, 10)}T00:00:00.000${TZ_OFFSET}`);
      end.setUTCDate(end.getUTCDate() + 1);
      qb.andWhere('m.created_at < :to', { to: end });
    }
    if (q.from && q.to && q.from.slice(0, 10) > q.to.slice(0, 10)) {
      throw new BadRequestException('La fecha inicial no puede ser posterior a la final');
    }
    const order = (q.order ?? (q.productId ? 'asc' : 'desc')).toUpperCase() as 'ASC' | 'DESC';
    const [rows, total] = await qb
      .orderBy('m.createdAt', order)
      .addOrderBy('m.seq', order)
      .skip((q.page - 1) * q.limit)
      .take(q.limit)
      .getManyAndCount();
    return paginated(rows.map((m) => this.view(m)), total, q);
  }

  private baseQuery() {
    return this.repo
      .createQueryBuilder('m')
      .innerJoin('m.product', 'p')
      .innerJoin('m.user', 'u')
      .addSelect(['p.id', 'p.code', 'p.name', 'u.id', 'u.fullName', 'u.username']);
  }

  private view(m: InventoryMovement) {
    return {
      id: m.id,
      type: m.type,
      quantity: m.quantity,
      balanceAfter: m.balanceAfter,
      reason: m.reason,
      observation: m.observation,
      createdAt: m.createdAt,
      product: { id: m.product.id, code: m.product.code, name: m.product.name },
      user: { id: m.user.id, fullName: m.user.fullName, username: m.user.username },
    };
  }
}
