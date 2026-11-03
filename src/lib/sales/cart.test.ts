import { describe, expect, it } from 'bun:test';
import type { Product } from '../../types/product';
import { defaultUnitPrice, isSaleUnitAvailable, maxSaleQuantity, packsForQuantity } from './cart';

const product: Product = {
  id: 'product', name: 'Example', categoryId: 'category', brandId: 'brand',
  packName: 'Small Pack', size: null, packsPerBag: 10, piecesPerPack: null,
  retailPrice: '1200.00', minRetailPrice: '1000.00',
  halfBagPrice: '5300.00', minHalfBagPrice: '5000.00',
  bagPrice: '10500.00', minBagPrice: '10000.00', costPerPack: null,
  stockPacks: 25, active: true, createdAt: '', updatedAt: '',
};

describe('sale unit conversion and pricing', () => {
  it('uses independent half-bag price and exact pack conversion', () => {
    expect(defaultUnitPrice(product, 'Half Bag')).toBe('5300.00');
    expect(packsForQuantity(product, 'Half Bag', 2)).toBe(10);
    expect(maxSaleQuantity(product, 'Half Bag')).toBe(5);
  });

  it('does not expose half bags for an odd pack configuration', () => {
    expect(isSaleUnitAvailable({ ...product, packsPerBag: 9 }, 'Half Bag')).toBe(false);
    expect(maxSaleQuantity({ ...product, packsPerBag: 9 }, 'Half Bag')).toBe(0);
  });
});
