import { useEffect, useState, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchProductById, fetchCategories, fetchBrands } from '../../lib/api/products';
import { ApiError } from '../../lib/api/client';
import { formatNaira } from '../../lib/utils/format';
import {
  AlertCircleIcon,
  RefreshCwIcon,
} from '../../components/ui/Icons';
import type { Product, Category, Brand } from '../../types/product';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [product, setProduct] = useState<Product | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);

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
        const [prodRes, catsRes, brandsRes] = await Promise.allSettled([
          fetchProductById(id),
          fetchCategories(),
          fetchBrands(),
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

  // Breakdown of cartons and loose packs
  const stockBreakdown = useMemo(() => {
    if (!product || product.packsPerBag <= 0) return '';
    const cartons = Math.floor(product.stockPacks / product.packsPerBag);
    const loose = product.stockPacks % product.packsPerBag;
    if (cartons === 0) {
      return `${loose} loose ${loose === 1 ? 'pack' : 'packs'}`;
    }
    return `${cartons} ${cartons === 1 ? 'carton' : 'cartons'} + ${loose} ${loose === 1 ? 'pack' : 'packs'}`;
  }, [product]);

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

        {/* Carton Price */}
        <div className="p-6 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
          <span className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
            Carton price
          </span>
          <div className="text-3xl font-bold text-[color:var(--color-ink)] mt-2">
            {formatNaira(product.bagPrice)}
          </div>
          <p className="text-xs text-[color:var(--color-muted)] mt-2">
            {product.packsPerBag} {product.packsPerBag === 1 ? 'pack' : 'packs'} per carton
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
            <span className="text-[color:var(--color-muted)]">Carton conversion</span>
            <span className="font-medium text-[color:var(--color-ink)]">
              {product.packsPerBag} packs per carton
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
        <Link
          to={`/movements?productId=${product.id}`}
          className="inline-flex items-center justify-center h-11 px-6 rounded-[8px] font-semibold text-sm border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors"
        >
          View movements
        </Link>
      </div>

      {/* Stock movements notice */}
      <div className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6">
        <h2 className="text-lg font-bold text-[color:var(--color-ink)] mb-2">
          Recent stock movements
        </h2>
        <p className="text-sm text-[color:var(--color-muted)]">
          Stock receipt, sale deductions, and count adjustments for this item will be detailed in the Movements view (FE-012).
        </p>
      </div>
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
