import { useAuth } from '../../app/auth/auth-context';
import { TwoFactorSettings } from '../../components/settings/TwoFactorSettings';
import { PasskeySettings } from '../../components/settings/PasskeySettings';
import { ShieldIcon } from '../../components/ui/Icons';
import { BackNavigation } from '../../components/ui/BackNavigation';

/**
 * Owner-only security workspace. Access is enforced by `OwnerRoute`; the
 * backend additionally rejects passkey and 2FA management from non-owners.
 */
export function SecuritySettingsPage() {
  const { user, refreshSession } = useAuth();
  const twoFactorEnabled = user?.twoFactorEnabled === true;

  return (
    <div className="max-w-5xl space-y-6">
      <div>
        <BackNavigation fallback="/settings" label="Back to settings" />
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[color:var(--color-ink)] lg:text-[32px]">
          Security
        </h1>
        <p className="mt-1 text-sm text-[color:var(--color-muted)]">
          Owner-only sign-in protection for this account.
        </p>
      </div>

      <div className="flex gap-3 rounded-[12px] border border-[color:var(--color-border)] bg-[color:var(--color-subtle)] p-4 text-xs text-[color:var(--color-muted)]">
        <ShieldIcon
          size={18}
          className="mt-0.5 shrink-0 text-[color:var(--color-accent-ink)]"
        />
        <p>
          Staff accounts cannot open this page or call these security
          operations. The backend checks the owner role on every request.
        </p>
      </div>

      <TwoFactorSettings
        enabled={twoFactorEnabled}
        refreshSession={refreshSession}
      />

      <PasskeySettings twoFactorEnabled={twoFactorEnabled} />
    </div>
  );
}
