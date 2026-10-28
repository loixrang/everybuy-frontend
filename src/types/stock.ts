export type StockMovementType = 'Opening' | 'Receipt' | 'Sale' | 'Adjustment';
export type StockChange = 'Add' | 'Sub';
export type StockUnit = 'Bag' | 'Pack';

export interface StockMovement {
  id: string;
  productId: string;
  type: StockMovementType;
  changePacks: number;
  supplierId: number | null;
  saleItemId: string | null;
  requestId: string | null;
  note: string | null;
  createdBy: string;
  createdAt: string;
}

/** Paginated response from GET /api/v1/stock/movements */
export interface StockMovementsPage {
  data: StockMovement[];
  page: number;
  limit: number;
  total: number;
}

export interface Supplier {
  id: number;
  name: string;
  phone?: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * POST /api/v1/stock/additions (StaffGuard).
 * `requestId` is a client-generated UUID used for idempotent retries.
 * When `unit` is 'Bag', the backend multiplies quantity by the product's
 * packsPerBag before adding it to stock.
 */
export interface CreateStockAdditionInput {
  requestId: string;
  productId: string;
  type?: 'Opening' | 'Receipt';
  unit: StockUnit;
  quantity: number;
  supplierId?: number;
}

/**
 * POST /api/v1/stock/adjustments (OwnerGuard).
 * `type` is always 'Adjustment' on the backend; `note` is required.
 */
export interface CreateStockAdjustmentInput {
  requestId: string;
  productId: string;
  unit: StockUnit;
  quantity: number;
  changePack: StockChange;
  note: string;
  supplierId?: number;
}

/** Only id and the new stock balance are returned for the updated product. */
export interface UpdatedProductStock {
  id: string;
  stockPacks: number;
}

export interface StockMutationResult {
  addStock: StockMovement[];
  updateProduct: UpdatedProductStock[];
  replayed: boolean;
}
