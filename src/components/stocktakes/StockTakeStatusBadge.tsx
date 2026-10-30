import type { StockTakeStatus } from '../../types/stocktake';
import {
  stockTakeStatusLabel,
  stockTakeStatusTone,
  type StockTakeStatusTone,
} from '../../lib/stocktakes';

const TONE_CLASSES: Record<StockTakeStatusTone, string> = {
  draft: 'bg-[color:var(--color-warning-bg)] text-[color:var(--color-warning-ink)]',
  finalized: 'bg-[color:var(--color-success-bg)] text-[color:var(--color-success-ink)]',
  cancelled: 'bg-[color:var(--color-subtle)] text-[color:var(--color-muted)]',
};

export function StockTakeStatusBadge({ status }: { status: StockTakeStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-[4px] px-2 py-0.5 text-xs font-semibold ${TONE_CLASSES[stockTakeStatusTone(status)]}`}
    >
      {stockTakeStatusLabel(status)}
    </span>
  );
}
