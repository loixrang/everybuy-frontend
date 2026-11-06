import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { Product } from '../../types/product';
import type { Customer, CustomerListItem } from '../../types/customer';
import type {
  PaymentMethod,
  SaleUnit,
  CreateSaleResult,
} from '../../types/sale';
import { fetchProducts } from '../../lib/api/products';
import { fetchCustomers } from '../../lib/api/customers';
import { createSale } from '../../lib/api/sales';
import { toKobo, fromKobo } from '../../lib/utils/money';
import { formatNaira } from '../../lib/utils/format';
import { matchesSearch } from '../../lib/utils/search';
import { defaultUnitPrice, minimumUnitPrice, hasStockForQuantity, isSaleUnitAvailable, maxSaleQuantity, packsForQuantity } from '../../lib/sales/cart';
import { ApiError } from '../../lib/api/client';
import { SheetSelect } from '../../components/ui/SheetSelect';
import { CustomerPicker } from '../../components/customers/CustomerPicker';
import { AddCustomerModal } from '../../components/customers/AddCustomerModal';
import {
  SearchIcon,
  AlertCircleIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
} from '../../components/ui/Icons';

// Matches the backend createSaleSchema: item quantity is an integer from 1 to 1,000,000.
const MAX_QUANTITY = 1_000_000;
// The backend accepts at most 100 lines per sale.
const MAX_ITEMS = 100;
// amountPaid must match the backend regex ^\d{1,12}(\.\d{1,2})?$
const AMOUNT_PAID_PATTERN = /^\d{1,12}(\.\d{1,2})?$/;

interface CartItem {
  productId: string;
  unit: SaleUnit;
  quantity: number;
  unitPrice: string;
}

/** Derives the unit price string from the product row, like the backend does. */
function unitLabel(unit: SaleUnit): string {
  return unit;
}

