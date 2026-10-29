import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { GuestRoute, ProtectedRoute } from '../app/auth/RouteGuards';
import { InventoryLayout } from '../components/layout/InventoryLayout';
import { SignInPage } from '../pages/auth/SignInPage';
import { InventoryPage } from '../pages/inventory/InventoryPage';
import { ProductDetailPage } from '../pages/inventory/ProductDetailPage';
import { ProductSetupPage } from '../pages/inventory/ProductSetupPage';
import { StockMovementsPage } from '../pages/stock/StockMovementsPage';
import { ReceiveStockPage } from '../pages/stock/ReceiveStockPage';
import { RecordSalePage } from '../pages/sales/RecordSalePage';
import { CustomersPage } from '../pages/customers/CustomersPage';
import { CustomerDetailPage } from '../pages/customers/CustomerDetailPage';
import { CustomerEditPage } from '../pages/customers/CustomerEditPage';

export function AppRouter() {
  return (
    <Routes>
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
          <Route path="/sales" element={<SalesIndexPage />} />
          <Route path="/sales/new" element={<RecordSalePage />} />
          <Route path="/customers" element={<CustomersPage />} />
          <Route path="/customers/:id" element={<CustomerDetailPage />} />
          <Route path="/customers/:id/edit" element={<CustomerEditPage />} />
          <Route path="/overview" element={<OverviewPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}

function SalesIndexPage() {
  return (
    <div className="space-y-4 max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-ink)]">
        Sales
      </h1>
      <p className="text-sm text-[color:var(--color-muted)]">
        Sales history and sale details will appear here once sales reporting is
        implemented. New sales can be recorded now.
      </p>
      <Link
        to="/sales/new"
        className="inline-flex items-center h-10 px-4 rounded-[8px] font-semibold text-xs bg-[color:var(--color-accent)] text-[color:var(--color-on-accent)] hover:bg-[color:var(--color-accent-hover)] transition-colors"
      >
        Record a sale
      </Link>
    </div>
  );
}

function OverviewPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold tracking-tight text-[color:var(--color-ink)]">
        Overview
      </h1>
      <p className="text-sm text-[color:var(--color-muted)]">
        The physical shop overview and performance summary will appear here.
      </p>
    </div>
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
