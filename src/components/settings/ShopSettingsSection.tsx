import { useCallback, useEffect, useState } from 'react';
import { fetchShopSettings, updateShopSettings } from '../../lib/api/shop';
import { ApiError } from '../../lib/api/client';
import type { ShopSettings } from '../../types/shop';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  RefreshCwIcon,
} from '../ui/Icons';

type LoadState =
  | { status: 'loading' }
  | { status: 'missing' }
  | { status: 'ready'; settings: ShopSettings }
  | { status: 'error'; message: string; code?: number };

interface FormState {
  name: string;
  address: string;
  phone: string;
  currency: string;
  timezone: string;
  receiptFooter: string;
}

function toForm(settings: ShopSettings): FormState {
  return {
    name: settings.name ?? '',
    address: settings.address ?? '',
    phone: settings.phone ?? '',
    currency: settings.currency ?? '',
    timezone: settings.timezone ?? '',
    receiptFooter: settings.receiptFooter ?? '',
  };
}

/**
 * Reads GET /api/v1/settings/shop and, for owners, saves through
 * PATCH /api/v1/settings/shop/:id.
 *
 * The backend has no endpoint that creates a settings row, so a 404 is shown
 * as a limitation instead of pretending the values were saved.
 */
export function ShopSettingsSection({ canEdit }: { canEdit: boolean }) {
  const [load, setLoad] = useState<LoadState>({ status: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  const [form, setForm] = useState<FormState>({
    name: '',
    address: '',
    phone: '',
    currency: '',
    timezone: '',
    receiptFooter: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadSettings() {
      setLoad({ status: 'loading' });
      try {
        const settings = await fetchShopSettings();
        if (ignore) return;
        if (!settings) {
          setLoad({ status: 'missing' });
          return;
        }
        setForm(toForm(settings));
        setLoad({ status: 'ready', settings });
      } catch (err: unknown) {
        if (ignore) return;
        setLoad({
          status: 'error',
          message:
            err instanceof ApiError
              ? err.message
              : 'Unable to reach the backend. Check that it is running and try again.',
          code: err instanceof ApiError ? err.status : undefined,
        });
      }
    }

    loadSettings();
    return () => {
      ignore = true;
    };
  }, [reloadKey]);

  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setError(null);
    setSaved(false);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (load.status !== 'ready' || saving) return;

    const name = form.name.trim();
    const currency = form.currency.trim();
    const timezone = form.timezone.trim();

    if (!name) {
      setError('Enter the shop name.');
      return;
    }
    if (!currency) {
      setError('Enter the currency code, for example NGN.');
      return;
    }
    if (!timezone) {
      setError('Enter the timezone, for example Africa/Lagos.');
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const updated = await updateShopSettings(load.settings.id, {
        name,
        address: form.address.trim() || null,
        phone: form.phone.trim() || null,
        currency,
        timezone,
        receiptFooter: form.receiptFooter.trim() || null,
      });
      setLoad({ status: 'ready', settings: updated });
      setForm(toForm(updated));
      setSaved(true);
    } catch (err: unknown) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Unable to reach the backend. Check that it is running and try again.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      aria-labelledby="shop-heading"
      className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2
            id="shop-heading"
            className="text-sm font-bold text-[color:var(--color-ink)]"
          >
            Shop details
          </h2>
          <p className="text-xs text-[color:var(--color-muted)] mt-1">
            {canEdit
              ? 'Shown on receipts and reports. Only owners can change these.'
              : 'Only owners can change the shop details.'}
          </p>
        </div>
        {load.status === 'error' && (
          <button
            type="button"
            onClick={retry}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-[8px] border border-[color:var(--color-border)] text-xs font-semibold text-[color:var(--color-ink)] hover:bg-[color:var(--color-subtle)] transition-colors shrink-0"
          >
            <RefreshCwIcon size={14} />
            Retry
          </button>
        )}
      </div>

      {load.status === 'loading' && (
        <div className="mt-4 space-y-3 animate-pulse" aria-busy="true">
          {[...Array(3)].map((_, index) => (
            <div
              key={index}
              className="h-11 rounded-[8px] bg-[color:var(--color-subtle)]"
            />
          ))}
        </div>
      )}

      {load.status === 'missing' && (
        <div className="mt-4 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-subtle)] p-3">
          <p className="text-xs font-semibold text-[color:var(--color-ink)]">
            No shop settings row exists
          </p>
          <p className="text-xs text-[color:var(--color-muted)] mt-1">
            The backend returns 404 until a settings row is seeded, and it has no
            endpoint that creates one. Add the row in the backend before editing
            shop details here.
          </p>
        </div>
      )}

      {load.status === 'error' && (
        <div className="mt-4 flex items-start gap-3">
          <AlertCircleIcon
            size={18}
            className="shrink-0 mt-0.5 text-[color:var(--color-danger-ink)]"
          />
          <p className="text-xs text-[color:var(--color-muted)]">
            {load.message}
          </p>
        </div>
      )}

      {load.status === 'ready' && (
        <form className="mt-4 space-y-4" onSubmit={handleSubmit} noValidate>
          <Field
            id="shop-name"
            label="Shop name"
            value={form.name}
            onChange={(value) => update('name', value)}
            disabled={!canEdit || saving}
            required
          />
          <Field
            id="shop-address"
            label="Address"
            value={form.address}
            onChange={(value) => update('address', value)}
            disabled={!canEdit || saving}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              id="shop-phone"
              label="Phone"
              value={form.phone}
              onChange={(value) => update('phone', value)}
              disabled={!canEdit || saving}
              inputMode="tel"
            />
            <Field
              id="shop-currency"
              label="Currency code"
              value={form.currency}
              onChange={(value) => update('currency', value)}
              disabled={!canEdit || saving}
              required
            />
          </div>
          <Field
            id="shop-timezone"
            label="Timezone"
            value={form.timezone}
            onChange={(value) => update('timezone', value)}
            disabled={!canEdit || saving}
            required
          />
          <div>
            <label
              htmlFor="shop-receipt-footer"
              className="block text-xs font-semibold text-[color:var(--color-ink)] mb-1"
            >
              Receipt footer
            </label>
            <textarea
              id="shop-receipt-footer"
              value={form.receiptFooter}
              onChange={(event) => update('receiptFooter', event.target.value)}
              disabled={!canEdit || saving}
              rows={2}
              maxLength={500}
              placeholder="Thank you for your patronage."
              className="w-full px-3 py-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted)] focus:outline-none focus:border-[color:var(--color-accent)] resize-y disabled:bg-[color:var(--color-subtle)] disabled:text-[color:var(--color-quiet)] disabled:cursor-not-allowed"
            />
          </div>

          {error && (
            <div
              role="alert"
              className="flex gap-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-danger-bg)] p-3 text-xs text-[color:var(--color-danger-ink)]"
            >
              <AlertCircleIcon size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {saved && (
            <div
              role="status"
              className="flex gap-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-success-bg)] p-3 text-xs text-[color:var(--color-success-ink)]"
            >
              <CheckCircleIcon size={16} className="shrink-0 mt-0.5" />
              <span>Shop details saved.</span>
            </div>
          )}

          {canEdit && (
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="h-11 px-5 rounded-[8px] bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] text-sm font-semibold hover:bg-[color:var(--color-accent-hover)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? 'Saving…' : 'Save shop details'}
              </button>
            </div>
          )}
        </form>
      )}
    </section>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  disabled,
  required = false,
  inputMode,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  required?: boolean;
  inputMode?: 'text' | 'tel';
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-xs font-semibold text-[color:var(--color-ink)] mb-1"
      >
        {label}
        {required && <span aria-hidden="true"> *</span>}
      </label>
      <input
        id={id}
        type="text"
        inputMode={inputMode}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        required={required}
        className="w-full h-11 px-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] text-sm text-[color:var(--color-ink)] placeholder:text-[color:var(--color-muted)] focus:outline-none focus:border-[color:var(--color-accent)] disabled:bg-[color:var(--color-subtle)] disabled:text-[color:var(--color-quiet)] disabled:cursor-not-allowed"
      />
    </div>
  );
}
