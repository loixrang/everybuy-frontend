import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { GuestRoute, OwnerRoute, ProtectedRoute } from '../app/auth/RouteGuards';

const InventoryLayout = lazy(() =>
  import('../components/layout/InventoryLayout').then((module) => ({
    default: module.InventoryLayout,
  })),
);
const SignInPage = lazy(() =>
  import('../pages/auth/SignInPage').then((module) => ({
    default: module.SignInPage,
  })),
);
const InventoryPage = lazy(() =>
  import('../pages/inventory/InventoryPage').then((module) => ({
    default: module.InventoryPage,
  })),
);
const ProductDetailPage = lazy(() =>
  import('../pages/inventory/ProductDetailPage').then((module) => ({
    default: module.ProductDetailPage,
  })),
);
const ProductSetupPage = lazy(() =>
  import('../pages/inventory/ProductSetupPage').then((module) => ({
    default: module.ProductSetupPage,
  })),
);
const StockMovementsPage = lazy(() =>
  import('../pages/stock/StockMovementsPage').then((module) => ({
    default: module.StockMovementsPage,
  })),
);
const StockTakesPage = lazy(() =>
  import('../pages/stocktakes/StockTakesPage').then((module) => ({
    default: module.StockTakesPage,
  })),
);
const StockTakeDetailPage = lazy(() =>
  import('../pages/stocktakes/StockTakeDetailPage').then((module) => ({
    default: module.StockTakeDetailPage,
  })),
);
const ReceiveStockPage = lazy(() =>
  import('../pages/stock/ReceiveStockPage').then((module) => ({
    default: module.ReceiveStockPage,
  })),
);
const RecordSalePage = lazy(() =>
  import('../pages/sales/RecordSalePage').then((module) => ({
    default: module.RecordSalePage,
  })),
);
const SalesPage = lazy(() =>
  import('../pages/sales/SalesPage').then((module) => ({
    default: module.SalesPage,
  })),
);
const SaleDetailPage = lazy(() =>
  import('../pages/sales/SaleDetailPage').then((module) => ({
    default: module.SaleDetailPage,
  })),
);
const CustomersPage = lazy(() =>
  import('../pages/customers/CustomersPage').then((module) => ({
    default: module.CustomersPage,
  })),
);
const CustomerDetailPage = lazy(() =>
  import('../pages/customers/CustomerDetailPage').then((module) => ({
    default: module.CustomerDetailPage,
  })),
);
const CustomerEditPage = lazy(() =>
  import('../pages/customers/CustomerEditPage').then((module) => ({
    default: module.CustomerEditPage,
  })),
);
const OverviewPage = lazy(() =>
  import('../pages/reports/OverviewPage').then((module) => ({
    default: module.OverviewPage,
  })),
);
const SettingsPage = lazy(() =>
  import('../pages/settings/SettingsPage').then((module) => ({
    default: module.SettingsPage,
  })),
);
const SecuritySettingsPage = lazy(() =>
  import('../pages/settings/SecuritySettingsPage').then((module) => ({
    default: module.SecuritySettingsPage,
  })),
);
const CatalogManagementPage = lazy(() =>
  import('../pages/settings/CatalogManagementPage').then((module) => ({
    default: module.CatalogManagementPage,
  })),
);
const AcceptInvitePage = lazy(() =>
  import('../pages/auth/AcceptInvitePage').then((module) => ({
    default: module.AcceptInvitePage,
  })),
);
const ForgotPasswordPage = lazy(() =>
  import('../pages/auth/ForgotPasswordPage').then((module) => ({
    default: module.ForgotPasswordPage,
  })),
);
const ResetPasswordPage = lazy(() =>
  import('../pages/auth/ResetPasswordPage').then((module) => ({
    default: module.ResetPasswordPage,
  })),
);
const ExpensesPage = lazy(() =>
  import('../pages/expenses/ExpensesPage').then((module) => ({
    default: module.ExpensesPage,
  })),
);
const AuditPage = lazy(() =>
  import('../pages/audit/AuditPage').then((module) => ({
    default: module.AuditPage,
  })),
);

