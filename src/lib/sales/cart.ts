import type { Product } from '../../types/product';
import type { SaleUnit } from '../../types/sale';
import { toKobo } from '../utils/money';

export function packsForQuantity(product: Product, unit: SaleUnit, quantity: number): number {
  return quantity * (unit === 'Bag' ? product.packsPerBag : unit === 'Half Bag' ? product.packsPerBag / 2 : 1);
}

export function isSaleUnitAvailable(product: Product, unit: SaleUnit): boolean {
  return unit !== 'Half Bag' || (product.halfBagPrice !== null && product.minHalfBagPrice !== null && product.packsPerBag % 2 === 0);
}

export function defaultUnitPrice(product: Product, unit: SaleUnit): string {
  return unit === 'Bag' ? product.bagPrice : unit === 'Half Bag' ? product.halfBagPrice ?? '0' : product.retailPrice;
}

export function minimumUnitPrice(product: Product, unit: SaleUnit): string {
  return unit === 'Bag' ? product.minBagPrice : unit === 'Half Bag' ? product.minHalfBagPrice ?? '0' : product.minRetailPrice;
}

export function maxSaleQuantity(product: Product, unit: SaleUnit): number {
  if (!isSaleUnitAvailable(product, unit)) return 0;
  return Math.floor(product.stockPacks / (unit === 'Bag' ? product.packsPerBag : unit === 'Half Bag' ? product.packsPerBag / 2 : 1));
}

export function hasStockForQuantity(product: Product, unit: SaleUnit, quantity: number): boolean {
  return Number.isInteger(quantity) && quantity >= 1 && packsForQuantity(product, unit, quantity) <= product.stockPacks;
}

export function saleLineTotalKobo(product: Product, unit: SaleUnit, quantity: number): bigint {
  return toKobo(defaultUnitPrice(product, unit)) * BigInt(quantity);
}
