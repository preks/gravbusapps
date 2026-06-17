import React from 'react'
import { CalendarBlankIcon, HashIcon, NotebookIcon, SquaresFourIcon, UsersIcon, type Icon } from '@phosphor-icons/react'

export type MemoryLensView = 'overview' | 'diary' | 'calendar' | 'topics' | 'people'

const VIEWS: Array<{ id: MemoryLensView; label: string; icon: Icon }> = [
  { id: 'overview', label: 'Overview', icon: SquaresFourIcon },
  { id: 'diary', label: 'Diary', icon: NotebookIcon },
  { id: 'calendar', label: 'Calendar', icon: CalendarBlankIcon },
  { id: 'topics', label: 'Topics', icon: HashIcon },
  { id: 'people', label: 'People & things', icon: UsersIcon }
]

interface MemoryDimensionTabsProps {
  active: MemoryLensView
  onChange: (view: MemoryLensView) => void
}

export const MemoryDimensionTabs: React.FC<MemoryDimensionTabsProps> = ({ active, onChange }) => (
  <div
    className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:border gba:border-border/60 gba:bg-muted/30 gba:p-1"
    role="tablist"
    data-testid="memory-lens-dimension-tabs"
  >
    {VIEWS.map(view => {
      const isActive = active === view.id
      const ViewIcon = view.icon
      return (
        <button
          key={view.id}
          type="button"
          role="tab"
          aria-selected={isActive}
          onClick={() => onChange(view.id)}
          className={`gba:inline-flex gba:items-center gba:gap-1.5 gba:rounded-full gba:px-3 gba:py-1.5 gba:text-[13px] gba:font-medium gba:whitespace-nowrap gba:transition-colors ${
            isActive
              ? 'gba:bg-background gba:text-foreground gba:shadow-sm'
              : 'gba:text-muted-foreground gba:hover:text-foreground'
          }`}
          data-testid={`memory-lens-view-${view.id}`}
        >
          <ViewIcon className="gba:h-3.5 gba:w-3.5" />
          {view.label}
        </button>
      )
    })}
  </div>
)
