import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchSale } from '../../lib/api/sales';
import { fetchCustomer, fetchCustomerStatement } from '../../lib/api/customers';
import { ApiError } from '../../lib/api/client';
import {
  formatLongDate,
  formatMovementDate,
  formatNaira,
} from '../../lib/utils/format';
import { toKobo } from '../../lib/utils/money';
import type { Customer, CustomerStatement, StatementSale } from '../../types/customer';
import {
  normalisePaymentStatus,
  type Payment,
  type PaymentMethod,
  type PaymentStatus,
  type SaleDetail,
  type SaleItem,
} from '../../types/sale';
import { RecordRepaymentModal } from '../../components/customers/RecordRepaymentModal';
import { BackNavigation } from '../../components/ui/BackNavigation';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  RefreshCwIcon,
  WalletIcon,
  XIcon,
} from '../../components/ui/Icons';

interface LoadError {
  message: string;
  status?: number;
}

interface RepaymentSuccess {
  amount: string;
  saleId: string;
}

function unitLabel(unit: SaleItem['unit']): string {
  return unit === 'Bag' ? 'Bag' : 'Pack';
}

function methodLabel(method: PaymentMethod): string {
  if (method === 'cash') return 'Cash';
  if (method === 'transfer') return 'Transfer';
  return 'POS';
}

/**
 * Payments are the source of truth for this sale: the detail endpoint returns
 * every payment, so paid, balance and status are derived here without a
 * customer statement.
 */
function summariseSale(sale: SaleDetail) {
  const totalKobo = toKobo(sale.itemsTotal);
  const paidKobo = sale.payments.reduce(
    (sum, payment) => sum + toKobo(payment.amount),
    0n,
  );
  const balanceKobo = totalKobo > paidKobo ? totalKobo - paidKobo : 0n;
  const rawStatus =
    paidKobo === 0n ? 'UNPAID' : paidKobo >= totalKobo ? 'PAID' : 'PART_PAID';

  return {
    totalKobo,
    paidKobo,
    balanceKobo,
    status: normalisePaymentStatus(rawStatus) as PaymentStatus,
  };
}

