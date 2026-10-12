import { RefreshToken } from '../modules/auth/entities/refresh-token.entity.js';
import { Category } from '../modules/categories/entities/category.entity.js';
import { InventoryMovement } from '../modules/movements/entities/inventory-movement.entity.js';
import { Product } from '../modules/products/entities/product.entity.js';
import { Permission } from '../modules/roles/entities/permission.entity.js';
import { Role } from '../modules/roles/entities/role.entity.js';
import { User } from '../modules/users/entities/user.entity.js';

export const ALL_ENTITIES = [Permission, Role, User, RefreshToken, Category, Product, InventoryMovement];
