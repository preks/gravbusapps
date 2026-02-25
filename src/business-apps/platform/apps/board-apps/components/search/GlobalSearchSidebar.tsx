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
    className="gba:w-44 gba:flex-shrink-0 gba:border-r gba:py-3 gba:px-2 gba:flex gba:flex-col gba:gap-0.5"
    data-testid={testId}
  >
    {SIDEBAR_ITEMS.map(item => {
      const isActive = activeSection === item.key
      return (
        <button
          key={item.key}
          onClick={() => onSectionChange(item.key)}
          className={`gba:flex gba:items-center gba:gap-2.5 gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:transition-colors gba:w-full gba:text-left ${
            isActive
              ? 'gba:bg-accent gba:text-accent-foreground gba:font-medium'
              : 'gba:text-muted-foreground hover:gba:bg-muted/60 hover:gba:text-foreground'
          }`}
          data-testid={`${testId}-${item.key}`}
        >
          <span className={isActive ? 'gba:text-primary' : 'gba:text-muted-foreground/70'}>{item.icon}</span>
          {item.label}
          {item.key === 'boards' && boardCount > 0 && (
            <span className="gba:ml-auto gba:text-[10px] gba:text-muted-foreground/50 gba:tabular-nums">
              {boardCount}
            </span>
          )}
        </button>
      )
    })}
  </nav>
)