export function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [statement, setStatement] = useState<CustomerStatement | null>(null);
  const [openingRepayment, setOpeningRepayment] = useState(false);
  const [repaymentError, setRepaymentError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!id);
  const [error, setError] = useState<LoadError | null>(
    id ? null : { message: 'No sale was selected.' },
  );
  const [reloadKey, setReloadKey] = useState(0);
  const [repaymentOpen, setRepaymentOpen] = useState(false);
  const [success, setSuccess] = useState<RepaymentSuccess | null>(null);

  useEffect(() => {
    let ignore = false;
    if (!id) return;

    async function load() {
      try {
        const saleResult = await fetchSale(id as string);
        if (ignore) return;
        setSale(saleResult);
        setError(null);

        if (saleResult.customerId) {
          try {
            const customerResult = await fetchCustomer(saleResult.customerId);
            if (!ignore) setCustomer(customerResult);
          } catch {
            // The customer name is a convenience; the sale still renders.
            if (!ignore) setCustomer(null);
          }
        } else {
          setCustomer(null);
        }
      } catch (err: unknown) {
        if (ignore) return;
        if (err instanceof ApiError) {
          setError({ message: err.message, status: err.status });
        } else {
          setError({
            message:
              'Unable to connect to the backend server. Check that it is running and try again.',
          });
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();
    return () => {
      ignore = true;
    };
  }, [id, reloadKey]);

  const retry = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadKey((key) => key + 1);
  }, []);

  const totals = useMemo(() => (sale ? summariseSale(sale) : null), [sale]);

  const outstandingSales = useMemo<StatementSale[]>(
    () => statement?.sales.filter((candidate) => toKobo(candidate.balanceDue) > 0n) ?? [],
    [statement],
  );

  const canRepay =
    sale !== null &&
    sale.customerId !== null &&
    totals !== null &&
    totals.balanceKobo > 0n;

  const customerName = sale?.customerId
    ? customer?.name ?? `Customer #${sale.customerId.slice(0, 8)}`
    : 'Walk-in customer';

  async function openRepayment() {
    if (!sale?.customerId || openingRepayment) return;
    setOpeningRepayment(true);
    setRepaymentError(null);
    try {
      const statementResult = await fetchCustomerStatement(sale.customerId);
      setStatement(statementResult);
      setRepaymentOpen(true);
    } catch (err: unknown) {
      setRepaymentError(
        err instanceof ApiError
          ? err.message
          : 'Unable to load this customer’s outstanding sales.',
      );
    } finally {
      setOpeningRepayment(false);
    }
  }

  function handleRecorded(amount: string, saleId: string) {
    setSuccess({ amount, saleId });
    setStatement(null);
    setReloadKey((key) => key + 1);
  }

  if (loading) {
    return <SaleDetailSkeleton />;
  }

  if (error || !sale || !totals) {
    const isNotFound = error?.status === 404;
    const isForbidden = error?.status === 401 || error?.status === 403;

    return (
      <div className="space-y-4">
        <BackToSales />
        <div className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6">
          <div className="flex items-start gap-3">
            <AlertCircleIcon className="text-[color:var(--color-danger-ink)] shrink-0 mt-0.5" size={22} />
            <div className="flex-1">
              <h1 className="text-lg font-bold text-[color:var(--color-ink)]">
                {isNotFound
                  ? 'Sale not found'
                  : isForbidden
                    ? 'Staff access required'
                    : 'Unable to load sale'}
              </h1>
              <p className="text-sm text-[color:var(--color-muted)] mt-1">
                {isNotFound
                  ? 'This sale may not exist, or the link is incorrect.'
                  : isForbidden
                    ? 'Viewing sales requires staff authorization. Sign in with a staff account.'
                    : error?.message}
              </p>
              {!isNotFound && !isForbidden && (
                <button
                  type="button"
                  onClick={retry}
                  className="mt-4 inline-flex items-center gap-1.5 h-9 px-3 rounded-[8px] border border-[color:var(--color-border)] text-xs font-semibold text-[color:var(--color-ink)] bg-[color:var(--color-surface)] hover:bg-[color:var(--color-subtle)] transition-colors"
                >
                  <RefreshCwIcon size={14} />
                  Retry
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const statusMeta = statusPresentation(totals.status);

  return (
    <div className="space-y-6">
      <BackToSales />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl lg:text-[32px] font-bold tracking-tight text-[color:var(--color-ink)]">
              {sale.saleNumber}
            </h1>
            <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
          </div>
          <p className="text-sm text-[color:var(--color-muted)] mt-1">
            {formatLongDate(sale.soldAt)} · {customerName}
          </p>
        </div>
        {canRepay && (
          <button
            type="button"
            onClick={() => void openRepayment()}
            disabled={openingRepayment}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[8px] font-semibold text-sm bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <WalletIcon size={16} />
            {openingRepayment ? 'Loading…' : 'Record repayment'}
          </button>
        )}
      </div>

      {success && (
        <div
          role="status"
          className="p-4 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-success-bg)]"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <CheckCircleIcon size={20} className="text-[color:var(--color-success-ink)] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-[color:var(--color-success-ink)]">
                  Repayment recorded
                </p>
                <p className="text-xs text-[color:var(--color-muted)] mt-1">
                  {formatNaira(success.amount)} applied to this sale. The summary below has
                  been reloaded from the backend.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSuccess(null)}
              aria-label="Dismiss"
              className="text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
            >
              <XIcon size={16} />
            </button>
          </div>
        </div>
      )}

      {repaymentError && (
        <div className="p-4 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-warning-bg)]">
          <div className="flex items-start gap-3">
            <AlertCircleIcon size={18} className="text-[color:var(--color-warning-ink)] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-[color:var(--color-warning-ink)]">
                Could not open repayment
              </p>
              <p className="text-xs text-[color:var(--color-muted)] mt-1">{repaymentError}</p>
            </div>
            <button
              type="button"
              onClick={() => setRepaymentError(null)}
              aria-label="Dismiss"
              className="text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)]"
            >
              <XIcon size={16} />
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <aside className="space-y-4 lg:order-2">
          <div className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5">
            <p className="text-xs font-semibold text-[color:var(--color-muted)]">Sale summary</p>
            <div className="mt-3 space-y-2.5">
              <SummaryRow label="Items" value={String(sale.items.length)} />
              <SummaryRow label="Total" value={formatNaira(sale.itemsTotal)} strong />
              <SummaryRow label="Amount paid" value={formatNaira(String(totals.paidKobo / 100n))} />
              <SummaryRow
                label="Balance owed"
                value={formatNaira(String(totals.balanceKobo / 100n))}
                strong
                tone={totals.balanceKobo > 0n ? 'danger' : 'success'}
              />
              <SummaryRow
                label="Payment type"
                value={
                  totals.status === 'PAID'
                    ? 'Paid in full'
                    : totals.status === 'PART_PAID'
                      ? 'Partly paid'
                      : 'Credit sale'
                }
              />
            </div>
            <div className="border-t border-[color:var(--color-border)] mt-4 pt-3">
              <p className="text-[11px] text-[color:var(--color-muted)]">Customer</p>
              <p className="text-sm font-semibold text-[color:var(--color-ink)] mt-1">
                {customerName}
              </p>
            </div>
          </div>

          <div className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 space-y-3">
            <p className="text-xs font-semibold text-[color:var(--color-muted)]">Customer details</p>
            {!sale.customerId ? (
              <p className="text-xs text-[color:var(--color-muted)]">
                No customer was attached to this sale.
              </p>
            ) : (
              <>
                <SummaryRow label="Name" value={customerName} />
                <SummaryRow label="Phone" value={customer?.phone || '—'} />
                <Link
                  to={`/customers/${sale.customerId}`}
                  className="inline-flex text-xs font-semibold text-[color:var(--color-accent-ink)] hover:underline underline-offset-2"
                >
                  View customer
                </Link>
              </>
            )}
          </div>
        </aside>

        <div className="space-y-6 lg:order-1">
          <section className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[color:var(--color-border)]">
              <h2 className="text-sm font-bold text-[color:var(--color-ink)]">Items</h2>
              <p className="text-xs text-[color:var(--color-muted)] mt-1">
                Product names, quantities and prices are saved snapshots from the sale.
              </p>
            </div>

            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[color:var(--color-subtle)] border-b border-[color:var(--color-border)]">
                    <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">Product</th>
                    <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">Quantity</th>
                    <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">Unit price</th>
                    <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)] text-right">Line total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[color:var(--color-border)]">
                  {sale.items.map((item) => (
                    <tr key={item.id}>
                      <td className="py-3 px-4 text-sm font-semibold text-[color:var(--color-ink)]">
                        {item.productName}
                      </td>
                      <td className="py-3 px-4 text-sm text-[color:var(--color-muted)]">
                        {item.quantity} × {unitLabel(item.unit)}
                        {item.unit === 'Bag' && (
                          <span className="block text-xs text-[color:var(--color-quiet)]">
                            {item.packsPerUnit} packs each
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-sm text-[color:var(--color-muted)]">
                        {formatNaira(item.unitPrice)}
                      </td>
                      <td className="py-3 px-4 text-sm font-semibold text-[color:var(--color-ink)] text-right">
                        {formatNaira(item.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-[color:var(--color-border)]">
              {sale.items.map((item) => (
                <div key={item.id} className="p-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                      {item.productName}
                    </p>
                    <p className="text-xs text-[color:var(--color-muted)] mt-1">
                      {item.quantity} × {unitLabel(item.unit)}
                      {item.unit === 'Bag' ? ` · ${item.packsPerUnit} packs each` : ''}
                    </p>
                    <p className="text-xs text-[color:var(--color-muted)] mt-0.5">
                      {formatNaira(item.unitPrice)} each
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-[color:var(--color-ink)] shrink-0">
                    {formatNaira(item.lineTotal)}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[color:var(--color-border)]">
              <h2 className="text-sm font-bold text-[color:var(--color-ink)]">Payment history</h2>
              <p className="text-xs text-[color:var(--color-muted)] mt-1">
                Payments recorded against this sale, oldest first.
              </p>
            </div>

            {sale.payments.length === 0 ? (
              <div className="p-6 text-center">
                <p className="text-sm text-[color:var(--color-muted)]">
                  No payment has been recorded for this sale yet.
                </p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[color:var(--color-subtle)] border-b border-[color:var(--color-border)]">
                        <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">Date</th>
                        <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">Method</th>
                        <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">Reference</th>
                        <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)] text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:var(--color-border)]">
                      {sale.payments.map((payment) => (
                        <PaymentRow key={payment.id} payment={payment} />
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-[color:var(--color-border)]">
                  {sale.payments.map((payment) => (
                    <div key={payment.id} className="px-4 py-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-xs text-[color:var(--color-muted)]">
                          {formatMovementDate(payment.paidAt)}
                        </span>
                        <span className="text-sm font-semibold text-[color:var(--color-ink)]">
                          {formatNaira(payment.amount)}
                        </span>
                      </div>
                      <p className="text-[11px] text-[color:var(--color-muted)] mt-0.5">
                        {methodLabel(payment.method)}
                        {payment.reference ? ` · ${payment.reference}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {repaymentOpen && sale.customerId && (
        <RecordRepaymentModal
          customerId={sale.customerId}
          customerName={customerName}
          sales={outstandingSales}
          initialSaleId={sale.id}
          onClose={() => setRepaymentOpen(false)}
          onRecorded={(_result, saleId, amount) => handleRecorded(amount, saleId)}
        />
      )}
    </div>
  );
}

function PaymentRow({ payment }: { payment: Payment }) {
  return (
    <tr>
      <td className="py-3 px-4 text-sm text-[color:var(--color-muted)]">
        {formatMovementDate(payment.paidAt)}
      </td>
      <td className="py-3 px-4 text-sm text-[color:var(--color-muted)]">
        {methodLabel(payment.method)}
      </td>
      <td className="py-3 px-4 text-sm text-[color:var(--color-muted)]">
        {payment.reference || '—'}
      </td>
      <td className="py-3 px-4 text-sm font-semibold text-[color:var(--color-ink)] text-right">
        {formatNaira(payment.amount)}
      </td>
    </tr>
  );
}

function BackToSales() {
  return <BackNavigation fallback="/sales" label="Back to sales" />;
}

function SummaryRow({
  label,
  value,
  strong = false,
  tone,
}: {
  label: string;
  value: string;
  strong?: boolean;
  tone?: 'danger' | 'success';
}) {
  const valueClass =
    tone === 'danger'
      ? 'text-[color:var(--color-danger-ink)]'
      : tone === 'success'
        ? 'text-[color:var(--color-success-ink)]'
        : 'text-[color:var(--color-ink)]';

  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-[color:var(--color-muted)]">{label}</span>
      <span className={`${strong ? 'text-sm font-bold' : 'font-semibold'} ${valueClass} text-right`}>
        {value}
      </span>
    </div>
  );
}

function statusPresentation(status: PaymentStatus): {
  label: string;
  tone: 'paid' | 'part' | 'unpaid';
} {
  if (status === 'PAID') return { label: 'Paid', tone: 'paid' };
  if (status === 'PART_PAID') return { label: 'Partly paid', tone: 'part' };
  return { label: 'Unpaid', tone: 'unpaid' };
}

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: 'paid' | 'part' | 'unpaid';
}) {
  const classes =
    tone === 'paid'
      ? 'bg-[color:var(--color-success-bg)] text-[color:var(--color-success-ink)]'
      : tone === 'part'
        ? 'bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning-ink)]'
        : 'bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-ink)]';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-xs font-semibold ${classes}`}>
      {label}
    </span>
  );
}

function SaleDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 w-28 bg-[color:var(--color-subtle)] rounded-[4px]" />
      <div className="space-y-3">
        <div className="h-8 w-56 bg-[color:var(--color-subtle)] rounded-[4px]" />
        <div className="h-4 w-64 bg-[color:var(--color-subtle)] rounded-[4px]" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4 lg:order-2">
          <div className="h-56 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]" />
          <div className="h-36 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]" />
        </div>
        <div className="space-y-6 lg:order-1">
          <div className="h-72 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]" />
          <div className="h-52 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]" />
        </div>
      </div>
    </div>
  );
}
