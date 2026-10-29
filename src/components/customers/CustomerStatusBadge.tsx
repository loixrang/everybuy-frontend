export function CustomerStatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-xs font-semibold ${
        active
          ? 'bg-[color:var(--color-success-bg)] text-[color:var(--color-success-ink)]'
          : 'bg-[color:var(--color-subtle)] text-[color:var(--color-muted)]'
      }`}
    >
      {active ? 'Active' : 'Inactive'}
    </span>
  );
}
