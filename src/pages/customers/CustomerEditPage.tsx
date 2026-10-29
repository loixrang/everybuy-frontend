import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { fetchCustomer, updateCustomer } from '../../lib/api/customers';
import { ApiError } from '../../lib/api/client';
import { CustomerStatusBadge } from '../../components/customers/CustomerStatusBadge';
import {
  AlertCircleIcon,
  ArrowLeftIcon,
  RefreshCwIcon,
} from '../../components/ui/Icons';
import type { Customer } from '../../types/customer';

type LoadState =
  | { status: 'loading' }
  | { status: 'ready'; customer: Customer }
  | { status: 'error'; message: string; code?: number };

export function CustomerEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [load, setLoad] = useState<LoadState>(
    id
      ? { status: 'loading' }
      : { status: 'error', message: 'No customer was selected.' },
  );
  const [reloadKey, setReloadKey] = useState(0);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    if (!id) return;

    async function loadCustomer() {
      try {
        const customer = await fetchCustomer(id as string);
        if (ignore) return;
        if (!customer) {
          setLoad({
            status: 'error',
            message: 'This customer may have been removed, or the link is incorrect.',
            code: 404,
          });
          return;
        }
        setLoad({ status: 'ready', customer });
        setName(customer.name);
        setPhone(customer.phone ?? '');
        setAddress(customer.address ?? '');
        setNotes(customer.notes ?? '');
        setActive(customer.active);
      } catch (err: unknown) {
        if (ignore) return;
        if (err instanceof ApiError) {
          setLoad({ status: 'error', message: err.message, code: err.status });
        } else {
          setLoad({
            status: 'error',
            message:
              'Unable to connect to the backend server. Check that it is running and try again.',
          });
        }
      }
    }

    loadCustomer();
    return () => {
      ignore = true;
    };
  }, [id, reloadKey]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id) return;
    setFormError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setFormError('Enter the customer’s name.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await updateCustomer(id, {
        name: trimmedName,
        phone: phone.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
        active,
      });
      if (!result) {
        setFormError('The customer was updated but the backend returned no record. Reload and try again.');
        return;
      }
      navigate(`/customers/${id}`, { replace: true });
    } catch (err: unknown) {
      const apiErr = err instanceof ApiError ? err : null;
      if (apiErr?.status === 403) {
        setFormError('Forbidden: your account does not have staff access.');
      } else if (apiErr?.status === 404) {
        setFormError('This customer no longer exists.');
      } else if (apiErr?.status === 400) {
        setFormError(apiErr.message || 'The customer details were rejected. Check the name and phone number.');
      } else if (apiErr?.status === 429) {
        setFormError('Too many requests. Wait a moment and try again.');
      } else {
        setFormError(
          apiErr?.message ||
            'Unable to save the customer. Check your connection and try again.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (load.status === 'loading') {
    return (
      <div className="max-w-2xl space-y-6 animate-pulse">
        <div className="h-4 w-24 bg-[color:var(--color-subtle)] rounded-[4px]" />
        <div className="h-8 w-52 bg-[color:var(--color-subtle)] rounded-[4px]" />
        <div className="h-80 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]" />
      </div>
    );
  }

  if (load.status === 'error') {
    const isForbidden = load.code === 401 || load.code === 403;
    const isNotFound = load.code === 404;

    return (
      <div className="max-w-2xl space-y-4">
        <Link
          to="/customers"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)] transition-colors"
        >
          <ArrowLeftIcon size={14} />
          Customers
        </Link>
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
                {isForbidden
                  ? 'Editing customers requires staff authorization.'
                  : load.message}
              </p>
              {!isNotFound && !isForbidden && (
                <button
                  type="button"
                  onClick={() => {
                    setLoad({ status: 'loading' });
                    setReloadKey((key) => key + 1);
                  }}
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

  const customer = load.customer;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Link
          to={`/customers/${customer.id}`}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[color:var(--color-muted)] hover:text-[color:var(--color-ink)] transition-colors"
        >
          <ArrowLeftIcon size={14} />
          {customer.name}
        </Link>
        <h1 className="text-2xl lg:text-[32px] font-bold tracking-tight text-[color:var(--color-ink)] mt-3">
          Customer details
        </h1>
        <p className="text-sm text-[color:var(--color-muted)] mt-1">
          Keep the contact information needed for credit sales.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5 lg:p-6 space-y-5"
      >
        <div className="flex items-center justify-between gap-3 pb-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-[color:var(--color-muted)]">
            Customer
          </p>
          <CustomerStatusBadge active={active} />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="edit-customer-name" className="block text-xs font-semibold text-[color:var(--color-ink)]">
            Full name
          </label>
          <input
            id="edit-customer-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setFormError(null);
            }}
            maxLength={120}
            required
            className="w-full h-11 px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] focus:outline-none focus:border-[color:var(--color-accent)]"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="edit-customer-phone" className="block text-xs font-semibold text-[color:var(--color-ink)]">
            Phone number <span className="font-normal text-[color:var(--color-muted)]">(optional)</span>
          </label>
          <input
            id="edit-customer-phone"
            type="tel"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setFormError(null);
            }}
            maxLength={40}
            placeholder="e.g. 0803 000 0000"
            className="w-full h-11 px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted)] focus:outline-none focus:border-[color:var(--color-accent)]"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="edit-customer-address" className="block text-xs font-semibold text-[color:var(--color-ink)]">
            Address <span className="font-normal text-[color:var(--color-muted)]">(optional)</span>
          </label>
          <input
            id="edit-customer-address"
            type="text"
            value={address}
            onChange={(e) => {
              setAddress(e.target.value);
              setFormError(null);
            }}
            maxLength={200}
            placeholder="Shop or delivery address"
            className="w-full h-11 px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted)] focus:outline-none focus:border-[color:var(--color-accent)]"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="edit-customer-notes" className="block text-xs font-semibold text-[color:var(--color-ink)]">
            Notes <span className="font-normal text-[color:var(--color-muted)]">(optional)</span>
          </label>
          <textarea
            id="edit-customer-notes"
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setFormError(null);
            }}
            maxLength={500}
            rows={3}
            placeholder="Credit terms, contact preferences…"
            className="w-full px-3 py-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted)] focus:outline-none focus:border-[color:var(--color-accent)] resize-y"
          />
        </div>

        <div className="rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-subtle)] p-4">
          <label htmlFor="edit-customer-active" className="flex items-start gap-3 cursor-pointer">
            <input
              id="edit-customer-active"
              type="checkbox"
              checked={active}
              onChange={(e) => {
                setActive(e.target.checked);
                setFormError(null);
              }}
              className="mt-0.5 h-4 w-4 rounded border-[color:var(--color-border)] accent-[color:var(--color-accent)]"
            />
            <span>
              <span className="block text-sm font-semibold text-[color:var(--color-ink)]">
                Active customer
              </span>
              <span className="block text-xs text-[color:var(--color-muted)] mt-0.5">
                Inactive customers keep their sales, balances and payment history, but should not be
                offered new credit.
              </span>
            </span>
          </label>
        </div>

        {formError && (
          <div className="p-3 rounded-[8px] bg-[color:var(--color-danger-bg)] text-xs font-medium text-[color:var(--color-danger-ink)] flex items-start gap-2">
            <AlertCircleIcon size={16} className="shrink-0 mt-0.5" />
            <span>{formError}</span>
          </div>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
          <Link
            to={`/customers/${customer.id}`}
            className="inline-flex items-center justify-center h-10 px-4 rounded-[8px] font-semibold text-xs border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="h-10 px-4 rounded-[8px] font-semibold text-xs bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors disabled:opacity-50"
          >
            {submitting ? 'Saving…' : 'Save customer'}
          </button>
        </div>
      </form>
    </div>
  );
}
