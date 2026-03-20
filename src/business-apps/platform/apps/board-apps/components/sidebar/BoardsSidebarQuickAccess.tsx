import React from 'react'
import { Home, LayoutGrid, Star, Users, Clock } from 'lucide-react'
import type { BoardHubSidebarSection } from '../../hooks/useBoardAppsHubFiltering'

export type QuickAccessSection = BoardHubSidebarSection

interface QuickAccessItem {
  key: QuickAccessSection
  label: string
  icon: React.ReactNode
}

const QUICK_ACCESS_ITEMS: QuickAccessItem[] = [
  { key: 'home', label: 'Home', icon: <Home className="gba:w-4 gba:h-4" /> },
  { key: 'my-boards', label: 'All Boards', icon: <LayoutGrid className="gba:w-4 gba:h-4" /> },
  { key: 'favorites', label: 'Favorites', icon: <Star className="gba:w-4 gba:h-4" /> },
  { key: 'shared', label: 'Shared with me', icon: <Users className="gba:w-4 gba:h-4" /> },
  { key: 'recent', label: 'Recent', icon: <Clock className="gba:w-4 gba:h-4" /> }
]

export interface BoardsSidebarQuickAccessProps {
  activeSection: BoardHubSidebarSection | null
  activeCollectionId: string | null
  counts?: Partial<Record<QuickAccessSection, number>>
  onSectionChange: (section: QuickAccessSection) => void
  'data-testid'?: string
}

export const BoardsSidebarQuickAccess: React.FC<BoardsSidebarQuickAccessProps> = ({
  activeSection,
  activeCollectionId,
  counts,
  onSectionChange,
  'data-testid': testId = 'boards-sidebar-qa'
}) => (
  <div className="gba:space-y-0.5 gba:px-2">
    {QUICK_ACCESS_ITEMS.map(item => {
      const isActive = !activeCollectionId && activeSection === item.key
      const count = counts?.[item.key]
      return (
        <button
          key={item.key}
          className={`gba:w-full gba:flex gba:items-center gba:gap-2.5 gba:px-2.5 gba:py-1.5 gba:rounded-md gba:text-sm gba:transition-colors ${
            isActive
              ? 'gba:bg-primary/8 gba:text-foreground gba:border gba:border-primary/15'
              : 'gba:text-muted-foreground gba:hover:bg-background/60 gba:hover:text-foreground'
          }`}
          onClick={() => onSectionChange(item.key)}
          data-testid={`${testId}-${item.key}`}
        >
          <span className={`gba:flex-shrink-0 ${isActive ? '' : 'gba:opacity-80'}`}>{item.icon}</span>
          <span className="gba:flex-1 gba:text-left gba:truncate">{item.label}</span>
          {count !== undefined && count > 0 && (
            <span
              className={`gba:text-xs gba:tabular-nums ${isActive ? 'gba:text-muted-foreground' : 'gba:text-muted-foreground/70'}`}
            >
              {count}
            </span>
          )}
        </button>
      )
    })}
  </div>
)
