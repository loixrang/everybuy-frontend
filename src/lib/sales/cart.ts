import type { Product } from '../../types/product';
import type { SaleUnit } from '../../types/sale';
import { toKobo } from '../utils/money';

export function packsForQuantity(product: Product, unit: SaleUnit, quantity: number): number {
  return quantity * (unit === 'Bag' ? product.packsPerBag : 1);
}

export function maxSaleQuantity(product: Product, unit: SaleUnit): number {
  return Math.floor(product.stockPacks / (unit === 'Bag' ? product.packsPerBag : 1));
}

export function hasStockForQuantity(product: Product, unit: SaleUnit, quantity: number): boolean {
  return Number.isInteger(quantity) && quantity >= 1 && packsForQuantity(product, unit, quantity) <= product.stockPacks;
}

export function saleLineTotalKobo(product: Product, unit: SaleUnit, quantity: number): bigint {
  return toKobo(unit === 'Bag' ? product.bagPrice : product.retailPrice) * BigInt(quantity);
}