export function AppRouter() {
  const location = useLocation();

  useEffect(() => {
    document.title = `${getPageTitle(location.pathname)} | Everybuy`;
  }, [location.pathname]);

  return (
    <Suspense fallback={<RouteLoading />}>
      <Routes>
        {/* Public routes: never wrapped in ProtectedRoute or the dashboard. */}
        <Route path="/invite/accept" element={<AcceptInvitePage />} />
        <Route path="/accept-invite" element={<LegacyInviteRedirect />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<GuestRoute />}>
          <Route path="/signin" element={<SignInPage />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<InventoryLayout />}>
            <Route index element={<Navigate to="/inventory" replace />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/inventory/new" element={<ProductSetupPage />} />
            <Route path="/inventory/receive" element={<ReceiveStockPage />} />
            <Route path="/inventory/:id" element={<ProductDetailPage />} />
            <Route path="/inventory/:id/edit" element={<ProductSetupPage />} />
            <Route path="/movements" element={<StockMovementsPage />} />
            <Route path="/stocktakes" element={<StockTakesPage />} />
            <Route path="/stocktakes/:id" element={<StockTakeDetailPage />} />
            <Route path="/sales" element={<SalesPage />} />
            <Route path="/sales/new" element={<RecordSalePage />} />
            <Route path="/sales/:id" element={<SaleDetailPage />} />
            <Route path="/customers" element={<CustomersPage />} />
            <Route path="/customers/:id" element={<CustomerDetailPage />} />
            <Route path="/customers/:id/edit" element={<CustomerEditPage />} />
            <Route path="/expenses" element={<ExpensesPage />} />
            <Route path="/audit" element={<AuditPage />} />
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route element={<OwnerRoute />}>
              <Route path="/settings/security" element={<SecuritySettingsPage />} />
              <Route path="/settings/catalog" element={<CatalogManagementPage />} />
            </Route>
            <Route path="/team" element={<Navigate to="/settings" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Route>
      </Routes>
    </Suspense>
  );
}

function LegacyInviteRedirect() {
  const { search } = useLocation();
  return <Navigate to={`/invite/accept${search}`} replace />;
}

function getPageTitle(pathname: string): string {
  if (pathname === '/signin') return 'Sign in';
  if (pathname === '/invite/accept' || pathname === '/accept-invite') {
    return 'Accept invitation';
  }
  if (pathname === '/forgot-password') return 'Forgot password';
  if (pathname === '/reset-password') return 'Reset password';
  if (pathname.startsWith('/inventory/new')) return 'New product';
  if (pathname.startsWith('/inventory/receive')) return 'Receive stock';
  if (/^\/inventory\/[^/]+\/edit/.test(pathname)) return 'Edit product';
  if (pathname.startsWith('/inventory/')) return 'Product details';
  if (pathname.startsWith('/inventory')) return 'Inventory';
  if (pathname.startsWith('/movements')) return 'Stock movements';
  if (pathname.startsWith('/stocktakes/')) return 'Stocktake';
  if (pathname.startsWith('/stocktakes')) return 'Stocktakes';
  if (pathname.startsWith('/sales/new')) return 'Record a sale';
  if (/^\/sales\/[^/]+/.test(pathname)) return 'Sale details';
  if (pathname.startsWith('/sales')) return 'Sales';
  if (/^\/customers\/[^/]+\/edit/.test(pathname)) return 'Edit customer';
  if (/^\/customers\/[^/]+/.test(pathname)) return 'Customer statement';
  if (pathname.startsWith('/customers')) return 'Customers';
  if (pathname.startsWith('/expenses')) return 'Expenses';
  if (pathname.startsWith('/audit')) return 'Audit log';
  if (pathname.startsWith('/overview')) return 'Reports';
  if (pathname === '/settings/security') return 'Security';
  if (pathname === '/settings/catalog') return 'Categories & brands';
  if (pathname.startsWith('/settings') || pathname.startsWith('/team')) {
    return 'Settings';
  }
  return 'Page not found';
}

function RouteLoading() {
  return (
    <main
      aria-live="polite"
      aria-busy="true"
      className="grid min-h-dvh place-items-center bg-[color:var(--color-canvas)] px-5 text-sm text-[color:var(--color-muted)]"
    >
      Loading Everybuy…
    </main>
  );
}

function NotFoundPage() {
  return (
    <div className="space-y-4 text-center py-12">
      <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-ink)]">
        Page Not Found
      </h1>
      <p className="text-sm text-[color:var(--color-muted)]">
        The page you are looking for does not exist.
      </p>
    </div>
  );
}
