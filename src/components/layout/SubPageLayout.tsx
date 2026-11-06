import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AppHeader } from './AppHeader';
import { DesktopSidebar } from './DesktopSidebar';
import { useSignOut } from '../../lib/hooks/useSignOut';

type BackTarget = {
  fallback: string | ((pathname: string) => string);
  label: string;
};

/**
 * Shell for screens that are not primary destinations. It deliberately omits
 * the fixed mobile tab bar so the on-screen keyboard cannot lift navigation
 * over a form. Form screens pass `back` to put the back action in the header.
 */
export function SubPageLayout({ back }: { back?: BackTarget }) {
  const { pathname } = useLocation();
  const { signingOut, signOutError, clearSignOutError, signOut } = useSignOut();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [pathname]);

  return (
    <div className="min-h-dvh bg-[color:var(--color-canvas)] text-[color:var(--color-ink)] flex flex-col">
      <AppHeader
        back={back}
        signingOut={signingOut}
        signOutError={signOutError}
        onSignOut={() => void signOut()}
        onDismissSignOutError={clearSignOutError}
      />

      <div className="flex-1 flex max-w-[1440px] w-full mx-auto">
        <DesktopSidebar />
        <main className="flex-1 min-w-0 px-4 sm:px-5 pt-5 sm:pt-6 lg:px-12 lg:pt-8 pb-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
