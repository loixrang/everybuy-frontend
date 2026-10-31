import { useEffect, useId, useState, type FormEvent } from 'react';
import { ApiError } from '../../lib/api/client';
import {
  createBrand,
  createCategory,
  fetchBrands,
  fetchCategories,
  setBrandActive,
  setCategoryActive,
} from '../../lib/api/products';
import type { Brand, Category } from '../../types/product';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { BackNavigation } from '../../components/ui/BackNavigation';

type CatalogTab = 'categories' | 'brands';
type CatalogRecord = Category | Brand;

export function CatalogManagementPage() {
  const [tab, setTab] = useState<CatalogTab>('categories');
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState<CatalogRecord | null>(null);
  const [pendingBusy, setPendingBusy] = useState(false);
  const inputId = useId();

  async function load(initial = false) {
    if (!initial) {
      setLoading(true);
      setLoadError(null);
    }
    try {
      const [categoryRows, brandRows] = await Promise.all([fetchCategories(), fetchBrands()]);
      setCategories(categoryRows);
      setBrands(brandRows);
    } catch (cause: unknown) {
      setLoadError(toMessage(cause, 'Unable to load categories and brands.'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) return load(true);
      return undefined;
    });
    return () => { cancelled = true; };
  }, []);

  const records = tab === 'categories' ? categories : brands;
  const title = tab === 'categories' ? 'category' : 'brand';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const trimmed = name.trim();
    if (!trimmed) { setError(`Enter a ${title} name.`); return; }
    if (trimmed.length > 120) { setError('Keep the name to 120 characters or fewer.'); return; }
    setBusy(true); setError(null); setNotice(null);
    try {
      const created = tab === 'categories' ? await createCategory(trimmed) : await createBrand(trimmed);
      if (tab === 'categories') setCategories((items) => [...items, created]);
      else setBrands((items) => [...items, created]);
      setName('');
      setNotice(`${title[0].toUpperCase()}${title.slice(1)} created.`);
    } catch (cause: unknown) {
      setError(toMessage(cause, `Unable to create ${title}.`));
    } finally { setBusy(false); }
  }

  async function confirmToggle() {
    if (!pending || pendingBusy) return;
    setPendingBusy(true); setError(null); setNotice(null);
    try {
      const updated = tab === 'categories'
        ? await setCategoryActive(pending.id, !pending.active)
        : await setBrandActive(pending.id, !pending.active);
      if (tab === 'categories') setCategories((items) => items.map((row) => row.id === updated.id ? { ...row, active: updated.active } : row));
      else setBrands((items) => items.map((row) => row.id === updated.id ? { ...row, active: updated.active } : row));
      setNotice(`${title[0].toUpperCase()}${title.slice(1)} ${updated.active ? 'reactivated' : 'deactivated'}.`);
      setPending(null);
    } catch (cause: unknown) {
      setError(toMessage(cause, `Unable to update ${title} status.`));
      setPending(null);
    } finally { setPendingBusy(false); }
  }

  return (
    <div className="max-w-4xl space-y-6">
      <header>
        <BackNavigation fallback="/settings" label="Back to settings" />
        <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-ink)] sm:text-[32px]">Categories &amp; brands</h1>
        <p className="mt-1 text-sm text-[color:var(--color-muted)]">Manage product categories and brands used in your inventory.</p>
      </header>

      <div role="tablist" aria-label="Catalog type" className="flex gap-2 border-b border-[color:var(--color-border)]">
        {(['categories', 'brands'] as const).map((item) => (
          <button key={item} role="tab" aria-selected={tab === item} type="button" onClick={() => { setTab(item); setName(''); setError(null); setNotice(null); }}
            className={`h-11 border-b-2 px-4 text-sm font-semibold capitalize ${tab === item ? 'border-[color:var(--color-accent)] text-[color:var(--color-accent-ink)]' : 'border-transparent text-[color:var(--color-muted)]'}`}>
            {item}
          </button>
        ))}
      </div>

      <form onSubmit={(event) => void submit(event)} className="flex flex-col gap-3 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-4 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor={inputId} className="mb-1.5 block text-xs font-semibold text-[color:var(--color-ink)]">New {title} name</label>
          <input id={inputId} value={name} maxLength={120} onChange={(event) => setName(event.target.value)} placeholder={`e.g. ${tab === 'categories' ? 'Baby care' : 'Molfix'}`} disabled={busy}
            className="h-11 w-full rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--color-accent)] disabled:opacity-60" />
        </div>
        <button type="submit" disabled={busy || !name.trim()} className="h-11 rounded-[8px] bg-[color:var(--color-accent)] px-5 text-sm font-semibold text-[color:var(--color-on-accent)] disabled:cursor-not-allowed disabled:opacity-60">{busy ? 'Creating…' : `Add ${title}`}</button>
      </form>

      {notice && <p role="status" className="rounded-[8px] bg-[color:var(--color-success-bg)] p-3 text-sm text-[color:var(--color-success-ink)]">{notice}</p>}
      {error && <p role="alert" className="rounded-[8px] bg-[color:var(--color-danger-bg)] p-3 text-sm text-[color:var(--color-danger-ink)]">{error}</p>}

      <section aria-label={`${tab} list`} className="overflow-hidden rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
        <div className="flex items-center justify-between border-b border-[color:var(--color-border)] px-4 py-3">
          <h2 className="text-sm font-bold capitalize text-[color:var(--color-ink)]">All {tab}</h2>
          <button type="button" onClick={() => void load()} disabled={loading} className="h-9 rounded-[8px] px-3 text-xs font-semibold text-[color:var(--color-accent-ink)] disabled:opacity-60">{loading ? 'Loading…' : 'Refresh'}</button>
        </div>
        {loading ? <p role="status" className="p-6 text-sm text-[color:var(--color-muted)]">Loading {tab}…</p>
          : loadError ? <div className="p-6"><p role="alert" className="text-sm text-[color:var(--color-danger-ink)]">{loadError}</p><button type="button" onClick={() => void load()} className="mt-3 text-sm font-semibold text-[color:var(--color-accent-ink)]">Try again</button></div>
          : records.length === 0 ? <p className="p-6 text-sm text-[color:var(--color-muted)]">No {tab} yet. Add the first one above.</p>
          : <ul className="divide-y divide-[color:var(--color-border)]">{records.map((record) => (
            <li key={record.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0"><p className={`truncate text-sm font-semibold ${record.active ? 'text-[color:var(--color-ink)]' : 'text-[color:var(--color-muted)]'}`}>{record.name}</p>
                <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${record.active ? 'bg-[color:var(--color-success-bg)] text-[color:var(--color-success-ink)]' : 'bg-[color:var(--color-subtle)] text-[color:var(--color-muted)]'}`}>{record.active ? 'Active' : 'Inactive'}</span></div>
              <button type="button" onClick={() => setPending(record)} disabled={busy || pendingBusy} className="min-h-11 shrink-0 rounded-[8px] border border-[color:var(--color-border)] px-3 text-xs font-semibold text-[color:var(--color-ink)] disabled:opacity-60">{record.active ? 'Deactivate' : 'Reactivate'}</button>
            </li>
          ))}</ul>}
      </section>

      {pending && <ConfirmDialog title={`${pending.active ? 'Deactivate' : 'Reactivate'} ${title}?`}
        description={pending.active ? `“${pending.name}” will remain in your records and existing product history will be kept.` : `“${pending.name}” will be available again for product setup.`}
        confirmLabel={pending.active ? 'Deactivate' : 'Reactivate'} busyLabel={pending.active ? 'Deactivating…' : 'Reactivating…'} busy={pendingBusy}
        tone={pending.active ? 'danger' : 'default'} onCancel={() => setPending(null)} onConfirm={() => void confirmToggle()} />}
    </div>
  );
}

function toMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Your session has expired. Sign in again to continue.';
    if (error.status === 403) return 'Only an owner can manage categories and brands.';
    if (error.status === 409) return 'A record with that name already exists.';
    return error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}
