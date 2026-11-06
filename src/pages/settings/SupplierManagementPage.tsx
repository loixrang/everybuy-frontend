import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { ApiError } from '../../lib/api/client';
import { createSupplier, fetchSuppliers, updateSupplier } from '../../lib/api/stock';
import type { Supplier } from '../../types/stock';

export function SupplierManagementPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Supplier | null>(null);
  const [toggleBusy, setToggleBusy] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setLoadError(null);
    try { setSuppliers(await fetchSuppliers()); }
    catch (cause: unknown) { setLoadError(message(cause, 'Unable to load suppliers.')); }
    finally { setLoading(false); }
  }

  useEffect(() => {
    let cancelled = false;
    void Promise.resolve().then(() => cancelled ? undefined : load());
    return () => { cancelled = true; };
  }, []);

  function startEdit(supplier: Supplier) {
    setEditing(supplier);
    setDialogError(null);
    setNotice(null);
    setDialogOpen(true);
  }

  function closeDialog() {
    if (busy) return;
    setDialogOpen(false);
    setEditing(null);
    setDialogError(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>, name: string, phone: string) {
    event.preventDefault();
    if (busy) return;
    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    if (!cleanName) { setDialogError('Enter a supplier name.'); return; }
    if (cleanName.length > 255) { setDialogError('Supplier name is too long.'); return; }
    if (cleanPhone.length > 100) { setDialogError('Phone number is too long.'); return; }
    setBusy(true); setDialogError(null); setNotice(null);
    try {
      const updated = editing
        ? await updateSupplier(editing.id, { name: cleanName, phone: cleanPhone || null })
        : await createSupplier({ name: cleanName, ...(cleanPhone ? { phone: cleanPhone } : {}) });
      setSuppliers((rows) => editing
        ? rows.map((row) => row.id === updated.id ? updated : row)
        : [...rows, updated]);
      setNotice(editing ? 'Supplier details saved.' : 'Supplier added.');
      setDialogOpen(false);
      setEditing(null);
    } catch (cause: unknown) { setDialogError(message(cause, 'Unable to save supplier.')); }
    finally { setBusy(false); }
  }

  async function toggleActive() {
    if (!pending || toggleBusy) return;
    setToggleBusy(true); setNotice(null);
    try {
      const updated = await updateSupplier(pending.id, { active: !pending.active });
      setSuppliers((rows) => rows.map((row) => row.id === updated.id ? updated : row));
      setNotice(`${updated.name} ${updated.active ? 'reactivated' : 'deactivated'}.`);
    } catch (cause: unknown) { setNotice(message(cause, 'Unable to update supplier status.')); }
    finally { setToggleBusy(false); setPending(null); }
  }

  return <div className="max-w-4xl space-y-6">
    <div className="flex items-start justify-between gap-4">
      <div>
      <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-ink)] sm:text-[32px]">Suppliers</h1>
      <p className="mt-1 text-sm text-[color:var(--color-muted)]">Maintain supplier contacts for stock receipts.</p>
      </div>
      <button type="button" onClick={() => { setEditing(null); setDialogError(null); setDialogOpen(true); }} className="h-11 shrink-0 rounded-[8px] bg-[color:var(--color-accent)] px-4 text-sm font-semibold text-[color:var(--color-on-accent)]">Add supplier</button>
    </div>

    {notice && <p role="status" className="rounded-[8px] bg-[color:var(--color-success-bg)] p-3 text-sm text-[color:var(--color-success-ink)]">{notice}</p>}
    {loadError && <div role="alert" className="rounded-[8px] bg-[color:var(--color-danger-bg)] p-3 text-sm text-[color:var(--color-danger-ink)]">{loadError} <button type="button" onClick={() => void load()} className="ml-2 font-semibold underline">Try again</button></div>}

    <section className="overflow-hidden rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)]">
      <div className="flex items-center justify-between border-b border-[color:var(--color-border)] px-4 py-3"><h2 className="text-sm font-bold text-[color:var(--color-ink)]">All suppliers</h2><button type="button" onClick={() => void load()} disabled={loading} className="h-9 rounded-[8px] px-3 text-xs font-semibold text-[color:var(--color-accent-ink)] disabled:opacity-60">{loading ? 'Loading…' : 'Refresh'}</button></div>
      {loading ? <p role="status" className="p-6 text-sm text-[color:var(--color-muted)]">Loading suppliers…</p>
        : loadError ? null
        : suppliers.length === 0 ? <p className="p-6 text-sm text-[color:var(--color-muted)]">No suppliers yet. Add the first one above.</p>
        : <ul className="divide-y divide-[color:var(--color-border)]">{suppliers.map((supplier) => <li key={supplier.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0"><p className={`truncate text-sm font-semibold ${supplier.active ? 'text-[color:var(--color-ink)]' : 'text-[color:var(--color-muted)]'}`}>{supplier.name}</p><p className="mt-0.5 text-xs text-[color:var(--color-muted)]">{supplier.phone || 'No phone added'}</p><span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${supplier.active ? 'bg-[color:var(--color-success-bg)] text-[color:var(--color-success-ink)]' : 'bg-[color:var(--color-subtle)] text-[color:var(--color-muted)]'}`}>{supplier.active ? 'Active' : 'Inactive'}</span></div>
          <div className="flex gap-2"><button type="button" disabled={busy || toggleBusy} onClick={() => startEdit(supplier)} className="h-11 rounded-[8px] border border-[color:var(--color-border)] px-4 text-xs font-semibold disabled:opacity-60">Edit</button><button type="button" disabled={busy || toggleBusy} onClick={() => setPending(supplier)} className="h-11 rounded-[8px] border border-[color:var(--color-border)] px-4 text-xs font-semibold disabled:opacity-60">{supplier.active ? 'Deactivate' : 'Reactivate'}</button></div>
        </li>)}</ul>}
    </section>
    {dialogOpen && <SupplierFormDialog supplier={editing} busy={busy} error={dialogError} onClose={closeDialog} onSubmit={(event, formName, formPhone) => void submit(event, formName, formPhone)} />}
    {pending && <ConfirmDialog title={`${pending.active ? 'Deactivate' : 'Reactivate'} supplier?`} description={pending.active ? `“${pending.name}” will be unavailable for new stock receipts. Existing stock and transaction history will remain.` : `“${pending.name}” will become available for new stock receipts again.`} confirmLabel={pending.active ? 'Deactivate' : 'Reactivate'} busyLabel={pending.active ? 'Deactivating…' : 'Reactivating…'} busy={toggleBusy} tone={pending.active ? 'danger' : 'default'} onCancel={() => setPending(null)} onConfirm={() => void toggleActive()} />}
  </div>;
}

