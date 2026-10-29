import { useState } from 'react';
import { createCustomer } from '../../lib/api/customers';
import { ApiError } from '../../lib/api/client';
import type { Customer } from '../../types/customer';
import { AlertCircleIcon, XIcon } from '../ui/Icons';

interface AddCustomerModalProps {
  onClose: () => void;
  onCreated: (customer: Customer) => void;
}

export function AddCustomerModal({ onClose, onCreated }: AddCustomerModalProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Enter the customer’s name.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await createCustomer({
        name: trimmedName,
        phone: phone.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      });
      const customer = result[0];
      if (!customer) {
        setError('The customer was saved but the backend returned no record. Reload the list.');
        return;
      }
      onCreated(customer);
      onClose();
    } catch (err: unknown) {
      const apiErr = err instanceof ApiError ? err : null;
      if (apiErr?.status === 403) {
        setError('Forbidden: your account does not have staff access.');
      } else if (apiErr?.status === 400) {
        setError(apiErr.message || 'The customer details were rejected. Check the name and phone number.');
      } else if (apiErr?.status === 429) {
        setError('Too many requests. Wait a moment and try again.');
      } else {
        setError(
          apiErr?.message ||
            'Unable to add the customer. Check your connection and try again.',
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        aria-label="Close modal"
        onClick={onClose}
        className="absolute inset-0 bg-[color:var(--color-scrim)]"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-customer-title"
        className="relative z-10 w-full max-w-md max-h-[92vh] overflow-y-auto rounded-t-[16px] sm:rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] shadow-xl pb-[env(safe-area-inset-bottom)] sm:pb-0"
      >
        <div className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-[color:var(--color-border)]">
          <div>
            <h2
              id="add-customer-title"
              className="text-lg font-bold text-[color:var(--color-ink)]"
            >
              Add customer
            </h2>
            <p className="mt-1 text-xs text-[color:var(--color-muted)]">
              Used for credit sales and later repayments.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-[8px] text-[color:var(--color-muted)] hover:bg-[color:var(--color-subtle)] hover:text-[color:var(--color-ink)] transition-colors"
          >
            <XIcon size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="customer-name"
              className="block text-xs font-semibold text-[color:var(--color-ink)]"
            >
              Full name
            </label>
            <input
              id="customer-name"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              maxLength={120}
              required
              autoFocus
              placeholder="e.g. Itoro Essien"
              className="w-full h-11 px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted)] focus:outline-none focus:border-[color:var(--color-accent)]"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="customer-phone"
              className="block text-xs font-semibold text-[color:var(--color-ink)]"
            >
              Phone number <span className="font-normal text-[color:var(--color-muted)]">(optional)</span>
            </label>
            <input
              id="customer-phone"
              type="tel"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value);
                setError(null);
              }}
              maxLength={40}
              placeholder="e.g. 0803 000 0000"
              className="w-full h-11 px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted)] focus:outline-none focus:border-[color:var(--color-accent)]"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="customer-address"
              className="block text-xs font-semibold text-[color:var(--color-ink)]"
            >
              Address <span className="font-normal text-[color:var(--color-muted)]">(optional)</span>
            </label>
            <input
              id="customer-address"
              type="text"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                setError(null);
              }}
              maxLength={200}
              placeholder="Shop or delivery address"
              className="w-full h-11 px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted)] focus:outline-none focus:border-[color:var(--color-accent)]"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="customer-notes"
              className="block text-xs font-semibold text-[color:var(--color-ink)]"
            >
              Notes <span className="font-normal text-[color:var(--color-muted)]">(optional)</span>
            </label>
            <textarea
              id="customer-notes"
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setError(null);
              }}
              maxLength={500}
              rows={2}
              placeholder="Credit terms, contact preferences…"
              className="w-full px-3 py-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted)] focus:outline-none focus:border-[color:var(--color-accent)] resize-y"
            />
          </div>

          {error && (
            <div className="p-3 rounded-[8px] bg-[color:var(--color-danger-bg)] text-xs font-medium text-[color:var(--color-danger-ink)] flex items-start gap-2">
              <AlertCircleIcon size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="h-10 px-4 rounded-[8px] font-semibold text-xs border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
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
    </div>
  );
}
