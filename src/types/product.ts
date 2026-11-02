export type PackName =
  | 'Small Pack'
  | 'Twin Pack'
  | 'Jumbo Pack'
  | 'Wipes'
  | 'Pad'
  | 'Tissue';

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  brandId: string;
  packName: PackName;
  size: string | null;
  packsPerBag: number;
  piecesPerPack: number | null;
  bagPrice: string; // numeric(14,2)
  retailPrice: string; // numeric(14,2)
  /**
   * Weighted-average cost per pack (numeric(14,4)), maintained by stock
   * additions. Null until cost has been recorded; never sent by the product
   * create/update API.
   */
  costPerPack: string | null;
  stockPacks: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  active: boolean;
}

export interface Brand {
  id: string;
  name: string;
  active: boolean;
}

export interface FindProductParams {
  page?: number;
  limit?: number;
  packName?: PackName;
  categoryId?: string;
  brandId?: string;
  size?: string;
}

export interface CreateProductInput {
  name: string;
  categoryId: string;
  brandId: string;
  packName: PackName;
  size?: string | null;
  packsPerBag: number;
  piecesPerPack?: number | null;
  bagPrice: string;
  retailPrice: string;
  /** Optional acquisition cost per pack; numeric(14,4). */
  costPerPack?: string;
  active?: boolean;
}

export type UpdateProductInput = Partial<CreateProductInput>;
