import { Body, Controller, Get, Param, ParseBoolPipe, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiQuery, ApiTags } from '@nestjs/swagger';
import { RequirePermissions } from '../../common/decorators/index.js';
import { Perm } from '../roles/permissions.constants.js';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto.js';

@ApiTags('categories')
@ApiBearerAuth()
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categories: CategoriesService) {}

  @RequirePermissions(Perm.CATEGORIES_READ)
  @ApiQuery({ name: 'includeInactive', required: false, type: Boolean })
  @Get()
  list(@Query('includeInactive', new ParseBoolPipe({ optional: true })) includeInactive?: boolean) {
    return this.categories.list(includeInactive);
  }

  @RequirePermissions(Perm.CATEGORIES_READ)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.categories.findOne(id);
  }

  @RequirePermissions(Perm.CATEGORIES_MANAGE)
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categories.create(dto);
  }

  @RequirePermissions(Perm.CATEGORIES_MANAGE)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCategoryDto) {
    return this.categories.update(id, dto);
  }
}
