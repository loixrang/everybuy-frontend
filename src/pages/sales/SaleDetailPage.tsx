import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchSale } from '../../lib/api/sales';
import { fetchCustomerStatement } from '../../lib/api/customers';
import { ApiError } from '../../lib/api/client';
import {
  formatLongDate,
  formatMovementDate,
  formatNaira,
} from '../../lib/utils/format';
import { toKobo } from '../../lib/utils/money';
import type {
  CustomerStatement,
  StatementSale,
} from '../../types/customer';
import type { SaleDetail, SaleItem } from '../../types/sale';
import { RecordRepaymentModal } from '../../components/customers/RecordRepaymentModal';
import {
  AlertCircleIcon,
  ArrowLeftIcon,
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
  return unit === 'Bag' ? 'Carton' : 'Pack';
}

export function SaleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [statement, setStatement] = useState<CustomerStatement | null>(null);
  const [statementError, setStatementError] = useState<string | null>(null);
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

        if (saleResult.customerId) {
          try {
            const statementResult = await fetchCustomerStatement(saleResult.customerId);
            if (ignore) return;
            setStatement(statementResult);
          } catch (err: unknown) {
            if (ignore) return;
            setStatementError(
              err instanceof ApiError
                ? err.message
                : 'Unable to load payment details for this sale.',
            );
          }
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
    setStatementError(null);
    setReloadKey((key) => key + 1);
  }, []);

  const statementSale = useMemo(() => {
    if (!sale || !statement) return null;
    return statement.sales.find((candidate) => candidate.id === sale.id) ?? null;
  }, [sale, statement]);

  const outstandingSales = useMemo(
    () => statement?.sales.filter((candidate) => toKobo(candidate.balanceDue) > 0n) ?? [],
    [statement],
  );

  const walkIn = sale !== null && !sale.customerId;
  const paidAmount = walkIn
    ? sale?.itemsTotal
    : statementSale?.paidAmount;
  const balanceDue = walkIn ? '0.00' : statementSale?.balanceDue;
  const status = sale ? deriveStatus(sale, statementSale) : null;
  const canRepay =
    !walkIn &&
    statementSale !== null &&
    toKobo(statementSale.balanceDue) > 0n;

  const customerName = walkIn
    ? 'Walk-in customer'
    : statement?.customer.name ??
      (sale?.customerId ? `Customer #${sale.customerId.slice(0, 8)}` : 'Customer');

  function handleRecorded(amount: string, saleId: string) {
    setSuccess({ amount, saleId });
    setReloadKey((key) => key + 1);
  }

  if (loading) {
    return <SaleDetailSkeleton />;
  }

  if (error || !sale) {
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

  return (
    <div className="space-y-6">
      <BackToSales />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl lg:text-[32px] font-bold tracking-tight text-[color:var(--color-ink)]">
              Sale #{sale.id.slice(0, 8)}
            </h1>
            {status && <StatusBadge label={status.label} tone={status.tone} />}
          </div>
          <p className="text-sm text-[color:var(--color-muted)] mt-1">
            {formatLongDate(sale.soldAt)} · {customerName}
          </p>
        </div>
        {canRepay && statementSale && (
          <button
            type="button"
            onClick={() => setRepaymentOpen(true)}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[8px] font-semibold text-sm bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors shrink-0"
          >
            <WalletIcon size={16} />
            Record repayment
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
                  {formatNaira(success.amount)} applied to sale #{success.saleId.slice(0, 8)}.
                  The summary below has been reloaded from the backend.
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

      {statementError && !walkIn && (
        <div className="p-4 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-warning-bg)]">
          <div className="flex items-start gap-3">
            <AlertCircleIcon size={18} className="text-[color:var(--color-warning-ink)] shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-[color:var(--color-warning-ink)]">
                Payment details unavailable
              </p>
              <p className="text-xs text-[color:var(--color-muted)] mt-1">
                The sale items are shown, but the customer statement could not be loaded
                ({statementError}). Retry to see paid, balance and payment history.
              </p>
            </div>
            <button
              type="button"
              onClick={retry}
              className="text-xs font-semibold text-[color:var(--color-ink)] underline underline-offset-2 shrink-0"
            >
              Retry
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
              {paidAmount !== undefined ? (
                <SummaryRow label="Amount paid" value={formatNaira(paidAmount)} />
              ) : (
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-[color:var(--color-muted)]">Amount paid</span>
                  <span className="text-[color:var(--color-muted)]">Not available</span>
                </div>
              )}
              {balanceDue !== undefined ? (
                <SummaryRow
                  label="Balance owed"
                  value={formatNaira(balanceDue)}
                  strong
                  tone={toKobo(balanceDue) > 0n ? 'danger' : 'success'}
                />
              ) : (
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-[color:var(--color-muted)]">Balance owed</span>
                  <span className="text-[color:var(--color-muted)]">Not available</span>
                </div>
              )}
              <SummaryRow
                label="Payment type"
                value={
                  walkIn
                    ? 'Paid at sale'
                    : balanceDue === undefined
                      ? 'Not available'
                      : toKobo(balanceDue) > 0n
                        ? 'Credit sale'
                        : 'Paid in full'
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
            {walkIn ? (
              <p className="text-xs text-[color:var(--color-muted)]">
                No customer was attached to this sale.
              </p>
            ) : (
              <>
                <SummaryRow label="Name" value={customerName} />
                <SummaryRow
                  label="Phone"
                  value={statement?.customer.phone || '—'}
                />
                {sale.customerId && (
                  <Link
                    to={`/customers/${sale.customerId}`}
                    className="inline-flex text-xs font-semibold text-[color:var(--color-accent-ink)] hover:underline underline-offset-2"
                  >
                    View customer
                  </Link>
                )}
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
                Payments recorded against this sale.
              </p>
            </div>

            {walkIn ? (
              <div className="p-6 text-center">
                <p className="text-sm text-[color:var(--color-muted)]">
                  This is a walk-in sale with no customer attached. Payment history is only
                  exposed through a customer statement.
                </p>
              </div>
            ) : statementError ? (
              <div className="p-6 text-center">
                <p className="text-sm text-[color:var(--color-muted)]">
                  Payment history could not be loaded.
                </p>
              </div>
            ) : !statementSale ? (
              <div className="p-6 text-center">
                <p className="text-sm text-[color:var(--color-muted)]">
                  Payment details are unavailable for this sale.
                </p>
              </div>
            ) : statementSale.payments.length === 0 ? (
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
                        <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)] text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:var(--color-border)]">
                      {statementSale.payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="py-3 px-4 text-sm text-[color:var(--color-muted)]">
                            {formatMovementDate(payment.paidAt)}
                          </td>
                          <td className="py-3 px-4 text-sm font-semibold text-[color:var(--color-ink)] text-right">
                            {formatNaira(payment.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-[color:var(--color-border)]">
                  {statementSale.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="px-4 py-3 flex items-center justify-between gap-3"
                    >
                      <span className="text-xs text-[color:var(--color-muted)]">
                        {formatMovementDate(payment.paidAt)}
                      </span>
                      <span className="text-sm font-semibold text-[color:var(--color-ink)]">
                        {formatNaira(payment.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {repaymentOpen && statementSale && sale.customerId && (
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

function BackToSales() {
  return (
    <Link
      to="/sales"
      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)] transition-colors"
    >
      <ArrowLeftIcon size={14} />
      Sales history
    </Link>
  );
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

function StatusBadge({
  label,
  tone,
}: {
  label: string;
  tone: 'paid' | 'part' | 'unpaid' | 'unknown';
}) {
  const classes =
    tone === 'paid'
      ? 'bg-[color:var(--color-success-bg)] text-[color:var(--color-success-ink)]'
      : tone === 'part'
        ? 'bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning-ink)]'
        : tone === 'unpaid'
          ? 'bg-[color:var(--color-danger-bg)] text-[color:var(--color-danger-ink)]'
          : 'bg-[color:var(--color-subtle)] text-[color:var(--color-muted)]';

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-xs font-semibold ${classes}`}>
      {label}
    </span>
  );
}

function deriveStatus(
  sale: SaleDetail,
  statementSale: StatementSale | null,
): { label: string; tone: 'paid' | 'part' | 'unpaid' | 'unknown' } {
  if (!sale.customerId) {
    // The backend requires a customer whenever the amount paid is below the
    // total, so a sale with no customer is fully paid at the point of sale.
    return { label: 'Paid', tone: 'paid' };
  }
  if (!statementSale) {
    return { label: 'Payment details unavailable', tone: 'unknown' };
  }
  if (statementSale.paymentStatus === 'PAID') return { label: 'Paid', tone: 'paid' };
  if (statementSale.paymentStatus === 'PART_PAID') return { label: 'Partly paid', tone: 'part' };
  return { label: 'Unpaid', tone: 'unpaid' };
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
