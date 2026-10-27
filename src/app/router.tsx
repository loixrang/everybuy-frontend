import { Routes, Route, Navigate } from 'react-router-dom';
import { InventoryLayout } from '../components/layout/InventoryLayout';
import { InventoryPage } from '../pages/inventory/InventoryPage';
import { ProductDetailPage } from '../pages/inventory/ProductDetailPage';
import { ProductSetupPage } from '../pages/inventory/ProductSetupPage';

export function AppRouter() {
  return (
    <Routes>
      <Route element={<InventoryLayout />}>
        <Route index element={<Navigate to="/inventory" replace />} />
        <Route path="/inventory" element={<InventoryPage />} />
        <Route path="/inventory/new" element={<ProductSetupPage />} />
        <Route path="/inventory/:id" element={<ProductDetailPage />} />
        <Route path="/inventory/:id/edit" element={<ProductSetupPage />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
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
