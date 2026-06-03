// Slim filter row for the Enterprise Workforce screen.
//
// Search input on the left, segmented status filter on the right. Both
// stay low-key visually so the agent grid is the focal point.

import { MagnifyingGlassIcon } from '@phosphor-icons/react'
import type { WorkforceFilter, WorkforceCounts } from './useWorkforceData'

interface WorkforceFiltersProps {
  search: string
  onSearchChange: (value: string) => void
  filter: WorkforceFilter
  onFilterChange: (filter: WorkforceFilter) => void
  counts: WorkforceCounts
}

interface FilterOption {
  key: WorkforceFilter
  label: string
  count?: number
}

export const WorkforceFilters: React.FC<WorkforceFiltersProps> = ({
  search,
  onSearchChange,
  filter,
  onFilterChange,
  counts
}) => {
  const options: FilterOption[] = [
    { key: 'all', label: 'All', count: counts.total },
    { key: 'active', label: 'Active', count: counts.active },
    { key: 'builtin', label: 'Built-in', count: counts.builtin },
    { key: 'archived', label: 'Archived', count: counts.archived }
  ]

  return (
    <div className="gba:flex gba:flex-col gba:items-stretch gba:gap-2 gba:sm:flex-row gba:sm:items-center gba:sm:justify-between">
      <div className="gba:relative gba:w-full gba:sm:max-w-xs">
        <MagnifyingGlassIcon className="gba:absolute gba:left-2.5 gba:top-1/2 gba:-translate-y-1/2 gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
        <input
          type="text"
          placeholder="Search agents…"
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="gba:h-9 gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-card gba:pl-8 gba:pr-3 gba:text-sm gba:text-foreground gba:placeholder-muted-foreground gba:outline-none gba:focus:border-foreground/30"
          data-testid="workforce-search-input"
        />
      </div>

      <div
        role="tablist"
        aria-label="Filter agents"
        className="gba:inline-flex gba:items-center gba:gap-0.5 gba:rounded-lg gba:border gba:border-border gba:bg-card gba:p-0.5"
      >
        {options.map(option => {
          const isSelected = filter === option.key
          return (
            <button
              key={option.key}
              role="tab"
              type="button"
              aria-selected={isSelected}
              onClick={() => onFilterChange(option.key)}
              className={`gba:inline-flex gba:h-7 gba:items-center gba:gap-1.5 gba:rounded-md gba:px-2.5 gba:text-xs gba:font-medium gba:transition-colors ${
                isSelected ? 'gba:bg-muted gba:text-foreground' : 'gba:text-muted-foreground gba:hover:text-foreground'
              }`}
              data-testid={`workforce-filter-${option.key}`}
            >
              <span>{option.label}</span>
              {option.count !== undefined && (
                <span
                  className={`gba:text-[10px] gba:tabular-nums ${
                    isSelected ? 'gba:text-muted-foreground' : 'gba:text-muted-foreground/70'
                  }`}
                >
                  {option.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
