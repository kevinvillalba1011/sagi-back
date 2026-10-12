import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { rethrowUnique } from '../../common/utils/db-errors.js';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';
import { Category } from './entities/category.entity.js';

@Injectable()
export class CategoriesService {
  constructor(@InjectRepository(Category) private readonly repo: Repository<Category>) {}

  list(includeInactive = false) {
    return this.repo.find({ where: includeInactive ? {} : { isActive: true }, order: { name: 'ASC' } });
  }

  async findOne(id: string) {
    const c = await this.repo.findOne({ where: { id } });
    if (!c) throw new NotFoundException('Categoría no encontrada');
    return c;
  }

  async create(dto: CreateCategoryDto) {
    try {
      return await this.repo.save(this.repo.create({ name: dto.name, description: dto.description ?? null }));
    } catch (e) {
      rethrowUnique(e, 'Ya existe una categoría con ese nombre');
    }
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const c = await this.findOne(id);
    Object.assign(c, dto);
    try {
      return await this.repo.save(c);
    } catch (e) {
      rethrowUnique(e, 'Ya existe una categoría con ese nombre');
    }
  }
}
