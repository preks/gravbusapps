import React from 'react'
import { GraphIcon, HashIcon, NotebookIcon, SquaresFourIcon, UsersIcon, type Icon } from '@phosphor-icons/react'

export type MemoryLensView = 'overview' | 'diary' | 'topics' | 'people' | 'graph'

const VIEWS: Array<{ id: MemoryLensView; label: string; icon: Icon }> = [
  { id: 'overview', label: 'Overview', icon: SquaresFourIcon },
  { id: 'diary', label: 'Diary', icon: NotebookIcon },
  { id: 'topics', label: 'Topics', icon: HashIcon },
  { id: 'people', label: 'People & things', icon: UsersIcon },
  { id: 'graph', label: 'Mind map', icon: GraphIcon }
]

interface MemoryDimensionTabsProps {
  active: MemoryLensView
  onChange: (view: MemoryLensView) => void
}

export const MemoryDimensionTabs: React.FC<MemoryDimensionTabsProps> = ({ active, onChange }) => (
  <div
    className="gba:flex gba:items-center gba:gap-1 gba:overflow-x-auto gba:border-b gba:border-border/60"
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
          className={`gba:relative gba:inline-flex gba:items-center gba:gap-1.5 gba:whitespace-nowrap gba:px-3 gba:pb-2.5 gba:pt-1 gba:text-sm gba:font-medium gba:transition-colors gba:after:absolute gba:after:inset-x-2 gba:after:-bottom-px gba:after:h-0.5 gba:after:rounded-full ${
            isActive
              ? 'gba:text-foreground gba:after:bg-foreground'
              : 'gba:text-muted-foreground gba:hover:text-foreground gba:after:bg-transparent'
          }`}
          data-testid={`memory-lens-view-${view.id}`}
        >
          <ViewIcon className="gba:h-4 gba:w-4" />
          {view.label}
        </button>
      )
    })}
  </div>
)
