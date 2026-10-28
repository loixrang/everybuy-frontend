import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import type { Product } from '../../types/product';
import type { Supplier } from '../../types/stock';
import { fetchProducts } from '../../lib/api/products';
import { createStockAddition, fetchSuppliers } from '../../lib/api/stock';
import {
  CheckCircleIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  ArrowLeftIcon,
} from '../../components/ui/Icons';
import { ApiError } from '../../lib/api/client';

// Matches the backend createStockSchema: quantity is an integer from 1 to 1,000,000.
const MAX_QUANTITY = 1_000_000;

export function ReceiveStockPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialProductId = searchParams.get('productId') || '';

  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [suppliersError, setSuppliersError] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Form states
  const [selectedProductId, setSelectedProductId] = useState<string>(initialProductId);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [cartons, setCartons] = useState<string>('0');
  const [loosePacks, setLoosePacks] = useState<string>('0');

  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  /*
   * The backend requires a client-generated UUID requestId and replays the
   * original result if the same id is retried. Keeping the id across failed
   * attempts makes "Save receipt" retries idempotent instead of duplicating
   * the receipt.
   */
  const requestIdRef = useRef<string | null>(null);

  useEffect(() => {
    let ignore = false;

    async function loadInitialData() {
      setLoadingData(true);
      setPageError(null);
      const [productsRes, suppliersRes] = await Promise.allSettled([
        fetchProducts({ limit: 100 }),
        fetchSuppliers(),
      ]);
      if (ignore) return;

      if (productsRes.status === 'rejected') {
        const err = productsRes.reason;
        setPageError(
          err instanceof ApiError
            ? err.message
            : 'Failed to load products. Check your connection and try again.',
        );
        setLoadingData(false);
        return;
      }

      setProducts(productsRes.value);
      if (!initialProductId && productsRes.value.length > 0) {
        setSelectedProductId(productsRes.value[0].id);
      }

      if (suppliersRes.status === 'fulfilled') {
        setSuppliers(suppliersRes.value);
      } else {
        // Suppliers are optional on the form, so this must not block receiving.
        setSuppliersError(
          'The supplier list could not be loaded. You can still record the receipt without a supplier.',
        );
      }

      setLoadingData(false);
    }

    loadInitialData();

    return () => {
      ignore = true;
    };
  }, [initialProductId]);

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const packsPerBag = selectedProduct?.packsPerBag ?? 1;

  const cartonCount = Math.max(0, parseInt(cartons, 10) || 0);
  const looseCount = Math.max(0, parseInt(loosePacks, 10) || 0);
  const totalPacksFromCartons = cartonCount * packsPerBag;
  const totalPacksToAdd = totalPacksFromCartons + looseCount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSuccessMessage(null);

    if (!selectedProductId) {
      setSubmitError('Please select a product to receive.');
      return;
    }

    if (totalPacksToAdd <= 0) {
      setSubmitError('Please specify at least 1 carton or loose pack to receive.');
      return;
    }

    if (totalPacksToAdd > MAX_QUANTITY) {
      setSubmitError(
        `The backend supports a maximum of ${MAX_QUANTITY.toLocaleString()} packs per receipt. Reduce the quantity.`,
      );
      return;
    }

    if (!requestIdRef.current) {
      requestIdRef.current = crypto.randomUUID();
    }

    setSubmitting(true);
    try {
      const supplierIdNum = selectedSupplierId
        ? parseInt(selectedSupplierId, 10)
        : undefined;

      const result = await createStockAddition({
        requestId: requestIdRef.current,
        productId: selectedProductId,
        type: 'Receipt',
        // The form combines cartons and loose packs, so the receipt is sent
        // as a single pack-denominated quantity.
        unit: 'Pack',
        quantity: totalPacksToAdd,
        supplierId: supplierIdNum && !isNaN(supplierIdNum) ? supplierIdNum : undefined,
      });

      // Only clear the idempotency key once the backend confirms success.
      requestIdRef.current = null;

      const newBalance = result.updateProduct[0]?.stockPacks;
      setSuccessMessage(
        `Received ${totalPacksToAdd} packs for ${selectedProduct?.name || 'product'}.` +
          (typeof newBalance === 'number'
            ? ` New stock balance: ${newBalance} packs.`
            : ''),
      );

      // Redirect after brief delay
      setTimeout(() => {
        navigate(`/inventory/${selectedProductId}`);
      }, 1200);
    } catch (err: unknown) {
      const apiErr = err instanceof ApiError ? err : null;
      if (apiErr?.status === 403) {
        setSubmitError('Forbidden: Only active staff and owners can receive stock.');
      } else if (apiErr?.status === 404) {
        setSubmitError(
          apiErr.message === 'Product not found'
            ? 'The selected product no longer exists. Reload the page and try again.'
            : apiErr.message === 'Active supplier not found'
              ? 'The selected supplier is no longer active. Choose another supplier or none.'
              : apiErr.message,
        );
      } else if (apiErr?.status === 409) {
        setSubmitError(apiErr.message);
      } else {
        setSubmitError(
          apiErr?.message || 'Failed to record stock receipt. Please try again.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="space-y-6 max-w-4xl animate-pulse">
        <div className="h-4 w-28 bg-[color:var(--color-subtle)] rounded-[4px]" />
        <div className="h-8 w-48 bg-[color:var(--color-subtle)] rounded-[4px]" />
        <div className="h-96 rounded-[12px] bg-[color:var(--color-subtle)]" />
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="space-y-6 max-w-xl mx-auto py-12 text-center">
        <AlertCircleIcon className="mx-auto text-[color:var(--color-danger-ink)] mb-3" size={36} />
        <h2 className="text-lg font-bold text-[color:var(--color-ink)]">
          Unable to Load Products
        </h2>
        <p className="text-sm text-[color:var(--color-muted)] mt-1 mb-4">{pageError}</p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 h-10 px-5 rounded-[8px] font-semibold text-xs bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors"
        >
          <RefreshCwIcon size={14} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl pb-12">
      {/* Back breadcrumb */}
      <div>
        <Link
          to={selectedProductId ? `/inventory/${selectedProductId}` : '/inventory'}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-[color:var(--color-accent)] hover:underline"
        >
          <ArrowLeftIcon size={16} />
          Back to inventory
        </Link>
      </div>

      {/* Heading */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold tracking-tight text-[color:var(--color-ink)]">
          Receive stock
        </h1>
        <p className="text-sm text-[color:var(--color-muted)]">
          Record cartons and loose packs from a purchase.
        </p>
      </div>

      {/* Success banner */}
      {successMessage && (
        <div className="p-4 rounded-[12px] bg-[color:var(--color-accent-soft)] border border-[color:var(--color-border)] text-sm font-semibold text-[color:var(--color-accent-ink)] flex items-center gap-3 animate-fade-in">
          <CheckCircleIcon size={20} className="shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error banner */}
      {submitError && (
        <div className="p-4 rounded-[12px] bg-[color:var(--color-danger-bg)] border border-[color:var(--color-border)] text-sm font-medium text-[color:var(--color-danger-ink)] flex items-start gap-3">
          <AlertCircleIcon size={20} className="shrink-0 mt-0.5" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Main Form Container */}
      <form onSubmit={handleSubmit} className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6 sm:p-8 space-y-6">
        {/* Section 1: Receipt details */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-[color:var(--color-ink)]">
            Receipt details
          </h2>

          {suppliersError && (
            <div className="p-3 rounded-[8px] bg-[color:var(--color-subtle)] text-xs text-[color:var(--color-muted)] flex items-start gap-2">
              <AlertCircleIcon size={14} className="shrink-0 mt-0.5" />
              <span>{suppliersError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="receive-supplier"
              className="block text-xs font-semibold text-[color:var(--color-ink)]"
            >
              Supplier
            </label>
            <select
              id="receive-supplier"
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full h-11 px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] focus:outline-none focus:border-[color:var(--color-accent)]"
            >
              <option value="">Local wholesaler / Unspecified</option>
              {suppliers
                .filter((s) => s.active)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="border-t border-[color:var(--color-border)]" />

        {/* Section 2: Stock received */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-[color:var(--color-ink)]">
            Stock received
          </h2>

          {/* Product selector */}
          <div className="space-y-1.5">
            <label
              htmlFor="receive-product"
              className="block text-xs font-semibold text-[color:var(--color-ink)]"
            >
              Product
            </label>
            <select
              id="receive-product"
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full h-11 px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] focus:outline-none focus:border-[color:var(--color-accent)]"
              required
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.size ? `· ${p.size}` : ''} ({p.packsPerBag} packs/carton, current stock: {p.stockPacks} packs)
                </option>
              ))}
            </select>
          </div>

          {/* Quantities: Sealed cartons & Loose packs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label
                htmlFor="receive-cartons"
                className="block text-xs font-semibold text-[color:var(--color-ink)]"
              >
                Sealed cartons
              </label>
              <input
                id="receive-cartons"
                type="number"
                min="0"
                max={MAX_QUANTITY}
                step="1"
                value={cartons}
                onChange={(e) => setCartons(e.target.value)}
                className="w-full h-11 px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] focus:outline-none focus:border-[color:var(--color-accent)]"
              />
              <span className="text-[11px] text-[color:var(--color-muted)]">
                Each carton contains {packsPerBag} packs
              </span>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="receive-loose"
                className="block text-xs font-semibold text-[color:var(--color-ink)]"
              >
                Loose packs
              </label>
              <input
                id="receive-loose"
                type="number"
                min="0"
                max={MAX_QUANTITY}
                step="1"
                value={loosePacks}
                onChange={(e) => setLoosePacks(e.target.value)}
                className="w-full h-11 px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] focus:outline-none focus:border-[color:var(--color-accent)]"
              />
              <span className="text-[11px] text-[color:var(--color-muted)]">
                Individual loose units
              </span>
            </div>
          </div>

          {/* Conversion breakdown message matching receive.svg */}
          <div className="p-4 rounded-[8px] bg-[color:var(--color-accent-soft)] border border-[color:var(--color-border)] flex items-start gap-3">
            <CheckCircleIcon size={20} className="shrink-0 text-[color:var(--color-accent-ink)] mt-0.5" />
            <div className="text-xs space-y-0.5 text-[color:var(--color-accent-ink)]">
              <div className="font-semibold text-sm">
                {cartonCount > 0 ? `${cartonCount} cartons × ${packsPerBag} packs` : '0 cartons'}
                {looseCount > 0 ? ` + ${looseCount} loose packs` : ''} = {totalPacksToAdd} packs
              </div>
              <p className="opacity-90">
                The receipt adds {totalPacksToAdd} packs to this product's stock balance.
              </p>
            </div>
          </div>

          <p className="text-[11px] text-[color:var(--color-muted)]">
            The backend does not store receipt references or notes, so they are not
            collected here. The receipt appears in the movements ledger with its date,
            product, and pack change.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-[color:var(--color-border)]">
          <Link
            to={selectedProductId ? `/inventory/${selectedProductId}` : '/inventory'}
            className="inline-flex items-center justify-center h-11 px-5 rounded-[8px] font-semibold text-sm border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || totalPacksToAdd <= 0 || totalPacksToAdd > MAX_QUANTITY}
            className="inline-flex items-center gap-2 h-11 px-6 rounded-[8px] font-semibold text-sm bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors disabled:opacity-50"
          >
            {submitting && <RefreshCwIcon size={16} className="animate-spin" />}
            {submitting ? 'Saving receipt...' : 'Save receipt'}
          </button>
        </div>
      </form>
    </div>
  );
}
