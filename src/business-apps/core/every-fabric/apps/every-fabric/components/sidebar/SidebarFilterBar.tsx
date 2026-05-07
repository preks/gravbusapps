import { RECENTS_STATUS_OPTIONS, type RecentsStatusFilter } from './sessionGrouping'

interface SidebarFilterBarProps {
  activeFilters: Set<RecentsStatusFilter> | null
  onChange: (next: Set<RecentsStatusFilter> | null) => void
}

/**
 * Compact row of toggle chips that filter the Recents section by session status.
 * "All" is selected when `activeFilters` is null (no filtering).
 */
export const SidebarFilterBar: React.FC<SidebarFilterBarProps> = ({ activeFilters, onChange }) => {
  const isAll = !activeFilters || activeFilters.size === 0

  const toggleStatus = (status: RecentsStatusFilter) => {
    if (!activeFilters) {
      onChange(new Set([status]))
      return
    }
    const next = new Set(activeFilters)
    if (next.has(status)) {
      next.delete(status)
    } else {
      next.add(status)
    }
    onChange(next.size === 0 ? null : next)
  }

  return (
    <div className="gba:flex gba:items-center gba:gap-1 gba:px-2.5 gba:pb-2" data-testid="sidebar-filter-bar">
      <button
        type="button"
        onClick={() => onChange(null)}
        className={`gba:rounded-full gba:border gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium gba:transition-colors ${
          isAll
            ? 'gba:border-foreground/20 gba:bg-foreground/10 gba:text-foreground'
            : 'gba:border-border/50 gba:text-muted-foreground gba:hover:border-border gba:hover:text-foreground'
        }`}
        data-testid="sidebar-filter-all"
      >
        All
      </button>
      {RECENTS_STATUS_OPTIONS.map(opt => {
        const isActive = activeFilters?.has(opt.value) ?? false
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => toggleStatus(opt.value)}
            className={`gba:rounded-full gba:border gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium gba:transition-colors ${
              isActive
                ? 'gba:border-foreground/20 gba:bg-foreground/10 gba:text-foreground'
                : 'gba:border-border/50 gba:text-muted-foreground gba:hover:border-border gba:hover:text-foreground'
            }`}
            data-testid={`sidebar-filter-${opt.value}`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
