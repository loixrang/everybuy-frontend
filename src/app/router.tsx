import { Routes, Route, Navigate } from 'react-router-dom'
import { InventoryLayout } from '../components/layout/InventoryLayout'

export function AppRouter() {
  return (
    <Routes>
      <Route element={<InventoryLayout />}>
        <Route index element={<Navigate to="/overview" replace />} />
        <Route path="/overview" element={<OverviewPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

function OverviewPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <h1 className="text-xl md:text-2xl font-semibold mb-2">Overview</h1>
      <p className="text-[color:var(--color-muted)]">Foundation ready. Business features not implemented yet.</p>
    </div>
  )
}

function NotFoundPage() {
  return (
    <div className="p-4 md:p-6 lg:p-8">
      <h1 className="text-xl md:text-2xl font-semibold mb-2">Not Found</h1>
      <p className="text-[color:var(--color-muted)]">The page you requested does not exist.</p>
    </div>
  )
}
