import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import {
  deletePasskey,
  formatPasskeyDate,
  isPasskeySupported,
  listPasskeys,
  passkeyBackupLabel,
  passkeyDeviceLabel,
  registerPasskey,
  renamePasskey,
  type Passkey,
} from '../../lib/api/passkeys';
import { describePasskeyError } from '../../lib/passkey-errors';
import { AlertCircleIcon, CheckCircleIcon, KeyIcon } from '../ui/Icons';
import { ConfirmDialog } from '../ui/ConfirmDialog';

interface PasskeySettingsProps {
  twoFactorEnabled: boolean;
}

function passkeyLabel(passkey: Passkey): string {
  return passkey.name?.trim() || 'Unnamed passkey';
}

/**
 * Owner-only passkey management. Registration and authentication run through
 * the Better Auth browser client; this component only validates the display
 * name and never handles raw challenges or credential payloads.
 */
export function PasskeySettings({ twoFactorEnabled }: PasskeySettingsProps) {
  const [passkeys, setPasskeys] = useState<Passkey[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [adding, setAdding] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renaming, setRenaming] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Passkey | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [supported] = useState(() => isPasskeySupported());
  const requestGeneration = useRef(0);

  const load = useCallback(async () => {
    const generation = ++requestGeneration.current;
    try {
      const list = await listPasskeys();
      if (requestGeneration.current === generation) {
        setPasskeys(list);
        setListError(null);
      }
    } catch (err: unknown) {
      if (requestGeneration.current === generation) {
        setListError(describePasskeyError(err));
      }
    } finally {
      if (requestGeneration.current === generation) {
        setLoading(false);
      }
    }
  }, []);

  const reload = useCallback(() => {
    setLoading(true);
    setListError(null);
    void load();
  }, [load]);

  useEffect(() => {
    const generation = ++requestGeneration.current;

    async function loadInitialPasskeys() {
      try {
        const list = await listPasskeys();
        if (requestGeneration.current === generation) {
          setPasskeys(list);
          setListError(null);
        }
      } catch (err: unknown) {
        if (requestGeneration.current === generation) {
          setListError(describePasskeyError(err));
        }
      } finally {
        if (requestGeneration.current === generation) {
          setLoading(false);
        }
      }
    }

    void loadInitialPasskeys();

    return () => {
      // Ignore a response that arrives after unmount or a navigation away.
      requestGeneration.current += 1;
    };
  }, []);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (adding) return;

    const trimmed = name.trim();
    if (!trimmed) {
      setActionError('Give this passkey a name, such as “My phone” or “Work laptop”.');
      return;
    }

    setAdding(true);
    setActionError(null);
    setNotice(null);
    try {
      await registerPasskey(trimmed);
      setName('');
      setNotice(`“${trimmed}” was added. Use it the next time you sign in.`);
      await load();
    } catch (err: unknown) {
      setActionError(describePasskeyError(err));
    } finally {
      setAdding(false);
    }
  }

  function startRename(passkey: Passkey) {
    setRenamingId(passkey.id);
    setRenameValue(passkey.name ?? '');
    setActionError(null);
    setNotice(null);
  }

  function cancelRename() {
    if (renaming) return;
    setRenamingId(null);
    setRenameValue('');
    setActionError(null);
  }

  async function handleRename(event: FormEvent<HTMLFormElement>, passkey: Passkey) {
    event.preventDefault();
    if (renaming) return;

    const trimmed = renameValue.trim();
    if (!trimmed) {
      setActionError('Enter a name for this passkey.');
      return;
    }

    setRenaming(true);
    setActionError(null);
    setNotice(null);
    try {
      await renamePasskey(passkey.id, trimmed);
      setRenamingId(null);
      setRenameValue('');
      setNotice('Passkey renamed.');
      await load();
    } catch (err: unknown) {
      setActionError(describePasskeyError(err));
    } finally {
      setRenaming(false);
    }
  }

  function openDelete(passkey: Passkey) {
    setDeleteTarget(passkey);
    setDeleteError(null);
    setActionError(null);
    setNotice(null);
  }

  function closeDelete() {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteError(null);
  }

  async function confirmDelete() {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await deletePasskey(deleteTarget.id);
      const removedName = passkeyLabel(deleteTarget);
      setDeleteTarget(null);
      setNotice(`“${removedName}” was removed.`);
      await load();
    } catch (err: unknown) {
      setDeleteError(describePasskeyError(err));
    } finally {
      setDeleting(false);
    }
  }

  const onlyPasskey = passkeys?.length === 1;

  return (
    <section
      aria-labelledby="passkey-heading"
      className="rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-5"
    >
      <div className="flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        <h2 id="passkey-heading" className="text-sm font-bold text-[color:var(--color-ink)]">
          Passkeys
        </h2>
        <span className="inline-flex shrink-0 items-center rounded-[4px] px-2 py-0.5 text-[11px] font-semibold bg-[color:var(--color-subtle)] text-[color:var(--color-muted)]">
          {passkeys && passkeys.length > 0
            ? `${passkeys.length} registered`
            : 'None registered'}
        </span>
      </div>
      <p className="mt-1 text-xs text-[color:var(--color-muted)]">
        Sign in with your fingerprint, face, device PIN, or a security key
        instead of typing your password. Passkeys are separate from
        authenticator-app 2FA.
      </p>

      {notice && (
        <div role="status" className="mt-4 flex gap-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-success-bg)] p-3 text-xs text-[color:var(--color-success-ink)]">
          <CheckCircleIcon size={16} className="mt-0.5 shrink-0" />
          <span>{notice}</span>
        </div>
      )}
      {actionError && (
        <div role="alert" className="mt-4 flex gap-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-danger-bg)] p-3 text-xs text-[color:var(--color-danger-ink)]">
          <AlertCircleIcon size={16} className="mt-0.5 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {!supported ? (
        <div className="mt-4 flex gap-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-warning-bg)] p-3 text-xs text-[color:var(--color-warning-ink)]">
          <AlertCircleIcon size={16} className="mt-0.5 shrink-0" />
          <span>
            This browser or connection does not support passkeys. Use a current
            browser over HTTPS (or localhost) to add or use one.
          </span>
        </div>
      ) : (
        <form onSubmit={handleAdd} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 text-xs font-semibold text-[color:var(--color-ink)]">
            Passkey name
            <input
              type="text"
              autoComplete="off"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setActionError(null);
              }}
              placeholder="My phone"
              className="mt-2 h-11 w-full rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={adding}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[8px] bg-[color:var(--color-accent)] px-4 text-xs font-semibold text-[color:var(--color-on-accent)] disabled:opacity-60 sm:w-auto"
          >
            <KeyIcon size={16} />
            {adding ? 'Waiting for device…' : 'Add passkey'}
          </button>
        </form>
      )}

      <p className="mt-2 text-[11px] text-[color:var(--color-muted)]">
        Your browser will ask you to confirm with your device before anything
        is saved. The passkey stays on your device or password manager.
      </p>

      <div className="mt-5">
        {loading ? (
          <div aria-busy="true" className="space-y-2">
            <span className="sr-only">Loading passkeys…</span>
            <div className="h-14 animate-pulse rounded-[8px] bg-[color:var(--color-subtle)]" />
            <div className="h-14 animate-pulse rounded-[8px] bg-[color:var(--color-subtle)]" />
          </div>
        ) : listError ? (
          <div role="alert" className="flex flex-col items-start gap-3 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-danger-bg)] p-3 text-xs text-[color:var(--color-danger-ink)] sm:flex-row sm:items-center sm:justify-between">
            <span className="flex gap-2">
              <AlertCircleIcon size={16} className="mt-0.5 shrink-0" />
              {listError}
            </span>
            <button
              type="button"
              onClick={reload}
              className="h-11 shrink-0 rounded-[8px] border border-[color:var(--color-border)] px-3 text-xs font-semibold text-[color:var(--color-ink)] hover:bg-[color:var(--color-surface)] sm:h-9"
            >
              Retry
            </button>
          </div>
        ) : passkeys && passkeys.length > 0 ? (
          <ul className="divide-y divide-[color:var(--color-border)]" aria-label="Registered passkeys">
            {passkeys.map((passkey) => {
              const details = [
                formatPasskeyDate(passkey.createdAt),
                passkeyDeviceLabel(passkey.deviceType),
                passkeyBackupLabel(passkey.backedUp),
              ].filter((detail): detail is string => Boolean(detail));

              return (
                <li key={passkey.id} className="py-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-[color:var(--color-ink)]">
                        {passkeyLabel(passkey)}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[color:var(--color-muted)]">
                        {details.join(' · ')}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => startRename(passkey)}
                        disabled={renamingId === passkey.id || adding || deleting}
                        className="inline-flex h-11 items-center rounded-[8px] px-2 text-xs font-semibold text-[color:var(--color-accent-ink)] hover:bg-[color:var(--color-subtle)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--color-accent)] disabled:opacity-60 sm:h-9"
                      >
                        Rename
                      </button>
                      <button
                        type="button"
                        onClick={() => openDelete(passkey)}
                        disabled={adding || deleting}
                        className="inline-flex h-11 items-center rounded-[8px] px-2 text-xs font-semibold text-[color:var(--color-danger-ink)] hover:bg-[color:var(--color-danger-bg)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--color-accent)] disabled:opacity-60 sm:h-9"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {renamingId === passkey.id && (
                    <form
                      onSubmit={(event) => void handleRename(event, passkey)}
                      className="mt-3 flex flex-col gap-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-subtle)] p-3 sm:flex-row sm:items-end"
                    >
                      <label className="flex-1 text-xs font-semibold text-[color:var(--color-ink)]">
                        New name
                        <input
                          type="text"
                          autoComplete="off"
                          autoFocus
                          value={renameValue}
                          onChange={(event) => {
                            setRenameValue(event.target.value);
                            setActionError(null);
                          }}
                          className="mt-2 h-11 w-full rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] px-3 text-sm"
                        />
                      </label>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <button
                          type="button"
                          onClick={cancelRename}
                          disabled={renaming}
                          className="h-11 rounded-[8px] px-3 text-xs font-semibold text-[color:var(--color-muted)] hover:bg-[color:var(--color-surface)] disabled:opacity-60 sm:h-9"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={renaming || !renameValue.trim()}
                          className="h-11 rounded-[8px] bg-[color:var(--color-accent)] px-4 text-xs font-semibold text-[color:var(--color-on-accent)] disabled:opacity-60 sm:h-9"
                        >
                          {renaming ? 'Saving…' : 'Save name'}
                        </button>
                      </div>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-[8px] border border-dashed border-[color:var(--color-border)] p-4 text-center">
            <p className="text-xs font-semibold text-[color:var(--color-ink)]">
              No passkeys yet
            </p>
            <p className="mt-1 text-[11px] text-[color:var(--color-muted)]">
              Add one above to sign in without typing your password.
            </p>
          </div>
        )}
      </div>

      {deleteTarget && (
        <ConfirmDialog
          title="Delete this passkey?"
          description={
            <>
              <p>
                “{passkeyLabel(deleteTarget)}” will be removed from your account
                and can no longer sign you in.
              </p>
              {onlyPasskey ? (
                <p className="font-semibold text-[color:var(--color-warning-ink)]">
                  {twoFactorEnabled
                    ? 'This is your only passkey. Authenticator-app 2FA stays enabled, so you can still sign in with your password and authenticator code.'
                    : 'This is your only passkey. You will still be able to sign in with your password, but passkey sign-in will be unavailable until you add another one.'}
                </p>
              ) : (
                <p>Your other passkeys and your password are unaffected.</p>
              )}
            </>
          }
          confirmLabel="Delete passkey"
          busyLabel="Deleting…"
          busy={deleting}
          onConfirm={() => void confirmDelete()}
          onCancel={closeDelete}
        >
          {deleteError && (
            <div role="alert" className="flex gap-2 rounded-[8px] border border-[color:var(--color-border)] bg-[color:var(--color-danger-bg)] p-3 text-xs text-[color:var(--color-danger-ink)]">
              <AlertCircleIcon size={16} className="mt-0.5 shrink-0" />
              <span>{deleteError}</span>
            </div>
          )}
        </ConfirmDialog>
      )}
    </section>
  );
}