export function RecordSalePage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<CustomerListItem[]>([]);
  const [loadingData, setLoadingData] = useState<boolean>(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Cart
  const [items, setItems] = useState<CartItem[]>([]);

  // Product search
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Customer & payment
  const [customerId, setCustomerId] = useState<string>('');
  const [amountPaid, setAmountPaid] = useState<string>('');
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [reference, setReference] = useState<string>('');

  // New customer form, shared with the Customers tab.
  const [showAddCustomer, setShowAddCustomer] = useState<boolean>(false);

  // Submission
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [conflictMessage, setConflictMessage] = useState<string | null>(null);
  const [result, setResult] = useState<CreateSaleResult | null>(null);

  /*
   * The backend requires a client-generated UUID requestId and replays the
   * original result when the same id and payload are retried, but rejects
   * (409) the same id with a different payload. The id is therefore kept
   * across retries of identical payloads and regenerated when the sale edits,
   * cleared only after the backend confirms success.
   */
  const requestIdRef = useRef<{ id: string; payload: string } | null>(null);

  /*
   * Customer balances come from GET /api/v1/customers, the same source the
   * Customers tab displays. Refreshing keeps the picker in step after a sale
   * or a new customer without any extra per-customer requests.
   */
  const refreshCustomers = useCallback(async () => {
    try {
      setCustomers(await fetchCustomers());
    } catch {
      // Keep the current list; cash sales do not require customer data.
    }
  }, []);

  useEffect(() => {
    let ignore = false;

    async function loadInitialData() {
      setLoadingData(true);
      setPageError(null);
      const [productsRes, customersRes] = await Promise.allSettled([
        fetchProducts({ limit: 100 }),
        fetchCustomers(),
      ]);
      if (ignore) return;

      if (productsRes.status === 'rejected') {
        const err = productsRes.reason;
        setPageError(
          err instanceof ApiError
            ? err.message
            : 'Unable to connect. Check your connection and try again.',
        );
        setLoadingData(false);
        return;
      }
      setProducts(productsRes.value);

      if (customersRes.status === 'fulfilled') {
        setCustomers(customersRes.value);
      }
      // A failed customer list is non-blocking: cash sales need no customer.
      // The select simply stays empty until reload.

      setLoadingData(false);
    }

    loadInitialData();

    return () => {
      ignore = true;
    };
  }, []);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  const activeCustomers = useMemo(
    () => customers.filter((c) => c.active),
    [customers],
  );

  const selectedCustomer = useMemo(
    () => activeCustomers.find((c) => c.id === customerId) ?? null,
    [activeCustomers, customerId],
  );

  // Client-side product search; the backend has no free-text search parameter.
  const searchResults = useMemo(() => {
    const query = searchTerm.trim();
    if (!query) return [];
    return products
      .filter(
        (p) =>
          p.active &&
          matchesSearch([p.name, p.size ?? ''].join(' '), query),
      )
      .slice(0, 8);
  }, [products, searchTerm]);

  // Cart lines joined with product data and priced like the backend.
  const lines = useMemo(() => {
    return items.flatMap((item) => {
      const product = productMap.get(item.productId);
      if (!product) return [];

      const unitPrice = item.unitPrice;
      const lineTotalKobo = toKobo(unitPrice) * BigInt(item.quantity);

      return [
        {
          ...item,
          product,
          unitPrice,
          lineTotalKobo,
          packsRequired: packsForQuantity(product, item.unit, item.quantity),
        },
      ];
    });
  }, [items, productMap]);

  // Total packs demanded per product across all lines.
  const packsDemandedByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of lines) {
      map.set(
        line.productId,
        (map.get(line.productId) ?? 0) + line.packsRequired,
      );
    }
    return map;
  }, [lines]);

  const totalKobo = useMemo(
    () => lines.reduce((sum, line) => sum + line.lineTotalKobo, 0n),
    [lines],
  );

  const linePriceIssues = lines.some((line) => !AMOUNT_PAID_PATTERN.test(line.unitPrice) || toKobo(line.unitPrice || '0') < toKobo(minimumUnitPrice(line.product, line.unit)));
  const amountPaidTrimmed = amountPaid.trim();
  // An empty field means nothing is paid yet, which the backend accepts as "0".
  const amountPaidValid =
    amountPaidTrimmed === '' || AMOUNT_PAID_PATTERN.test(amountPaidTrimmed);
  const amountPaidKobo = amountPaidValid
    ? toKobo(amountPaidTrimmed === '' ? '0' : amountPaidTrimmed)
    : null;
  const balanceKobo =
    amountPaidKobo !== null ? totalKobo - amountPaidKobo : null;
  const isCreditSale = balanceKobo !== null && balanceKobo > 0n;
  const amountPaidExceedsTotal =
    amountPaidKobo !== null && amountPaidKobo > totalKobo;

  /*
   * The backend requires `method` to be `cash` and `reference` to be empty
   * when nothing is paid, so the payment controls are locked in that case.
   */
  const isNothingPaid = amountPaidKobo === 0n;
  const effectiveMethod: PaymentMethod = isNothingPaid ? 'cash' : method;
  const effectiveReference = isNothingPaid ? '' : reference.trim();

  const stockIssues = useMemo(() => {
    const issues: string[] = [];
    for (const [productId, demanded] of packsDemandedByProduct.entries()) {
      const product = productMap.get(productId);
      if (product && !hasStockForQuantity(product, 'Pack', demanded)) {
        issues.push(
          `Not enough stock for ${product.name}: ${demanded} packs requested, ${product.stockPacks} available.`,
        );
      }
    }
    return issues;
  }, [packsDemandedByProduct, productMap]);

  const resetForNextSale = () => {
    setItems([]);
    setSearchTerm('');
    setCustomerId('');
    setAmountPaid('');
    setMethod('cash');
    setReference('');
    setSubmitError(null);
    setConflictMessage(null);
    setResult(null);
    requestIdRef.current = null;
    void refreshCustomers();
  };

  const refreshProducts = async () => {
    try {
      const fresh = await fetchProducts({ limit: 100 });
      setProducts(fresh);
    } catch {
      // Keep the current stock display; the user can reload the page.
    }
  };

  const handleAddItem = (product: Product) => {
    setSubmitError(null);
    setConflictMessage(null);
    setSearchTerm('');

    setItems((prev) => {
      if (prev.length >= MAX_ITEMS) {
        setSubmitError(
          `A sale can contain at most ${MAX_ITEMS} lines. Remove a line before adding another.`,
        );
        return prev;
      }

      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        const availableQuantity = maxSaleQuantity(product, existing.unit);
        if (existing.quantity >= availableQuantity) return prev;
        return prev.map((item) =>
          item === existing
            ? { ...item, quantity: Math.min(MAX_QUANTITY, availableQuantity, item.quantity + 1) }
            : item,
        );
      }

      if (product.stockPacks < 1) return prev;
      return [...prev, { productId: product.id, unit: 'Pack', quantity: 1, unitPrice: product.retailPrice }];
    });
  };

  const handleChangeQuantity = (index: number, quantity: number) => {
    setSubmitError(null);
    setConflictMessage(null);
    // Guard against a cleared input producing NaN.
    const safeQuantity = Number.isFinite(quantity) ? quantity : 1;
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? (() => {
              const product = productMap.get(item.productId);
              if (!product) return item;
              return {
              ...item,
              quantity: Math.max(
                1,
                Math.min(MAX_QUANTITY, maxSaleQuantity(product, item.unit), Math.floor(safeQuantity)),
              ),
              };
            })()
          : item,
      ),
    );
  };

  const handleChangeUnit = (index: number, unit: SaleUnit) => {
    setSubmitError(null);
    setConflictMessage(null);
    setItems((prev) => prev.map((item, itemIndex) => {
      if (itemIndex !== index) return item;
      const product = productMap.get(item.productId);
      if (!product || (!isSaleUnitAvailable(product, unit) || maxSaleQuantity(product, unit) < 1)) return item;
      return { ...item, unit, unitPrice: defaultUnitPrice(product, unit) };
    }));
  };

  const handleRemoveItem = (index: number) => {
    setSubmitError(null);
    setConflictMessage(null);
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCustomerChange = (nextCustomerId: string | null) => {
    setCustomerId(nextCustomerId ?? '');
    setSubmitError(null);
    setConflictMessage(null);
  };

  const handleCustomerCreated = (customer: Customer) => {
    // The customer is new, so the backend balance is zero until a sale exists.
    // The follow-up refresh replaces this optimistic row with server data.
    const listItem: CustomerListItem = {
      ...customer,
      balance: '0.00',
      lastSaleAt: null,
      totalPurchases: '0.00',
    };
    setCustomers((current) => [
      listItem,
      ...current.filter((entry) => entry.id !== customer.id),
    ]);
    setCustomerId(customer.id);
    setSubmitError(null);
    setConflictMessage(null);
    void refreshCustomers();
  };

  const validateForSubmit = (): string | null => {
    if (lines.length === 0) {
      return 'Add at least one item to record a sale.';
    }
    if (lines.some((line) => !Number.isInteger(line.quantity) || line.quantity < 1)) {
      return 'Every item needs a whole quantity of at least 1.';
    }
    if (linePriceIssues) return 'Enter a valid unit price at or above the configured minimum for every item.';
    if (stockIssues.length > 0) {
      return stockIssues[0];
    }
    if (amountPaidTrimmed !== '' && !amountPaidValid) {
      return 'Amount paid must be a whole Naira amount with at most 2 decimal places.';
    }
    if (amountPaidExceedsTotal) {
      return 'Amount paid cannot exceed the sale total.';
    }
    if (isCreditSale && !customerId) {
      return 'Select a customer for a sale with an unpaid balance.';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setConflictMessage(null);

    const validationError = validateForSubmit();
    if (validationError) {
      setSubmitError(validationError);
      return;
    }

    const payload = JSON.stringify({
      items: lines
        .map((line) => ({
          productId: line.productId,
          unit: line.unit,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        }))
        .sort(
          (a, b) =>
            a.productId.localeCompare(b.productId) || a.unit.localeCompare(b.unit),
        ),
      customerId: customerId || null,
      amountPaid: amountPaidTrimmed || '0',
      method: effectiveMethod,
      reference: effectiveReference || null,
    });

    if (!requestIdRef.current || requestIdRef.current.payload !== payload) {
      requestIdRef.current = { id: crypto.randomUUID(), payload };
    }

    setSubmitting(true);
    try {
      const saleResult = await createSale({
        requestId: requestIdRef.current.id,
        customerId: customerId || undefined,
        amountPaid: amountPaidTrimmed || '0',
        method: effectiveMethod,
        reference: effectiveReference || undefined,
        items: lines.map((line) => ({
          productId: line.productId,
          unit: line.unit,
          quantity: line.quantity,
          unitPrice: line.unitPrice,
        })),
      });

      // Only clear the idempotency key once the backend confirms success.
      requestIdRef.current = null;
      setResult(saleResult);
      // Stock and customer balances changed; refresh both for the next sale.
      refreshProducts();
      void refreshCustomers();
    } catch (err: unknown) {
      const apiErr = err instanceof ApiError ? err : null;
      if (apiErr?.status === 409) {
        // Insufficient stock, inactive product, or an idempotency conflict.
        setConflictMessage(apiErr.message);
        refreshProducts();
      } else if (apiErr?.status === 404) {
        setSubmitError(
          'A product or customer in this sale no longer exists. Refresh the page and try again.',
        );
      } else if (apiErr?.status === 403) {
        setSubmitError('Forbidden: only active staff and owners can record sales.');
      } else {
        setSubmitError(
          apiErr?.message || 'Unable to record the sale. Check your connection and try again.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingData) {
    return (
      <div className="space-y-6 max-w-6xl animate-pulse">
        <div className="space-y-2">
          <div className="h-8 w-56 bg-[color:var(--color-subtle)] rounded-[4px]" />
          <div className="h-4 w-80 bg-[color:var(--color-subtle)] rounded-[4px]" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_336px] gap-6 items-start">
          <div className="space-y-6">
            <div className="h-64 rounded-[12px] bg-[color:var(--color-subtle)]" />
            <div className="h-72 rounded-[12px] bg-[color:var(--color-subtle)]" />
          </div>
          <div className="h-80 rounded-[12px] bg-[color:var(--color-subtle)]" />
        </div>
      </div>
    );
  }

  if (pageError) {
    return (
      <div className="max-w-md mx-auto mt-12 p-6 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-center space-y-3">
        <AlertCircleIcon className="mx-auto text-[color:var(--color-danger-ink)]" size={32} />
        <h2 className="text-base font-semibold text-[color:var(--color-ink)]">
          Unable to Load the Sale Screen
        </h2>
        <p className="text-xs text-[color:var(--color-muted)]">{pageError}</p>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[8px] font-semibold text-xs bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors"
        >
          <RefreshCwIcon size={14} />
          Retry
        </button>
      </div>
    );
  }

  // Success state
  if (result) {
    const paid = result.payment[0]?.amount ?? '0.00';
    const balanceKoboResult = toKobo(result.sale.itemsTotal) - toKobo(paid);
    const customer = customers.find((c) => c.id === result.sale.customerId);

    return (
      <div className="space-y-6 max-w-2xl pb-12">
        <div className="p-6 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] space-y-5">
          <div className="flex items-start gap-3">
            <CheckCircleIcon
              className="text-[color:var(--color-success-ink)] shrink-0 mt-0.5"
              size={24}
            />
            <div>
              <h1 className="text-xl font-bold text-[color:var(--color-ink)]">
                Sale recorded
              </h1>
              <p className="text-sm text-[color:var(--color-muted)]">
                Stock has been deducted and the sale is in the sales history.
                {result.replayed
                  ? ' This submission matched an earlier one, so the original sale was returned.'
                  : ''}
              </p>
            </div>
          </div>

          <dl className="divide-y divide-[color:var(--color-border)] text-sm">
            <div className="flex justify-between py-2.5">
              <dt className="text-[color:var(--color-muted)]">Items</dt>
              <dd className="font-semibold text-[color:var(--color-ink)]">
                {result.items.length}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-[color:var(--color-muted)]">Total</dt>
              <dd className="font-semibold text-[color:var(--color-ink)]">
                {formatNaira(result.sale.itemsTotal)}
              </dd>
            </div>
            <div className="flex justify-between py-2.5">
              <dt className="text-[color:var(--color-muted)]">Amount paid</dt>
              <dd className="font-semibold text-[color:var(--color-ink)]">
                {formatNaira(paid)}
              </dd>
            </div>
            {result.payment[0] && (
              <div className="flex justify-between py-2.5">
                <dt className="text-[color:var(--color-muted)]">Method</dt>
                <dd className="font-semibold text-[color:var(--color-ink)]">
                  {result.payment[0].method === 'cash'
                    ? 'Cash'
                    : result.payment[0].method === 'transfer'
                      ? 'Bank transfer'
                      : 'POS'}
                  {result.payment[0].reference
                    ? ` · ${result.payment[0].reference}`
                    : ''}
                </dd>
              </div>
            )}
            <div className="flex justify-between py-2.5">
              <dt className="text-[color:var(--color-muted)]">Balance owed</dt>
              <dd
                className={`font-semibold ${
                  balanceKoboResult > 0n
                    ? 'text-[color:var(--color-danger-ink)]'
                    : 'text-[color:var(--color-ink)]'
                }`}
              >
                {formatNaira(fromKobo(balanceKoboResult > 0n ? balanceKoboResult : 0n))}
              </dd>
            </div>
            {customer && (
              <div className="flex justify-between py-2.5">
                <dt className="text-[color:var(--color-muted)]">Customer</dt>
                <dd className="font-semibold text-[color:var(--color-ink)]">
                  {customer.name}
                </dd>
              </div>
            )}
          </dl>

          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={resetForNextSale}
              className="h-10 px-4 rounded-[8px] font-semibold text-xs bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors"
            >
              Record another sale
            </button>
            <Link
              to="/movements"
              className="inline-flex items-center justify-center h-10 px-4 rounded-[8px] font-semibold text-xs border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors"
            >
              View stock movements
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* Heading */}
      <div className="space-y-2">
        <h1 className="text-2xl lg:text-[32px] font-bold tracking-tight text-[color:var(--color-ink)]">
          Record a sale
        </h1>
        <p className="text-sm text-[color:var(--color-muted)]">
          Sell packs or bags from the same stock balance.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Left column: items + customer & payment */}
        <div className="space-y-6">
          {/* Items */}
          <section className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 space-y-4">
            <h2 className="text-lg font-bold text-[color:var(--color-ink)]">Items in this sale</h2>

            {/* Product search */}
              <div className="space-y-1.5">
              <label
                htmlFor="sale-product-search"
                className="block text-xs font-semibold text-[color:var(--color-ink)]"
              >
                Find a product
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[color:var(--color-muted)]">
                  <SearchIcon size={18} />
                </div>
                <input
                  id="sale-product-search"
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search product name or size"
                  autoComplete="off"
                  className="w-full h-11 pl-10 pr-4 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] focus:outline-none focus:border-[color:var(--color-accent)] placeholder:text-[color:var(--color-muted)]"
                />
              </div>

              {/* Search results */}
              {searchTerm.trim() && (
                <div className="max-h-64 overflow-y-auto overscroll-contain rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
                  {searchResults.length === 0 ? (
                    <p className="px-4 py-3 text-xs text-[color:var(--color-muted)]">
                      No products found
                    </p>
                  ) : (
                    searchResults.map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        aria-label={p.stockPacks > 0 ? `Add ${p.name} to sale` : `${p.name}, out of stock`}
                        disabled={p.stockPacks === 0}
                        onClick={() => handleAddItem(p)}
                        className={`group w-full flex items-center justify-between gap-3 px-4 py-3 text-left border-b border-[color:var(--color-border)] last:border-b-0 transition-colors ${p.stockPacks > 0 ? 'hover:bg-[color:var(--color-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--color-accent)]' : 'opacity-70 cursor-not-allowed'}`}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[color:var(--color-ink)] line-clamp-2 break-words">
                            {p.name}
                            {p.size ? ` · ${p.size}` : ''}
                          </p>
                          <p className={`text-xs mt-1 ${p.stockPacks === 0 ? 'text-[color:var(--color-danger-ink)]' : p.stockPacks <= 5 ? 'text-[color:var(--color-warning-ink)]' : 'text-[color:var(--color-muted)]'}`}>
                            {p.stockPacks === 0 ? 'Out of stock' : `${formatNaira(p.retailPrice)}/pack · ${p.stockPacks} left`}
                          </p>
                        </div>
                        <span aria-hidden="true" className="w-10 h-10 shrink-0 rounded-full inline-flex items-center justify-center bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] group-disabled:bg-[color:var(--color-subtle)] group-disabled:text-[color:var(--color-muted)]"><PlusIcon size={20} /></span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Cart lines */}
            {lines.length === 0 ? (
              <p className="py-8 text-center text-sm text-[color:var(--color-muted)]">
                No items yet. Search for a product above to add it to the sale.
              </p>
            ) : (
              <div className="space-y-3">
                {lines.map((line, index) => {
                  const insufficient =
                    (packsDemandedByProduct.get(line.productId) ?? 0) >
                    line.product.stockPacks;

                  return (
                    <div
                      key={`${line.productId}-${line.unit}`}
                      className="rounded-[12px] border border-[color:var(--color-border)] p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[color:var(--color-ink)] break-words">{line.product.name}{line.product.size ? ` · ${line.product.size}` : ''}</p>
                          <p className="text-xs text-[color:var(--color-muted)] mt-1">{line.unit === 'Bag' ? `${formatNaira(line.unitPrice)} per bag` : `${formatNaira(line.unitPrice)} each`} · {line.product.stockPacks} packs available</p>
                          {line.product.costPerPack === null && <p role="status" className="mt-1 text-xs font-medium text-[color:var(--color-warning-ink)]">Acquisition cost missing. An owner will need to review this sale before profit is available.</p>}
                        </div>
                        <button type="button" aria-label={`Remove ${line.product.name}`} onClick={() => handleRemoveItem(index)} className="w-10 h-10 shrink-0 inline-flex items-center justify-center rounded-full text-[color:var(--color-muted)] hover:bg-[color:var(--color-subtle)] hover:text-[color:var(--color-danger-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--color-accent)]"><TrashIcon size={18} /></button>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <div className="inline-flex rounded-[8px] border border-[color:var(--color-border)] p-1 bg-[color:var(--color-subtle)]">
                          {(['Pack', 'Half Bag', 'Bag'] as const).filter((unit) => isSaleUnitAvailable(line.product, unit)).map((unit) => {
                            const disabled = maxSaleQuantity(line.product, unit) < 1;
                            return <button key={unit} type="button" disabled={disabled} aria-pressed={line.unit === unit} onClick={() => handleChangeUnit(index, unit)} className={`min-h-[36px] px-3 rounded-[6px] text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed ${line.unit === unit ? 'bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)]' : 'text-[color:var(--color-ink)]'}`}>{unit}</button>;
                          })}
                        </div>
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            aria-label={`Decrease quantity of ${line.product.name}`}
                            onClick={() => handleChangeQuantity(index, line.quantity - 1)}
                            disabled={line.quantity <= 1}
                            className="w-[34px] h-[34px] rounded-[8px] border border-[color:var(--color-border)] flex items-center justify-center text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors disabled:opacity-40"
                          >
                            <MinusIcon size={16} />
                          </button>
                          <span aria-label={`Quantity of ${line.product.name} in ${unitLabel(line.unit)}s`} className="min-w-8 text-center text-sm font-semibold text-[color:var(--color-ink)]">{line.quantity}</span>
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            onClick={() => handleChangeQuantity(index, line.quantity + 1)}
                            disabled={line.quantity >= maxSaleQuantity(line.product, line.unit)}
                            className="w-[34px] h-[34px] rounded-[8px] border border-[color:var(--color-border)] flex items-center justify-center text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <PlusIcon size={16} />
                          </button>
                        </div>
                      </div>
                      <label className="block text-xs font-medium text-[color:var(--color-ink)]">Agreed unit price (₦) · minimum {formatNaira(minimumUnitPrice(line.product, line.unit))}<input inputMode="decimal" value={line.unitPrice} onChange={(event) => setItems((current) => current.map((entry, entryIndex) => entryIndex === index ? { ...entry, unitPrice: event.target.value } : entry))} className="mt-1 h-10 w-full rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-canvas)] px-3" aria-label={`Agreed unit price for ${line.product.name}`} /></label>
                      {toKobo(line.unitPrice || '0') < toKobo(minimumUnitPrice(line.product, line.unit)) && <p role="alert" className="text-xs text-[color:var(--color-danger-ink)]">Price is below the configured minimum.</p>}
                      {line.unitPrice !== defaultUnitPrice(line.product, line.unit) && <p className="text-xs text-[color:var(--color-warning-ink)]">Negotiated price</p>}
                      {maxSaleQuantity(line.product, 'Bag') < 1 && <p className="text-xs text-[color:var(--color-muted)]">Not enough packs for a bag.</p>}
                      <p className={`text-right text-sm font-bold ${insufficient ? 'text-[color:var(--color-danger-ink)]' : 'text-[color:var(--color-ink)]'}`}>{formatNaira(fromKobo(line.lineTotalKobo))}</p>
                    </div>
                  );
                })}
                <div className="flex items-center justify-between border-t border-[color:var(--color-border)] pt-4"><span className="text-sm font-semibold text-[color:var(--color-ink)]">Total</span><span className="text-xl font-bold text-[color:var(--color-ink)]">{formatNaira(fromKobo(totalKobo))}</span></div>
              </div>
            )}
          </section>

          {/* Customer & payment */}
          <section className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 space-y-4">
            <h2 className="text-lg font-bold text-[color:var(--color-ink)]">
              Customer &amp; payment
            </h2>

            <div className="space-y-1.5">
              <label
                htmlFor="sale-customer"
                className="block text-xs font-semibold text-[color:var(--color-ink)]"
              >
                Customer
              </label>
              <CustomerPicker
                id="sale-customer"
                customers={activeCustomers}
                value={customerId || null}
                onChange={handleCustomerChange}
                onAddCustomer={() => setShowAddCustomer(true)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="sale-amount-paid"
                  className="block text-xs font-semibold text-[color:var(--color-ink)]"
                >
                  Amount paid now (₦)
                </label>
                <input
                  id="sale-amount-paid"
                  type="text"
                  inputMode="decimal"
                  value={amountPaid}
                  onChange={(e) => {
                    setAmountPaid(e.target.value);
                    setSubmitError(null);
                    setConflictMessage(null);
                  }}
                  className="w-full h-11 px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] focus:outline-none focus:border-[color:var(--color-accent)]"
                  placeholder="0"
                />
                {amountPaidTrimmed !== '' && !amountPaidValid && (
                  <p className="text-[11px] text-[color:var(--color-danger-ink)]">
                    Whole Naira with at most 2 decimal places.
                  </p>
                )}
                {amountPaidExceedsTotal && (
                  <p className="text-[11px] text-[color:var(--color-danger-ink)]">
                    Amount paid cannot exceed the sale total.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="sale-total"
                  className="block text-xs font-semibold text-[color:var(--color-ink)]"
                >
                  Total sale (₦)
                </label>
                <input
                  id="sale-total"
                  type="text"
                  readOnly
                  value={fromKobo(totalKobo)}
                  className="w-full h-11 px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-subtle)] text-sm text-[color:var(--color-quiet)] focus:outline-none cursor-default"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="sale-method"
                  className="block text-xs font-semibold text-[color:var(--color-ink)]"
                >
                  Payment method
                </label>
                <SheetSelect
                  id="sale-method"
                  label="Payment method"
                  value={effectiveMethod}
                  disabled={isNothingPaid}
                  options={[
                    { value: 'cash', label: 'Cash' },
                    { value: 'transfer', label: 'Bank transfer' },
                    { value: 'pos', label: 'POS' },
                  ]}
                  onChange={(value) => {
                    setMethod(value as PaymentMethod);
                    setSubmitError(null);
                  }}
                />
                {isNothingPaid && (
                  <p className="text-[11px] text-[color:var(--color-muted)]">
                    No payment yet, so the method is recorded as cash.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <label
                  htmlFor="sale-reference"
                  className="block text-xs font-semibold text-[color:var(--color-ink)]"
                >
                  Payment reference (optional)
                </label>
                <input
                  id="sale-reference"
                  type="text"
                  value={isNothingPaid ? '' : reference}
                  disabled={isNothingPaid}
                  maxLength={200}
                  onChange={(e) => {
                    setReference(e.target.value);
                    setSubmitError(null);
                  }}
                  placeholder="Transfer id or POS slip"
                  className="w-full h-11 px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] focus:outline-none focus:border-[color:var(--color-accent)] disabled:bg-[color:var(--color-subtle)] disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <p className="text-xs text-[color:var(--color-muted)]">
              A named customer is required when a balance remains.
            </p>
          </section>
        </div>

        {/* Right column: sale summary (or save-blocked panel on conflict) */}
        <aside className="lg:sticky lg:top-6">
          {conflictMessage ? (
            <div className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 space-y-3">
              <h2 className="text-lg font-bold text-[color:var(--color-ink)]">
                Save blocked
              </h2>
              <p className="text-sm text-[color:var(--color-muted)]">
                {conflictMessage === 'Insufficient stock' ||
                conflictMessage.toLowerCase().includes('insufficient stock')
                  ? 'Refresh stock, then review the sale. No sale or payment has been recorded.'
                  : `${conflictMessage} No sale or payment has been recorded.`}
              </p>
              <button
                type="button"
                onClick={() => {
                  setConflictMessage(null);
                  refreshProducts();
                }}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-[8px] font-semibold text-xs bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors"
              >
                <RefreshCwIcon size={14} />
                Refresh stock
              </button>
            </div>
          ) : (
            <div className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 space-y-4">
              <h2 className="text-lg font-bold text-[color:var(--color-ink)]">
                Sale summary
              </h2>

              <dl className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[color:var(--color-muted)]">Items</dt>
                  <dd className="font-semibold text-[color:var(--color-ink)]">
                    {lines.length}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[color:var(--color-muted)]">Total</dt>
                  <dd className="font-semibold text-[color:var(--color-ink)]">
                    {formatNaira(fromKobo(totalKobo))}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[color:var(--color-muted)]">Amount paid</dt>
                  <dd className="font-semibold text-[color:var(--color-ink)]">
                    {amountPaidKobo !== null
                      ? formatNaira(fromKobo(amountPaidKobo))
                      : '—'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[color:var(--color-muted)]">Balance owed</dt>
                  <dd
                    className={`font-semibold ${
                      isCreditSale
                        ? 'text-[color:var(--color-danger-ink)]'
                        : 'text-[color:var(--color-ink)]'
                    }`}
                  >
                    {balanceKobo !== null
                      ? formatNaira(fromKobo(balanceKobo > 0n ? balanceKobo : 0n))
                      : '—'}
                  </dd>
                </div>
              </dl>

              <div className="pt-3 border-t border-[color:var(--color-border)] space-y-1.5">
                <p className="text-xs font-semibold text-[color:var(--color-ink)]">
                  {isCreditSale ? 'Credit sale' : 'Cash sale'}
                </p>
                {selectedCustomer && (
                  <p className="text-xs text-[color:var(--color-muted)]">
                    Customer: {selectedCustomer.name}
                  </p>
                )}
                <p className="text-xs text-[color:var(--color-muted)]">
                  A saved sale deducts stock and records the customer balance.
                </p>
              </div>

              {submitError && (
                <div className="p-3 rounded-[8px] bg-[color:var(--color-danger-bg)] border border-[color:var(--color-border)] text-xs font-medium text-[color:var(--color-danger-ink)] flex items-start gap-2">
                  <AlertCircleIcon size={14} className="shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-11 rounded-[8px] font-semibold text-sm bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors disabled:opacity-50"
              >
                {submitting ? 'Saving…' : 'Save sale'}
              </button>
            </div>
          )}
        </aside>
      </form>

      {showAddCustomer && (
        <AddCustomerModal
          onClose={() => setShowAddCustomer(false)}
          onCreated={handleCustomerCreated}
        />
      )}
    </div>
  );
}
