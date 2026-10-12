import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser, RequirePermissions } from '../../common/decorators/index.js';
import { Perm } from '../roles/permissions.constants.js';
import { CreateProductDto, ListProductsQueryDto, UpdateProductDto } from './dto/product.dto.js';
import { ProductsService } from './products.service.js';

@ApiTags('products')
@ApiBearerAuth()
@Controller('products')
export class ProductsController {
  constructor(private readonly products: ProductsService) {}

  @RequirePermissions(Perm.PRODUCTS_CREATE)
  @Post()
  create(@Body() dto: CreateProductDto, @CurrentUser() user: AuthUser) {
    return this.products.create(dto, user);
  }

  @RequirePermissions(Perm.PRODUCTS_READ)
  @Get()
  list(@Query() q: ListProductsQueryDto) {
    return this.products.list(q);
  }

  @RequirePermissions(Perm.PRODUCTS_READ)
  @Get('stats')
  stats() {
    return this.products.stats();
  }

  @RequirePermissions(Perm.PRODUCTS_READ)
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.findOne(id);
  }

  @RequirePermissions(Perm.PRODUCTS_UPDATE)
  @Patch(':id')
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProductDto, @CurrentUser() user: AuthUser) {
    return this.products.update(id, dto, user);
  }

  @RequirePermissions(Perm.PRODUCTS_DEACTIVATE)
  @HttpCode(200)
  @Post(':id/deactivate')
  deactivate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.products.setActive(id, false, user);
  }

  @RequirePermissions(Perm.PRODUCTS_DEACTIVATE)
  @HttpCode(200)
  @Post(':id/activate')
  activate(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthUser) {
    return this.products.setActive(id, true, user);
  }
}