function message(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 401) return 'Your session has expired. Sign in again to continue.';
    if (error.status === 403) return 'Only an owner can manage suppliers.';
    return error.message || fallback;
  }
  return error instanceof Error ? error.message : fallback;
}

function SupplierFormDialog({
  supplier,
  busy,
  error,
  onClose,
  onSubmit,
}: {
  supplier: Supplier | null;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>, name: string, phone: string) => void;
}) {
  const [name, setName] = useState(supplier?.name ?? '');
  const [phone, setPhone] = useState(supplier?.phone ?? '');
  const titleId = useId();
  const nameId = useId();
  const phoneId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.querySelector<HTMLElement>('input')?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !busy) { event.preventDefault(); onClose(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      previousFocus?.focus();
    };
  }, [busy, onClose]);

  return <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
    <button type="button" aria-label="Close dialog" onClick={() => { if (!busy) onClose(); }} className="absolute inset-0 glass-backdrop" />
    <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} className="glass-panel relative max-h-[92dvh] w-full overflow-y-auto rounded-t-[16px] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:max-w-[480px] sm:rounded-[12px] sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <h2 id={titleId} className="text-lg font-bold text-[color:var(--color-ink)]">{supplier ? 'Edit supplier' : 'Add supplier'}</h2>
        <button type="button" aria-label="Close" disabled={busy} onClick={onClose} className="h-11 w-11 rounded-[8px] text-xl text-[color:var(--color-muted)] hover:bg-[color:var(--color-subtle)] disabled:opacity-50">×</button>
      </div>
      <form className="mt-5 space-y-4" onSubmit={(event) => onSubmit(event, name, phone)}>
        <div><label htmlFor={nameId} className="mb-1.5 block text-xs font-semibold text-[color:var(--color-ink)]">Supplier name *</label><input id={nameId} required maxLength={255} value={name} disabled={busy} onChange={(event) => setName(event.target.value)} className="h-11 w-full rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--color-accent)] disabled:opacity-60" /></div>
        <div><label htmlFor={phoneId} className="mb-1.5 block text-xs font-semibold text-[color:var(--color-ink)]">Phone</label><input id={phoneId} type="tel" maxLength={100} value={phone} disabled={busy} onChange={(event) => setPhone(event.target.value)} className="h-11 w-full rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm text-[color:var(--color-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--color-accent)] disabled:opacity-60" /></div>
        {error && <p role="alert" className="rounded-[8px] bg-[color:var(--color-danger-bg)] p-3 text-sm text-[color:var(--color-danger-ink)]">{error}</p>}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" disabled={busy} onClick={onClose} className="h-11 rounded-[8px] border border-[color:var(--color-border)] px-4 text-sm font-semibold disabled:opacity-60">Cancel</button>
          <button type="submit" disabled={busy || !name.trim()} className="h-11 rounded-[8px] bg-[color:var(--color-accent)] px-5 text-sm font-semibold text-[color:var(--color-on-accent)] disabled:cursor-not-allowed disabled:opacity-60">{busy ? 'Saving…' : supplier ? 'Save changes' : 'Add supplier'}</button>
        </div>
      </form>
    </div>
  </div>;
}
