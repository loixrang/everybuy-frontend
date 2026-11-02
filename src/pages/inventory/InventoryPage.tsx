import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchProducts, fetchCategories, fetchBrands } from '../../lib/api/products';
import { ApiError } from '../../lib/api/client';
import { useAuth } from '../../app/auth/auth-context';
import { formatNaira, getStockStatus } from '../../lib/utils/format';
import {
  PackageIcon,
  SearchIcon,
  XIcon,
  RefreshCwIcon,
  AlertCircleIcon,
} from '../../components/ui/Icons';
import type { Product, Category, Brand, PackName } from '../../types/product';

// Predefined pack name filters that align with design categories and backend enum
const PACK_NAME_TABS: { label: string; value: PackName | 'ALL' }[] = [
  { label: 'All products', value: 'ALL' },
  { label: 'Diapers', value: 'Small Pack' },
  { label: 'Baby wipes', value: 'Wipes' },
  { label: 'Sanitary pads', value: 'Pad' },
  { label: 'Tissue', value: 'Tissue' },
];

export function InventoryPage() {
  const { isOwner } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);

  // Filter & Search states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPackTab, setSelectedPackTab] = useState<PackName | 'ALL'>('ALL');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function execute() {
      try {
        const [prodsRes, catsRes, brandsRes] = await Promise.allSettled([
          fetchProducts({ limit: 100 }),
          fetchCategories(),
          fetchBrands(),
        ]);

        if (ignore) return;

        if (prodsRes.status === 'fulfilled') {
          setProducts(prodsRes.value);
        } else {
          const err = prodsRes.reason;
          if (err instanceof ApiError) {
            setError({ message: err.message, status: err.status });
          } else {
            setError({ message: 'Unable to connect to the backend server. Please check that the server is running.' });
          }
        }

        if (catsRes.status === 'fulfilled') {
          setCategories(catsRes.value);
        }
        if (brandsRes.status === 'fulfilled') {
          setBrands(brandsRes.value);
        }
      } catch (err: unknown) {
        if (ignore) return;
        if (err instanceof ApiError) {
          setError({ message: err.message, status: err.status });
        } else {
          setError({ message: 'Failed to load inventory data.' });
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    execute();

    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  }, []);

  // Lookup maps for brand and category names
  const categoryMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of categories) {
      map.set(c.id, c.name);
    }
    return map;
  }, [categories]);

  const brandMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of brands) {
      map.set(b.id, b.name);
    }
    return map;
  }, [brands]);

  // Filter products by tab, dropdown category, and client-side text search
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Filter by pack tab
      if (selectedPackTab !== 'ALL' && p.packName !== selectedPackTab) {
        return false;
      }
      // Filter by category dropdown
      if (selectedCategoryId !== 'ALL' && p.categoryId !== selectedCategoryId) {
        return false;
      }
      // Search query (matches name, size, brand name, category name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const brandName = brandMap.get(p.brandId)?.toLowerCase() || '';
        const catName = categoryMap.get(p.categoryId)?.toLowerCase() || '';
        const matchName = p.name.toLowerCase().includes(q);
        const matchSize = p.size ? p.size.toLowerCase().includes(q) : false;
        const matchBrand = brandName.includes(q);
        const matchCat = catName.includes(q);
        const matchPack = p.packName.toLowerCase().includes(q);
        if (!matchName && !matchSize && !matchBrand && !matchCat && !matchPack) {
          return false;
        }
      }
      return true;
    });
  }, [products, selectedPackTab, selectedCategoryId, searchQuery, brandMap, categoryMap]);

  const handleClearFilters = () => {
    setSearchQuery('');
    setSelectedPackTab('ALL');
    setSelectedCategoryId('ALL');
  };

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedPackTab !== 'ALL' ||
    selectedCategoryId !== 'ALL';

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-[32px] font-bold tracking-tight text-[color:var(--color-ink)]">
            Inventory
          </h1>
          <p className="text-sm text-[color:var(--color-muted)] mt-1">
            Pack balances with product-specific bag rules.
          </p>
        </div>
        <div className="shrink-0">
          {isOwner && (
            <Link
              to="/inventory/new"
              className="inline-flex items-center justify-center h-11 px-6 rounded-[8px] font-semibold text-sm bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors"
            >
              Add product
            </Link>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
          <div className="flex items-start gap-3">
            <AlertCircleIcon className="text-[color:var(--color-danger-ink)] shrink-0 mt-0.5" size={20} />
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-semibold text-[color:var(--color-ink)]">
                {error.status === 401 || error.status === 403
                  ? 'Authentication required'
                  : 'Unable to load inventory'}
              </h2>
              <p className="text-sm text-[color:var(--color-muted)] mt-1">
                {error.status === 401 || error.status === 403
                  ? 'Accessing inventory requires staff or owner authorization. Please sign in to the physical store.'
                  : error.message}
              </p>
            </div>
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[8px] border border-[color:var(--color-border)] text-xs font-semibold text-[color:var(--color-ink)] bg-[color:var(--color-surface)] hover:bg-[color:var(--color-subtle)] transition-colors"
            >
              <RefreshCwIcon size={14} />
              Retry
            </button>
          </div>
        </div>
      )}

      {/* List Controls: Search & Category Dropdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-end">
        <div className="sm:col-span-1 lg:col-span-8">
          <label htmlFor="inventory-search" className="block text-xs font-semibold text-[color:var(--color-ink)] mb-1.5">
            Search
          </label>
          <div className="relative">
            <input
              id="inventory-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search product, brand or SKU"
              className="w-full h-[46px] pl-10 pr-9 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] text-sm placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-accent)] focus:outline-none transition-colors"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-[color:var(--color-muted)]">
              <SearchIcon size={18} />
            </div>
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
                aria-label="Clear search query"
              >
                <XIcon size={16} />
              </button>
            )}
          </div>
        </div>

        <div className="sm:col-span-1 lg:col-span-4">
          <label htmlFor="category-select" className="block text-xs font-semibold text-[color:var(--color-ink)] mb-1.5">
            Category
          </label>
          <select
            id="category-select"
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="w-full h-[46px] px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] text-sm focus:border-[color:var(--color-accent)] focus:outline-none transition-colors cursor-pointer"
          >
            <option value="ALL">All categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Filter Tabs / Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-2 px-2 no-scrollbar">
        {PACK_NAME_TABS.map((tab) => {
          const isActive = selectedPackTab === tab.value;
          return (
            <button
              key={tab.label}
              type="button"
              onClick={() => setSelectedPackTab(tab.value)}
              className={`h-11 px-4 rounded-[8px] text-sm font-semibold whitespace-nowrap transition-colors shrink-0 ${
                isActive
                  ? 'bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-ink)] border border-[color:var(--color-accent)]'
                  : 'bg-[color:var(--color-surface)] text-[color:var(--color-muted)] border border-[color:var(--color-border)] hover:bg-[color:var(--color-subtle)]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
        {hasActiveFilters && (
          <button
            type="button"
            onClick={handleClearFilters}
            className="h-11 px-3 rounded-[8px] text-xs font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] whitespace-nowrap transition-colors shrink-0"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Main Content Area: Loading, Empty, No Results, or Records */}
      {loading ? (
        <InventorySkeleton />
      ) : products.length === 0 && !error ? (
        <EmptyInventoryState canAdd={isOwner} />
      ) : filteredProducts.length === 0 ? (
        <NoSearchResultsState onClearFilters={handleClearFilters} />
      ) : (
        <>
          {/* Desktop Table View (>= 1024px) */}
          <div className="hidden lg:block rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[color:var(--color-subtle)] border-b border-[color:var(--color-border)]">
                  <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">Product</th>
                  <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">Pack / Category</th>
                  <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">Available</th>
                  <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">Pack price</th>
                  {isOwner && <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">Acquisition cost</th>}
                  <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-border)]">
                {filteredProducts.map((p) => {
                  const status = getStockStatus(p.stockPacks);
                  const brandName = brandMap.get(p.brandId);
                  const categoryName = categoryMap.get(p.categoryId);

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-[color:var(--color-subtle)]/50 transition-colors group"
                    >
                      <td className="py-4 px-4">
                        <Link
                          to={`/inventory/${p.id}`}
                          className="font-semibold text-sm text-[color:var(--color-ink)] group-hover:text-[color:var(--color-accent)] transition-colors"
                        >
                          {p.name}
                          {p.size && ` · ${p.size}`}
                          {p.piecesPerPack && ` · ${p.piecesPerPack} pieces`}
                        </Link>
                        {brandName && (
                          <div className="text-xs text-[color:var(--color-muted)] mt-0.5">
                            Brand: {brandName}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-4 text-sm text-[color:var(--color-muted)]">
                        <div>{p.packName}</div>
                        {categoryName && <div className="text-xs text-[color:var(--color-quiet)]">{categoryName}</div>}
                      </td>
                      <td className="py-4 px-4 text-sm font-medium text-[color:var(--color-ink)]">
                        {p.stockPacks} {p.stockPacks === 1 ? 'pack' : 'packs'}
                      </td>
                      <td className="py-4 px-4 text-sm font-medium text-[color:var(--color-ink)]">
                        {formatNaira(p.retailPrice)}
                      </td>
                      {isOwner && (
                        <td className="py-4 px-4 text-sm">
                          <CostStatusBadge
                            label={p.stockPacks === 0 ? 'No stock' : p.costPerPack === null ? 'Missing cost' : 'Valued'}
                            missing={p.stockPacks > 0 && p.costPerPack === null}
                          />
                        </td>
                      )}
                      <td className="py-4 px-4 text-sm">
                        <StatusBadge status={status} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (< 1024px) */}
          <div className="lg:hidden space-y-3">
            {filteredProducts.map((p) => {
              const status = getStockStatus(p.stockPacks);
              const brandName = brandMap.get(p.brandId);
              const categoryName = categoryMap.get(p.categoryId);

              return (
                <Link
                  key={p.id}
                  to={`/inventory/${p.id}`}
                  className="block rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 hover:border-[color:var(--color-accent)] transition-colors"
                >
                  <div className="font-semibold text-sm text-[color:var(--color-ink)]">
                    {p.name}
                    {p.size && ` · ${p.size}`}
                    {p.piecesPerPack && ` · ${p.piecesPerPack} pieces`}
                  </div>
                  <div className="text-xs font-medium text-[color:var(--color-muted)] mt-1">
                    {p.packName}
                    {brandName ? ` · ${brandName}` : ''}
                    {categoryName ? ` · ${categoryName}` : ''}
                  </div>
                  <div className="text-xl font-semibold text-[color:var(--color-ink)] mt-3">
                    Available: {p.stockPacks} {p.stockPacks === 1 ? 'pack' : 'packs'}
                  </div>
                  <div className="text-xs font-medium text-[color:var(--color-muted)] border-t border-[color:var(--color-border)] pt-2 mt-3 flex items-center justify-between">
                    <span>Pack price: {formatNaira(p.retailPrice)}</span>
                    <StatusBadge status={status} />
                  </div>
                  {isOwner && (
                    <div className="pt-2 text-xs">
                      <CostStatusBadge
                        label={p.stockPacks === 0 ? 'No stock' : p.costPerPack === null ? 'Missing cost' : 'Valued'}
                        missing={p.stockPacks > 0 && p.costPerPack === null}
                      />
                    </div>
                  )}
                </Link>
              );
            })}
          </div>

          {/* Summary & Secondary Action */}
          <div className="pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-xs font-medium text-[color:var(--color-muted)]">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'product' : 'products'} · stock shared with the online store
            </p>
            <div>
              <Link
                to="/inventory/receive"
                className="inline-flex items-center justify-center w-full sm:w-auto h-11 px-6 rounded-[8px] font-semibold text-sm border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors"
              >
                Receive stock
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: { label: string; tone: 'in-stock' | 'low-stock' | 'out-of-stock' } }) {
  if (status.tone === 'out-of-stock') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-xs font-semibold bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-ink)]">
        {status.label}
      </span>
    );
  }
  if (status.tone === 'low-stock') {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-xs font-semibold bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning-ink)]">
        {status.label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-xs font-semibold bg-[color:var(--color-success-bg)] text-[color:var(--color-success-ink)]">
      {status.label}
    </span>
  );
}

