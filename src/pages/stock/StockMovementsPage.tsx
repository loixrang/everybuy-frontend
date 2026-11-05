import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import type { StockMovement } from '../../types/stock';
import type { Product } from '../../types/product';
import { fetchAllStockMovements } from '../../lib/api/stock';
import { fetchProducts } from '../../lib/api/products';
import { StockAdjustmentModal } from '../../components/stock/StockAdjustmentModal';
import { SheetSelect } from '../../components/ui/SheetSelect';
import { formatMovementDate, formatMovementLabel } from '../../lib/utils/format';
import { matchesSearch } from '../../lib/utils/search';
import {
  SearchIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  PlusIcon,
  SlidersIcon,
  XIcon,
} from '../../components/ui/Icons';
import type { ApiError } from '../../lib/api/client';

export function StockMovementsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const filterProductId = searchParams.get('productId') || '';

  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState<number>(0);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Modal state
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState<boolean>(false);
  // Product targeted by the adjust-stock action; defaults to the URL filter when present.
  const [adjustProductId, setAdjustProductId] = useState<string>(filterProductId);
  const [prevFilterProductId, setPrevFilterProductId] = useState<string>(filterProductId);
  if (prevFilterProductId !== filterProductId) {
    setPrevFilterProductId(filterProductId);
    setAdjustProductId(filterProductId);
  }

  useEffect(() => {
    let ignore = false;

    async function execute() {
      try {
        // The backend movements endpoint has no product filter, so we load all
        // pages (capped) and filter client-side.
        const [movementsData, productsData] = await Promise.all([
          fetchAllStockMovements(),
          fetchProducts({ limit: 100 }),
        ]);
        if (ignore) return;
        // Sort movements descending by createdAt
        movementsData.sort(
          (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
        );
        setMovements(movementsData);
        setProducts(productsData);
      } catch (err: unknown) {
        if (ignore) return;
        const apiErr = err as ApiError;
        setError(apiErr.message || 'Failed to load stock movements.');
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

  // Map products by ID for fast lookup
  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const activeProduct = filterProductId ? productMap.get(filterProductId) : null;

  // Filter movements
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      // Product filter
      if (filterProductId && m.productId !== filterProductId) {
        return false;
      }

      // Movement type filter
      if (typeFilter !== 'ALL' && m.type !== typeFilter) {
        return false;
      }

      // Free-text search
      if (searchTerm.trim()) {
        const prod = productMap.get(m.productId);
        const ref = m.requestId || m.saleItemId || '';
        const typeLabel = formatMovementLabel(m.type, m.note);

        return matchesSearch(
          [
            prod?.name ?? '',
            prod?.size ?? '',
            m.note ?? '',
            ref,
            typeLabel,
          ].join(' '),
          searchTerm,
        );
      }

      return true;
    });
  }, [movements, filterProductId, typeFilter, searchTerm, productMap]);

  const clearProductFilter = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('productId');
    setSearchParams(nextParams);
  };

  const getReferenceString = (m: StockMovement): string => {
    if (m.note && (m.note.startsWith('Ref:') || m.note.startsWith('ST-') || m.note.startsWith('RC-') || m.note.startsWith('SL-'))) {
      return m.note.replace('Ref: ', '');
    }
    if (m.type === 'Sale' && m.saleItemId) {
      return `SL-${m.saleItemId.substring(0, 6).toUpperCase()}`;
    }
    if (m.requestId) {
      return `RC-${m.requestId.substring(0, 6).toUpperCase()}`;
    }
    if (m.note) {
      return m.note;
    }
    return `ID-${m.id.substring(0, 6).toUpperCase()}`;
  };

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* Page Heading & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl lg:text-[32px] font-bold tracking-tight text-[color:var(--color-ink)]">
            Stock movements
          </h1>
          <p className="text-sm text-[color:var(--color-muted)]">
            The stock ledger for receipts, sales and approved counts.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <SheetSelect
            label="Adjust stock product"
            ariaLabel="Product to adjust"
            placeholder="Select product to adjust…"
            searchPlaceholder="Search products"
            value={adjustProductId}
            onChange={setAdjustProductId}
            options={[
              { value: '', label: 'Select product to adjust…' },
              ...products.map((p) => ({
                value: p.id,
                label: p.name,
                sublabel: p.size || undefined,
              })),
            ]}
            className="w-full sm:w-64"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsAdjustmentOpen(true)}
              disabled={!adjustProductId}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-[8px] font-semibold text-xs border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SlidersIcon size={16} />
              <span>Adjust stock</span>
            </button>
            <Link
              to={filterProductId ? `/inventory/receive?productId=${filterProductId}` : '/inventory/receive'}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-[8px] font-semibold text-xs bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors"
            >
              <PlusIcon size={16} />
              <span>Receive stock</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Active Product Filter Pill (if navigated from product detail) */}
      {filterProductId && (
        <div className="flex items-center gap-2 p-2.5 px-4 rounded-[8px] bg-[color:var(--color-accent-soft)] border border-[color:var(--color-border)] text-xs text-[color:var(--color-accent-ink)]">
          <span className="font-semibold">Filtered by product:</span>
          <span>{activeProduct ? `${activeProduct.name} (${activeProduct.size || 'standard'})` : filterProductId}</span>
          <button
            onClick={clearProductFilter}
            className="ml-auto inline-flex items-center gap-1 font-semibold hover:underline"
          >
            <XIcon size={14} />
            Clear filter
          </button>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Free-text search input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[color:var(--color-muted)]">
            <SearchIcon size={18} />
          </div>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search product or reference"
            className="w-full h-11 pl-10 pr-4 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] focus:outline-none focus:border-[color:var(--color-accent)] placeholder:text-[color:var(--color-muted)]"
          />
        </div>

        {/* Movement Type Dropdown */}
        <div className="w-full sm:w-56 shrink-0">
          <SheetSelect
            label="Movement type"
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { value: 'ALL', label: 'All movement types' },
              { value: 'Receipt', label: 'Receipts' },
              { value: 'Sale', label: 'Shop sales' },
              { value: 'Adjustment', label: 'Adjustments & stocktakes' },
              { value: 'Opening', label: 'Opening stock' },
            ]}
          />
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 space-y-4 animate-pulse">
          <div className="h-6 w-48 bg-[color:var(--color-subtle)] rounded-[4px]" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-[color:var(--color-subtle)] rounded-[8px]" />
          ))}
        </div>
      )}

      {/* Error state */}
      {!loading && error && (
        <div className="p-6 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-center max-w-md mx-auto space-y-3">
          <AlertCircleIcon className="mx-auto text-[color:var(--color-danger-ink)]" size={32} />
          <h2 className="text-base font-semibold text-[color:var(--color-ink)]">
            Unable to Load Stock Ledger
          </h2>
          <p className="text-xs text-[color:var(--color-muted)]">{error}</p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[8px] font-semibold text-xs bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors"
          >
            <RefreshCwIcon size={14} />
            Retry
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredMovements.length === 0 && (
        <div className="p-12 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-center space-y-3">
          <p className="text-sm font-semibold text-[color:var(--color-ink)]">
            No stock movements found
          </p>
          <p className="text-xs text-[color:var(--color-muted)] max-w-sm mx-auto">
            {searchTerm || typeFilter !== 'ALL' || filterProductId
              ? 'No movements match your selected filters. Try clearing your search.'
              : 'The stock ledger is currently empty. Record a stock receipt to start tracking stock movements.'}
          </p>
          {(searchTerm || typeFilter !== 'ALL' || filterProductId) && (
            <button
              onClick={() => {
                setSearchTerm('');
                setTypeFilter('ALL');
                clearProductFilter();
              }}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[8px] font-semibold text-xs border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors"
            >
              Reset all filters
            </button>
          )}
        </div>
      )}

      {/* Main Content: Desktop Table & Mobile Cards */}
      {!loading && !error && filteredMovements.length > 0 && (
        <div className="space-y-4">
          {/* Table (hidden on phones; cards take over below `md`) */}
          <div className="hidden md:block rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[color:var(--color-subtle)] border-b border-[color:var(--color-border)] text-[12px] font-medium text-[color:var(--color-muted)]">
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Product</th>
                  <th className="py-3 px-4">Movement</th>
                  <th className="py-3 px-4 text-right">Packs</th>
                  <th className="py-3 px-4">Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[color:var(--color-border)] text-sm">
                {filteredMovements.map((m) => {
                  const product = productMap.get(m.productId);
                  const isPositive = m.changePacks > 0;
                  const label = formatMovementLabel(m.type, m.note);
                  const ref = getReferenceString(m);

                  return (
                    <tr
                      key={m.id}
                      className="hover:bg-[color:var(--color-subtle)]/50 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-semibold text-xs text-[color:var(--color-ink)] whitespace-nowrap">
                        {formatMovementDate(m.createdAt)}
                      </td>
                      <td className="py-3.5 px-4">
                        {product ? (
                          <Link
                            to={`/inventory/${product.id}`}
                            className="font-medium text-[color:var(--color-ink)] hover:text-[color:var(--color-accent)] hover:underline"
                          >
                            {product.name}
                            {product.size ? ` · ${product.size}` : ''}
                          </Link>
                        ) : (
                          <span className="text-[color:var(--color-muted)]">Unknown product</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[color:var(--color-ink)]">
                        <span className="inline-block px-2 py-0.5 rounded-[4px] bg-[color:var(--color-subtle)] font-medium">
                          {label}
                        </span>
                      </td>
                      <td
                        className={`py-3.5 px-4 text-right font-semibold text-sm whitespace-nowrap ${
                          isPositive
                            ? 'text-[color:var(--color-accent)]'
                            : 'text-[color:var(--color-ink)]'
                        }`}
                      >
                        {isPositive ? `+${m.changePacks}` : `${m.changePacks}`}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-[color:var(--color-muted)] font-mono whitespace-nowrap">
                        {ref}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile record cards (< 768px) */}
          <div className="md:hidden space-y-3">
            {filteredMovements.map((m) => {
              const product = productMap.get(m.productId);
              const isPositive = m.changePacks > 0;
              const label = formatMovementLabel(m.type, m.note);
              const ref = getReferenceString(m);

              return (
                <div
                  key={m.id}
                  className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 space-y-1.5"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-[color:var(--color-ink)]">
                    <span>{formatMovementDate(m.createdAt)}</span>
                    <span
                      className={`text-sm font-bold ${
                        isPositive
                          ? 'text-[color:var(--color-accent)]'
                          : 'text-[color:var(--color-ink)]'
                      }`}
                    >
                      {isPositive ? `+${m.changePacks}` : `${m.changePacks}`} packs
                    </span>
                  </div>

                  <div className="text-xs text-[color:var(--color-muted)]">
                    Product:{' '}
                    {product ? (
                      <Link
                        to={`/inventory/${product.id}`}
                        className="font-semibold text-[color:var(--color-ink)] hover:underline"
                      >
                        {product.name} {product.size ? `· ${product.size}` : ''}
                      </Link>
                    ) : (
                      'Unknown product'
                    )}
                  </div>

                  <div className="text-base font-semibold text-[color:var(--color-ink)]">
                    Movement: {label}
                  </div>

                  <div className="text-xs text-[color:var(--color-muted)] pt-1 border-t border-[color:var(--color-border)]">
                    Reference: <span className="font-mono">{ref}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ledger footer note matching design */}
          <p className="text-xs text-[color:var(--color-muted)] pt-2">
            Balances come from movements; staff do not edit the ledger directly.
          </p>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {isAdjustmentOpen && adjustProductId && productMap.get(adjustProductId) && (
        <StockAdjustmentModal
          product={productMap.get(adjustProductId)!}
          onClose={() => setIsAdjustmentOpen(false)}
          onSuccess={() => {
            // Reload the ledger so the new adjustment movement appears.
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}
