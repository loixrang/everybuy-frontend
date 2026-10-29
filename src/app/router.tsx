import { Routes, Route, Navigate } from 'react-router-dom';
import { GuestRoute, ProtectedRoute } from '../app/auth/RouteGuards';
import { InventoryLayout } from '../components/layout/InventoryLayout';
import { SignInPage } from '../pages/auth/SignInPage';
import { InventoryPage } from '../pages/inventory/InventoryPage';
import { ProductDetailPage } from '../pages/inventory/ProductDetailPage';
import { ProductSetupPage } from '../pages/inventory/ProductSetupPage';
import { StockMovementsPage } from '../pages/stock/StockMovementsPage';
import { ReceiveStockPage } from '../pages/stock/ReceiveStockPage';
import { RecordSalePage } from '../pages/sales/RecordSalePage';
import { SalesPage } from '../pages/sales/SalesPage';
import { SaleDetailPage } from '../pages/sales/SaleDetailPage';
import { CustomersPage } from '../pages/customers/CustomersPage';
import { CustomerDetailPage } from '../pages/customers/CustomerDetailPage';
import { CustomerEditPage } from '../pages/customers/CustomerEditPage';
import { OverviewPage } from '../pages/reports/OverviewPage';
import { SettingsPage } from '../pages/settings/SettingsPage';
import { AcceptInvitePage } from '../pages/auth/AcceptInvitePage';
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage';
import { ExpensesPage } from '../pages/expenses/ExpensesPage';
import { AuditPage } from '../pages/audit/AuditPage';

export function AppRouter() {
  return (
    <Routes>
      <Route path="/accept-invite" element={<AcceptInvitePage />} />
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
          <Route path="/team" element={<Navigate to="/settings" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
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
