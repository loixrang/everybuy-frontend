import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchProductById, fetchCategories, fetchBrands } from '../../lib/api/products';
import { fetchAllStockMovements } from '../../lib/api/stock';
import { ApiError } from '../../lib/api/client';
import { formatNaira, formatMovementDate, formatMovementLabel } from '../../lib/utils/format';
import {
  AlertCircleIcon,
  RefreshCwIcon,
  SlidersIcon,
} from '../../components/ui/Icons';
import type { Product, Category, Brand } from '../../types/product';
import type { StockMovement } from '../../types/stock';
import { StockAdjustmentModal } from '../../components/stock/StockAdjustmentModal';

function movementReference(m: StockMovement): string {
  if (
    m.note &&
    (m.note.startsWith('Ref:') ||
      m.note.startsWith('ST-') ||
      m.note.startsWith('RC-') ||
      m.note.startsWith('SL-'))
  ) {
    return m.note.replace('Ref: ', '');
  }
  if (m.type === 'Sale' && m.saleItemId) {
    return `SL-${m.saleItemId.substring(0, 6).toUpperCase()}`;
  }
  if (m.requestId) {
    return `RC-${m.requestId.substring(0, 6).toUpperCase()}`;
  }
  return m.note || `ID-${m.id.substring(0, 6).toUpperCase()}`;
}

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState<boolean>(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; status?: number } | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let ignore = false;

    async function execute() {
      if (!id) {
        setLoading(false);
        setError({ message: 'Product ID is missing.' });
        return;
      }

      try {
        const [prodRes, catsRes, brandsRes, movRes] = await Promise.allSettled([
          fetchProductById(id),
          fetchCategories(),
          fetchBrands(),
          fetchAllStockMovements(),
        ]);

        if (ignore) return;

        if (prodRes.status === 'fulfilled') {
          if (!prodRes.value) {
            setError({ message: 'Product not found.', status: 404 });
          } else {
            setProduct(prodRes.value);
          }
        } else {
          const err = prodRes.reason;
          if (err instanceof ApiError) {
            setError({ message: err.message, status: err.status });
          } else {
            setError({ message: 'Unable to connect to the backend server.' });
          }
        }

        if (catsRes.status === 'fulfilled') {
          setCategories(catsRes.value);
        }
        if (brandsRes.status === 'fulfilled') {
          setBrands(brandsRes.value);
        }
        if (movRes.status === 'fulfilled') {
          // Sort movements descending by createdAt
          const sorted = [...movRes.value].sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
          );
          setMovements(sorted);
        }
      } catch (err: unknown) {
        if (ignore) return;
        if (err instanceof ApiError) {
          setError({ message: err.message, status: err.status });
        } else {
          setError({ message: 'Failed to load product details.' });
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
  }, [id, reloadKey]);

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadKey((k) => k + 1);
  }, []);

  const categoryName = useMemo(() => {
    if (!product) return '';
    return categories.find((c) => c.id === product.categoryId)?.name || '';
  }, [categories, product]);

  const brandName = useMemo(() => {
    if (!product) return '';
    return brands.find((b) => b.id === product.brandId)?.name || '';
  }, [brands, product]);

  // Breakdown of bags and loose packs
  const stockBreakdown = useMemo(() => {
    if (!product || product.packsPerBag <= 0) return '';
    const bags = Math.floor(product.stockPacks / product.packsPerBag);
    const loose = product.stockPacks % product.packsPerBag;
    if (bags === 0) {
      return `${loose} loose ${loose === 1 ? 'pack' : 'packs'}`;
    }
    return `${bags} ${bags === 1 ? 'bag' : 'bags'} + ${loose} ${loose === 1 ? 'pack' : 'packs'}`;
  }, [product]);

  const recentMovements = useMemo(
    () =>
      product
        ? movements.filter((m) => m.productId === product.id).slice(0, 5)
        : [],
    [movements, product],
  );

  if (loading) {
    return <ProductDetailSkeleton />;
  }

  if (error || !product) {
    return (
      <div className="space-y-6">
        <div>
          <Link
            to="/inventory"
            className="inline-flex items-center text-sm font-semibold text-[color:var(--color-accent)] hover:underline"
          >
            ← Inventory
          </Link>
        </div>
        <div className="p-6 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-center max-w-md mx-auto">
          <AlertCircleIcon className="mx-auto text-[color:var(--color-danger-ink)] mb-3" size={32} />
          <h2 className="text-base font-semibold text-[color:var(--color-ink)]">
            {error?.status === 404 ? 'Product Not Found' : 'Unable to Load Product'}
          </h2>
          <p className="text-sm text-[color:var(--color-muted)] mt-1 mb-4">
            {error?.message || 'The requested product could not be loaded.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Link
              to="/inventory"
              className="inline-flex items-center justify-center h-9 px-4 rounded-[8px] font-semibold text-xs border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors"
            >
              Back to inventory
            </Link>
            {error?.status !== 404 && (
              <button
                onClick={handleRetry}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[8px] font-semibold text-xs bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors"
              >
                <RefreshCwIcon size={14} />
                Retry
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Navigation breadcrumb */}
      <div>
        <Link
          to="/inventory"
          className="inline-flex items-center text-sm font-semibold text-[color:var(--color-accent)] hover:underline"
        >
          ← Inventory
        </Link>
      </div>

      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-[32px] font-bold tracking-tight text-[color:var(--color-ink)]">
            {product.name}
          </h1>
          <p className="text-sm text-[color:var(--color-muted)] mt-1">
            {product.packName}
            {product.size ? ` · ${product.size}` : ''}
            {product.piecesPerPack ? ` · ${product.piecesPerPack} pieces` : ''}
            {brandName ? ` · ${brandName}` : ''}
          </p>
        </div>
        <div className="shrink-0">
          <Link
            to={`/inventory/${product.id}/edit`}
            className="inline-flex items-center justify-center h-11 px-6 rounded-[8px] font-semibold text-sm bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors"
          >
            Edit product
          </Link>
        </div>
      </div>

      {/* Summary Metrics (3 cards matching product.svg) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Available Stock */}
        <div className="p-6 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-accent-soft)]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
            Available stock
          </span>
          <div className="text-3xl font-bold text-[color:var(--color-accent-ink)] mt-2">
            {product.stockPacks} {product.stockPacks === 1 ? 'pack' : 'packs'}
          </div>
          <p className="text-xs text-[color:var(--color-muted)] mt-2">
            {stockBreakdown}
          </p>
        </div>

        {/* Pack Price */}
        <div className="p-6 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
            Pack price
          </span>
          <div className="text-3xl font-bold text-[color:var(--color-ink)] mt-2">
            {formatNaira(product.retailPrice)}
          </div>
          <p className="text-xs text-[color:var(--color-muted)] mt-2">
            {product.piecesPerPack ? `One pack of ${product.piecesPerPack}` : 'Single pack selling price'}
          </p>
        </div>

        {/* Bag Price */}
        <div className="p-6 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
            Bag price
          </span>
          <div className="text-3xl font-bold text-[color:var(--color-ink)] mt-2">
            {formatNaira(product.bagPrice)}
          </div>
          <p className="text-xs text-[color:var(--color-muted)] mt-2">
            {product.packsPerBag} {product.packsPerBag === 1 ? 'pack' : 'packs'} per bag
          </p>
        </div>
      </div>

      {/* Product Setup Details Panel */}
      <div className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 space-y-4">
        <h2 className="text-lg font-bold text-[color:var(--color-ink)]">
          Product setup
        </h2>
        <div className="divide-y divide-[color:var(--color-border)] text-sm">
          <div className="py-3 flex items-center justify-between">
            <span className="text-[color:var(--color-muted)]">Brand / category</span>
            <span className="font-medium text-[color:var(--color-ink)]">
              {brandName || '—'} / {categoryName || '—'}
            </span>
          </div>
          <div className="py-3 flex items-center justify-between">
            <span className="text-[color:var(--color-muted)]">Base stock unit</span>
            <span className="font-medium text-[color:var(--color-ink)]">Pack</span>
          </div>
          <div className="py-3 flex items-center justify-between">
            <span className="text-[color:var(--color-muted)]">Bag conversion</span>
            <span className="font-medium text-[color:var(--color-ink)]">
              {product.packsPerBag} packs per bag
            </span>
          </div>
          {product.piecesPerPack && (
            <div className="py-3 flex items-center justify-between">
              <span className="text-[color:var(--color-muted)]">Pieces per pack</span>
              <span className="font-medium text-[color:var(--color-ink)]">
                {product.piecesPerPack} pieces
              </span>
            </div>
          )}
          <div className="py-3 flex items-center justify-between">
            <span className="text-[color:var(--color-muted)]">Status</span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-xs font-semibold ${
                product.active
                  ? 'bg-[color:var(--color-success-bg)] text-[color:var(--color-success-ink)]'
                  : 'bg-[color:var(--color-subtle)] text-[color:var(--color-muted)]'
              }`}
            >
              {product.active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>
      </div>

      {/* Product Actions */}
      <div className="flex flex-wrap items-center gap-3">
        <Link
          to={`/inventory/receive?productId=${product.id}`}
          className="inline-flex items-center justify-center h-11 px-6 rounded-[8px] font-semibold text-sm bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors"
        >
          Receive stock
        </Link>
        <button
          type="button"
          onClick={() => setIsAdjustmentOpen(true)}
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[8px] font-semibold text-sm border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors"
        >
          <SlidersIcon size={16} />
          <span>Adjust stock</span>
        </button>
        <Link
          to={`/movements?productId=${product.id}`}
          className="inline-flex items-center justify-center h-11 px-6 rounded-[8px] font-semibold text-sm border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors"
        >
          View movements
        </Link>
      </div>

      {/* Recent stock movements matching product.svg */}
      <div className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-[color:var(--color-border)] flex items-center justify-between gap-3">
          <h2 className="text-base sm:text-lg font-bold text-[color:var(--color-ink)]">
            Recent stock movements
          </h2>
          <Link
            to={`/movements?productId=${product.id}`}
            className="text-xs font-semibold text-[color:var(--color-accent)] hover:underline shrink-0"
          >
            All movements →
          </Link>
        </div>

        {recentMovements.length === 0 ? (
          <div className="p-8 text-center text-sm text-[color:var(--color-muted)]">
            No stock movements recorded for this product yet.
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[color:var(--color-subtle)] border-b border-[color:var(--color-border)] text-[12px] font-medium text-[color:var(--color-muted)]">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Movement</th>
                    <th className="py-3 px-4 text-right">Packs</th>
                    <th className="py-3 px-4">Reference</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--color-border)] text-sm">
                  {recentMovements.map((m) => {
                    const isPositive = m.changePacks > 0;

                    return (
                      <tr
                        key={m.id}
                        className="hover:bg-[color:var(--color-subtle)]/50 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-semibold text-xs text-[color:var(--color-ink)] whitespace-nowrap">
                          {formatMovementDate(m.createdAt)}
                        </td>
                        <td className="py-3.5 px-4 text-xs text-[color:var(--color-ink)]">
                          <span className="inline-block px-2 py-0.5 rounded-[4px] bg-[color:var(--color-subtle)] font-medium">
                            {formatMovementLabel(m.type, m.note)}
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
                          {movementReference(m)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <ul className="md:hidden divide-y divide-[color:var(--color-border)]">
              {recentMovements.map((m) => {
                const isPositive = m.changePacks > 0;

                return (
                  <li key={m.id} className="p-4 space-y-1.5">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-xs font-semibold text-[color:var(--color-ink)]">
                        {formatMovementDate(m.createdAt)}
                      </span>
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
                    <div className="flex items-center justify-between gap-3">
                      <span className="inline-block px-2 py-0.5 rounded-[4px] bg-[color:var(--color-subtle)] text-xs font-medium text-[color:var(--color-ink)]">
                        {formatMovementLabel(m.type, m.note)}
                      </span>
                      <span className="text-[11px] font-mono text-[color:var(--color-muted)] truncate">
                        {movementReference(m)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>

      {/* Stock Adjustment Modal */}
      {product && isAdjustmentOpen && (
        <StockAdjustmentModal
          product={product}
          onClose={() => setIsAdjustmentOpen(false)}
          onSuccess={({ updatedProducts }) => {
            // The backend returns only { id, stockPacks }; merge into current product.
            const mine = updatedProducts.find((u) => u.id === product.id);
            if (mine) {
              setProduct({ ...product, stockPacks: mine.stockPacks });
            }
            fetchAllStockMovements()
              .then((movs) => {
                const sorted = [...movs].sort(
                  (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
                );
                setMovements(sorted);
              })
              .catch(() => {
                // The adjustment already succeeded; a failed history refresh is
                // non-fatal and the next reload will pick it up.
              });
          }}
        />
      )}
    </div>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="space-y-6 max-w-5xl animate-pulse">
      <div className="h-4 w-24 bg-[color:var(--color-subtle)] rounded-[4px]" />
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-[color:var(--color-subtle)] rounded-[4px]" />
          <div className="h-4 w-40 bg-[color:var(--color-subtle)] rounded-[4px]" />
        </div>
        <div className="h-11 w-32 bg-[color:var(--color-subtle)] rounded-[8px]" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-32 rounded-[12px] bg-[color:var(--color-subtle)]" />
        ))}
      </div>
      <div className="h-48 rounded-[12px] bg-[color:var(--color-subtle)]" />
    </div>
  );
}
