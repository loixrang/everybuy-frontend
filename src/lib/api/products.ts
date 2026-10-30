import { apiFetch } from './client';
import type {
  Product,
  Category,
  Brand,
  FindProductParams,
  CreateProductInput,
  UpdateProductInput,
} from '../../types/product';

/**
 * Fetch products list from the backend API.
 * Route: GET /api/v1/products
 */
export async function fetchProducts(params: FindProductParams = {}): Promise<Product[]> {
  const query = new URLSearchParams();

  if (params.page !== undefined) query.set('page', String(params.page));
  if (params.limit !== undefined) query.set('limit', String(params.limit));
  if (params.categoryId) query.set('categoryId', params.categoryId);
  if (params.brandId) query.set('brandId', params.brandId);
  if (params.packName) query.set('packName', params.packName);
  if (params.size) query.set('size', params.size);

  const qs = query.toString();
  const path = `/api/v1/products${qs ? `?${qs}` : ''}`;

  return apiFetch<Product[]>(path);
}

/**
 * Fetch a single product by ID.
 * Route: GET /api/v1/products/:id
 * Note: Backend repository returns an array of matching rows.
 */
export async function fetchProductById(id: string): Promise<Product | null> {
  const res = await apiFetch<Product[] | Product>(`/api/v1/products/${id}`);
  if (Array.isArray(res)) {
    return res.length > 0 ? res[0] : null;
  }
  return res || null;
}

/**
 * Create a new product.
 * Route: POST /api/v1/products
 * Guarded by: OwnerGuard (requires Owner role)
 */
export async function createProduct(input: CreateProductInput): Promise<Product> {
  const res = await apiFetch<Product[] | Product>('/api/v1/products', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  if (Array.isArray(res)) {
    return res[0];
  }
  return res;
}

/**
 * Update an existing product.
 * Route: PATCH /api/v1/products/:id
 * Guarded by: OwnerGuard (requires Owner role)
 */
export async function updateProduct(
  id: string,
  input: UpdateProductInput
): Promise<Product> {
  const res = await apiFetch<Product[] | Product>(`/api/v1/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  if (Array.isArray(res)) {
    return res[0];
  }
  return res;
}

/**
 * Fetch categories from the backend API.
 * Route: GET /api/v1/categories
 */
export async function fetchCategories(): Promise<Category[]> {
  return apiFetch<Category[]>('/api/v1/categories');
}

/**
 * Fetch brands from the backend API.
 * Route: GET /api/v1/brands
 */
export async function fetchBrands(): Promise<Brand[]> {
  return apiFetch<Brand[]>('/api/v1/brands');
}

/** Create a category. The backend returns an array containing the created row. */
export async function createCategory(name: string): Promise<Category> {
  const rows = await apiFetch<Category[]>('/api/v1/categories', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  const category = rows[0];
  if (!category) throw new Error('The server did not return the created category.');
  return category;
}

/** Create a brand. The backend returns an array containing the created row. */
export async function createBrand(name: string): Promise<Brand> {
  const rows = await apiFetch<Brand[]>('/api/v1/brands', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
  const brand = rows[0];
  if (!brand) throw new Error('The server did not return the created brand.');
  return brand;
}

export async function setCategoryActive(id: string, active: boolean): Promise<Category> {
  const rows = await apiFetch<Category[]>(`/api/v1/categories/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });
  const category = rows[0];
  if (!category) throw new Error('The server did not return the updated category.');
  return category;
}

export async function setBrandActive(id: string, active: boolean): Promise<Brand> {
  const rows = await apiFetch<Brand[]>(`/api/v1/brands/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });
  const brand = rows[0];
  if (!brand) throw new Error('The server did not return the updated brand.');
  return brand;
}
