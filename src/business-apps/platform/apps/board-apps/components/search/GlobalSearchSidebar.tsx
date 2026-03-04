import React from 'react'
import { Flame, LayoutGrid, Eye, Zap } from 'lucide-react'

export type SearchSection = 'trending' | 'boards' | 'views' | 'actions'

interface SidebarItem {
  key: SearchSection
  label: string
  icon: React.ReactNode
}

const SIDEBAR_ITEMS: SidebarItem[] = [
  { key: 'trending', label: 'Trending', icon: <Flame className="gba:w-4 gba:h-4" /> },
  { key: 'boards', label: 'Boards', icon: <LayoutGrid className="gba:w-4 gba:h-4" /> },
  { key: 'views', label: 'Views', icon: <Eye className="gba:w-4 gba:h-4" /> },
  { key: 'actions', label: 'Quick Actions', icon: <Zap className="gba:w-4 gba:h-4" /> }
]

interface GlobalSearchSidebarProps {
  activeSection: SearchSection
  onSectionChange: (section: SearchSection) => void
  boardCount: number
  'data-testid'?: string
}

export const GlobalSearchSidebar: React.FC<GlobalSearchSidebarProps> = ({
  activeSection,
  onSectionChange,
  boardCount,
  'data-testid': testId = 'global-search-sidebar'
}) => (
  <nav
    className="gba:w-48 gba:flex-shrink-0 gba:border-r gba:border-border/50 gba:py-4 gba:px-3 gba:flex gba:flex-col gba:gap-1 gba:bg-muted/20"
    data-testid={testId}
  >
    <p className="gba:text-[10px] gba:font-semibold gba:text-muted-foreground/50 gba:uppercase gba:tracking-wider gba:px-3 gba:mb-1">
      Browse
    </p>
    {SIDEBAR_ITEMS.map(item => {
      const isActive = activeSection === item.key
      return (
        <button
          key={item.key}
          onClick={() => onSectionChange(item.key)}
          className={`gba:flex gba:items-center gba:gap-2.5 gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-all gba:w-full gba:text-left ${
            isActive
              ? 'gba:bg-card gba:text-foreground gba:font-medium gba:shadow-sm'
              : 'gba:text-muted-foreground hover:gba:bg-card/60 hover:gba:text-foreground'
          }`}
          data-testid={`${testId}-${item.key}`}
        >
          <span className={isActive ? 'gba:text-desk-badge-golden' : 'gba:text-muted-foreground/60'}>{item.icon}</span>
          {item.label}
          {item.key === 'boards' && boardCount > 0 && (
            <span className="gba:ml-auto gba:text-[10px] gba:text-muted-foreground/40 gba:tabular-nums gba:bg-muted/50 gba:rounded-full gba:px-1.5 gba:py-0.5">
              {boardCount}
            </span>
          )}
        </button>
      )
    })}
  </nav>
)
