import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { fetchCustomerStatement } from '../../lib/api/customers';
import { ApiError } from '../../lib/api/client';
import { formatMovementDate, formatNaira, formatShortDate } from '../../lib/utils/format';
import {
  toKobo,
} from '../../lib/utils/money';
import type { CustomerStatement, StatementSale } from '../../types/customer';
import { CustomerStatusBadge } from '../../components/customers/CustomerStatusBadge';
import { RecordRepaymentModal } from '../../components/customers/RecordRepaymentModal';
import { BackNavigation } from '../../components/ui/BackNavigation';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  PencilIcon,
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

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [statement, setStatement] = useState<CustomerStatement | null>(null);
  const [loading, setLoading] = useState(!id);
  const [error, setError] = useState<LoadError | null>(
    id ? null : { message: 'No customer was selected.' },
  );
  const [reloadKey, setReloadKey] = useState(0);
  const [repaymentOpen, setRepaymentOpen] = useState(false);
  const [repaymentSaleId, setRepaymentSaleId] = useState<string | undefined>(undefined);
  const [success, setSuccess] = useState<RepaymentSuccess | null>(null);

  useEffect(() => {
    let ignore = false;
    if (!id) return;

    async function load() {
      try {
        const result = await fetchCustomerStatement(id as string);
        if (ignore) return;
        setStatement(result);
      } catch (err: unknown) {
        if (ignore) return;
        if (err instanceof ApiError) {
          setError({ message: err.message, status: err.status });
        } else {
          setError({
            message:
              'Unable to connect. Check your connection and try again.',
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

  const outstandingSales = useMemo(
    () => statement?.sales.filter((sale) => toKobo(sale.balanceDue) > 0n) ?? [],
    [statement],
  );

  const paymentHistory = useMemo(() => {
    if (!statement) return [];
    return statement.sales
      .flatMap((sale) => sale.payments)
      .sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());
  }, [statement]);

  function openRepayment(saleId?: string) {
    setRepaymentSaleId(saleId);
    setRepaymentOpen(true);
  }

  function handleRecorded(amount: string, saleId: string) {
    setSuccess({ amount, saleId });
    setReloadKey((key) => key + 1);
  }

  if (loading) {
    return <CustomerDetailSkeleton />;
  }

  if (error || !statement) {
    const isNotFound = error?.status === 404;
    const isForbidden = error?.status === 401 || error?.status === 403;

    return (
      <div className="space-y-4">
        <BackToCustomers />
        <div className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-6">
          <div className="flex items-start gap-3">
            <AlertCircleIcon className="text-[color:var(--color-danger-ink)] shrink-0 mt-0.5" size={22} />
            <div className="flex-1">
              <h1 className="text-lg font-bold text-[color:var(--color-ink)]">
                {isNotFound
                  ? 'Customer not found'
                  : isForbidden
                    ? 'Staff access required'
                    : 'Unable to load customer'}
              </h1>
              <p className="text-sm text-[color:var(--color-muted)] mt-1">
                {isNotFound
                  ? 'This customer may have been removed, or the link is incorrect.'
                  : isForbidden
                    ? 'Customer statements require staff authorization. Sign in with a staff account.'
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

  const customer = statement.customer;
  const latestSale = statement.sales[0];
  const hasDebt = toKobo(statement.totals.outstandingDebt) > 0n;

  return (
    <div className="space-y-6">
      <BackToCustomers />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl lg:text-[32px] font-bold tracking-tight text-[color:var(--color-ink)]">
              {customer.name}
            </h1>
            <CustomerStatusBadge active={customer.active} />
          </div>
          <p className="text-sm text-[color:var(--color-muted)] mt-1">
            {customer.phone || 'No phone number on record'}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 shrink-0">
          <Link
            to={`/sales?customerId=${customer.id}`}
            className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-[8px] font-semibold text-sm border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors"
          >
            Sales history
          </Link>
          <Link
            to={`/customers/${customer.id}/edit`}
            className="inline-flex items-center justify-center gap-2 h-11 px-4 rounded-[8px] font-semibold text-sm border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors"
          >
            <PencilIcon size={16} />
            Edit customer
          </Link>
          <button
            type="button"
            onClick={() => openRepayment()}
            disabled={outstandingSales.length === 0}
            className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-[8px] font-semibold text-sm bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <WalletIcon size={16} />
            Record repayment
          </button>
        </div>
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
                  {formatNaira(success.amount)} applied to sale #{success.saleId.slice(0, 8)}. The balance
                  below reflects the latest totals.
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

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <aside className="space-y-4 lg:order-2">
          <div className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5">
            <p className="text-xs font-semibold text-[color:var(--color-muted)]">Balance owed</p>
            <p
              className={`text-3xl font-bold tracking-tight mt-2 ${
                hasDebt
                  ? 'text-[color:var(--color-danger-ink)]'
                  : 'text-[color:var(--color-success-ink)]'
              }`}
            >
              {formatNaira(statement.totals.outstandingDebt)}
            </p>
            <p className="text-xs text-[color:var(--color-muted)] mt-2">
              {outstandingSales.length === 0
                ? 'All sales are fully paid'
                : `${outstandingSales.length} outstanding ${
                    outstandingSales.length === 1 ? 'sale' : 'sales'
                  }`}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
              <p className="text-[11px] font-semibold text-[color:var(--color-muted)]">Total sales</p>
              <p className="text-lg font-bold text-[color:var(--color-ink)] mt-1">
                {formatNaira(statement.totals.salesTotal)}
              </p>
            </div>
            <div className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4">
              <p className="text-[11px] font-semibold text-[color:var(--color-muted)]">Money received</p>
              <p className="text-lg font-bold text-[color:var(--color-ink)] mt-1">
                {formatNaira(statement.totals.moneyReceived)}
              </p>
            </div>
          </div>

          <div className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5">
            <p className="text-xs font-semibold text-[color:var(--color-muted)]">Last purchase</p>
            <p className="text-sm font-semibold text-[color:var(--color-ink)] mt-2">
              {latestSale ? formatShortDate(latestSale.soldAt) : 'No purchases yet'}
            </p>
            {latestSale && (
              <p className="text-xs text-[color:var(--color-muted)] mt-1">
                {formatNaira(latestSale.totalAmount)} · sale #{latestSale.id.slice(0, 8)}
              </p>
            )}
          </div>

          <div className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 space-y-3">
            <p className="text-xs font-semibold text-[color:var(--color-muted)]">Customer details</p>
            <DetailRow label="Phone" value={customer.phone || '—'} />
            <DetailRow label="Address" value={customer.address || '—'} />
            <DetailRow label="Added" value={formatShortDate(customer.createdAt)} />
            <DetailRow label="Status" value={customer.active ? 'Active' : 'Inactive'} />
            {customer.notes && (
              <div className="pt-1 border-t border-[color:var(--color-border)]">
                <p className="text-[11px] font-semibold text-[color:var(--color-muted)]">Notes</p>
                <p className="text-xs text-[color:var(--color-ink)] mt-1 whitespace-pre-line">
                  {customer.notes}
                </p>
              </div>
            )}
          </div>
        </aside>

        <div className="space-y-6 lg:order-1">
          <section className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[color:var(--color-border)]">
              <h2 className="text-sm font-bold text-[color:var(--color-ink)]">Outstanding sales</h2>
              <p className="text-xs text-[color:var(--color-muted)] mt-1">
                Totals include all payments recorded for each sale.
              </p>
            </div>

            {outstandingSales.length === 0 ? (
              <div className="p-8 text-center">
                <CheckCircleIcon size={28} className="mx-auto text-[color:var(--color-success-ink)]" />
                <p className="text-sm font-semibold text-[color:var(--color-ink)] mt-2">
                  No outstanding balance
                </p>
                <p className="text-xs text-[color:var(--color-muted)] mt-1">
                  Every sale recorded for this customer is fully paid.
                </p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[color:var(--color-subtle)] border-b border-[color:var(--color-border)]">
                        <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">Sale</th>
                        <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">Date</th>
                        <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">Total</th>
                        <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">Paid</th>
                        <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">Owed</th>
                        <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)] text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:var(--color-border)]">
                      {outstandingSales.map((sale) => (
                        <tr key={sale.id}>
                          <td className="py-3 px-4 text-sm font-semibold text-[color:var(--color-ink)]" title={sale.id}>
                            <Link
                              to={`/sales/${sale.id}`}
                              className="hover:text-[color:var(--color-accent)] hover:underline underline-offset-2"
                            >
                              #{sale.id.slice(0, 8)}
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-sm text-[color:var(--color-muted)]">
                            {formatShortDate(sale.soldAt)}
                          </td>
                          <td className="py-3 px-4 text-sm text-[color:var(--color-ink)]">
                            {formatNaira(sale.totalAmount)}
                          </td>
                          <td className="py-3 px-4 text-sm text-[color:var(--color-muted)]">
                            {formatNaira(sale.paidAmount)}
                          </td>
                          <td className="py-3 px-4 text-sm font-semibold text-[color:var(--color-danger-ink)]">
                            {formatNaira(sale.balanceDue)}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => openRepayment(sale.id)}
                              className="text-xs font-semibold text-[color:var(--color-accent-ink)] hover:underline underline-offset-2"
                            >
                              Record repayment
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="md:hidden divide-y divide-[color:var(--color-border)]">
                  {outstandingSales.map((sale) => (
                    <SaleCard key={sale.id} sale={sale} onRepay={() => openRepayment(sale.id)} />
                  ))}
                </div>
              </>
            )}
          </section>

          <section className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[color:var(--color-border)]">
              <h2 className="text-sm font-bold text-[color:var(--color-ink)]">Payments</h2>
              <p className="text-xs text-[color:var(--color-muted)] mt-1">
                Every payment received, newest first.
              </p>
            </div>

            {paymentHistory.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-[color:var(--color-muted)]">
                  No payments recorded for this customer yet.
                </p>
              </div>
            ) : (
              <>
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[color:var(--color-subtle)] border-b border-[color:var(--color-border)]">
                        <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">Date</th>
                        <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">Sale</th>
                        <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)]">Method</th>
                        <th className="py-3 px-4 text-xs font-medium text-[color:var(--color-muted)] text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[color:var(--color-border)]">
                      {paymentHistory.map((payment) => (
                        <tr key={`${payment.saleId}-${payment.id}`}>
                          <td className="py-3 px-4 text-sm text-[color:var(--color-muted)]">
                            {formatMovementDate(payment.paidAt)}
                          </td>
                          <td className="py-3 px-4 text-sm font-semibold text-[color:var(--color-ink)]" title={payment.saleId}>
                            <Link
                              to={`/sales/${payment.saleId}`}
                              className="hover:text-[color:var(--color-accent)] hover:underline underline-offset-2"
                            >
                              #{payment.saleId.slice(0, 8)}
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-sm text-[color:var(--color-muted)]">
                            {payment.method === 'cash'
                              ? 'Cash'
                              : payment.method === 'transfer'
                                ? 'Transfer'
                                : 'POS'}
                            {payment.reference ? ` · ${payment.reference}` : ''}
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
                  {paymentHistory.map((payment) => (
                    <div
                      key={`${payment.saleId}-${payment.id}`}
                      className="px-4 py-3 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[color:var(--color-ink)]">
                          {formatNaira(payment.amount)}
                        </p>
                        <p className="text-xs text-[color:var(--color-muted)] mt-0.5">
                          {formatMovementDate(payment.paidAt)} · sale #{payment.saleId.slice(0, 8)}
                          {' · '}
                          {payment.method === 'cash'
                            ? 'Cash'
                            : payment.method === 'transfer'
                              ? 'Transfer'
                              : 'POS'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        </div>
      </div>

      {repaymentOpen && (
        <RecordRepaymentModal
          customerId={customer.id}
          customerName={customer.name}
          sales={outstandingSales}
          initialSaleId={repaymentSaleId}
          onClose={() => setRepaymentOpen(false)}
          onRecorded={(_result, saleId, amount) => handleRecorded(amount, saleId)}
        />
      )}
    </div>
  );
}

function BackToCustomers() {
  return <BackNavigation fallback="/customers" label="Back to customers" />;
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="text-[color:var(--color-muted)]">{label}</span>
      <span className="font-semibold text-[color:var(--color-ink)] text-right break-words">{value}</span>
    </div>
  );
}

function SaleCard({ sale, onRepay }: { sale: StatementSale; onRepay: () => void }) {
  return (
    <div className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[color:var(--color-ink)]">#{sale.id.slice(0, 8)}</p>
          <p className="text-xs text-[color:var(--color-muted)] mt-0.5">{formatShortDate(sale.soldAt)}</p>
        </div>
        <p className="text-sm font-bold text-[color:var(--color-danger-ink)]">
          {formatNaira(sale.balanceDue)} owed
        </p>
      </div>
      <div className="text-xs text-[color:var(--color-muted)] mt-3 flex items-center justify-between gap-3">
        <span>
          Total {formatNaira(sale.totalAmount)} · paid {formatNaira(sale.paidAmount)}
        </span>
        <button
          type="button"
          onClick={onRepay}
          className="font-semibold text-[color:var(--color-accent-ink)] hover:underline underline-offset-2 shrink-0"
        >
          Record repayment
        </button>
      </div>
    </div>
  );
}

function CustomerDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-4 w-24 bg-[color:var(--color-subtle)] rounded-[4px]" />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-3">
          <div className="h-8 w-56 bg-[color:var(--color-subtle)] rounded-[4px]" />
          <div className="h-4 w-36 bg-[color:var(--color-subtle)] rounded-[4px]" />
        </div>
        <div className="h-11 w-40 bg-[color:var(--color-subtle)] rounded-[8px]" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-4 lg:order-2">
          <div className="h-32 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]" />
          <div className="h-24 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]" />
        </div>
        <div className="space-y-6 lg:order-1">
          <div className="h-64 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]" />
          <div className="h-52 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]" />
        </div>
      </div>
    </div>
  );
}