function CostStatusBadge({ label, missing }: { label: string; missing: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-[4px] px-2 py-0.5 text-xs font-semibold ${
        missing
          ? 'bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning-ink)]'
          : 'bg-[color:var(--color-subtle)] text-[color:var(--color-muted)]'
      }`}
    >
      {label}
    </span>
  );
}

function EmptyInventoryState({ canAdd }: { canAdd: boolean }) {
  return (
    <div className="rounded-[16px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-8 md:p-12 text-center">
      <div className="mx-auto w-16 h-16 rounded-full bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-ink)] flex items-center justify-center mb-4">
        <PackageIcon size={32} />
      </div>
      <h2 className="text-xl md:text-2xl font-bold text-[color:var(--color-ink)]">
        {canAdd ? 'Add your first product' : 'No products yet'}
      </h2>
      <p className="text-sm md:text-base text-[color:var(--color-muted)] max-w-md mx-auto mt-2 mb-6">
        {canAdd
          ? 'Set its pack price, bag size and bag rule, then receive the opening stock.'
          : 'The owner has not added any products yet.'}
      </p>
      {canAdd && (
        <Link
          to="/inventory/new"
          className="inline-flex items-center justify-center h-11 px-8 rounded-[8px] font-semibold text-sm bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors"
        >
          Add product
        </Link>
      )}
    </div>
  );
}

function NoSearchResultsState({ onClearFilters }: { onClearFilters: () => void }) {
  return (
    <div className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-8 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-[color:var(--color-subtle)] text-[color:var(--color-muted)] flex items-center justify-center mb-3">
        <SearchIcon size={24} />
      </div>
      <h2 className="text-base font-semibold text-[color:var(--color-ink)]">
        No matching products found
      </h2>
      <p className="text-sm text-[color:var(--color-muted)] mt-1 mb-4">
        Try adjusting your search terms or filter criteria.
      </p>
      <button
        onClick={onClearFilters}
        className="inline-flex items-center justify-center h-9 px-4 rounded-[8px] font-semibold text-xs border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors"
      >
        Clear filters
      </button>
    </div>
  );
}

function InventorySkeleton() {
  return (
    <div className="space-y-4">
      {/* Desktop Skeleton Table */}
      <div className="hidden lg:block rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] overflow-hidden">
        <div className="h-10 bg-[color:var(--color-subtle)] border-b border-[color:var(--color-border)]" />
        <div className="divide-y divide-[color:var(--color-border)]">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-4 flex items-center justify-between gap-4 animate-pulse">
              <div className="h-5 w-64 bg-[color:var(--color-subtle)] rounded-[4px]" />
              <div className="h-4 w-28 bg-[color:var(--color-subtle)] rounded-[4px]" />
              <div className="h-4 w-20 bg-[color:var(--color-subtle)] rounded-[4px]" />
              <div className="h-4 w-20 bg-[color:var(--color-subtle)] rounded-[4px]" />
              <div className="h-5 w-16 bg-[color:var(--color-subtle)] rounded-[4px]" />
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Skeleton Cards */}
      <div className="lg:hidden space-y-3">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 space-y-3 animate-pulse"
          >
            <div className="h-5 w-48 bg-[color:var(--color-subtle)] rounded-[4px]" />
            <div className="h-4 w-32 bg-[color:var(--color-subtle)] rounded-[4px]" />
            <div className="h-6 w-36 bg-[color:var(--color-subtle)] rounded-[4px]" />
            <div className="h-4 w-full bg-[color:var(--color-subtle)] rounded-[4px] pt-2" />
          </div>
        ))}
      </div>
    </div>
  );
}
