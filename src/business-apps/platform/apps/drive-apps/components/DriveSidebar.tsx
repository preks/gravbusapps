import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { HardDrive, Users, Clock, Star, Trash2, Plus } from 'lucide-react'
import type { DriveSection } from '../types/drive.types'

export interface DriveSidebarProps {
  activeSection: DriveSection
  onSectionChange: (section: DriveSection) => void
  onCreateNew: () => void
  t: (key: string) => string
  'data-testid'?: string
}

const SECTIONS: Array<{ id: DriveSection; icon: React.ElementType; labelKey: string }> = [
  { id: 'my-drive', icon: HardDrive, labelKey: 'sidebar-my-drive' },
  { id: 'shared', icon: Users, labelKey: 'sidebar-shared' },
  { id: 'recent', icon: Clock, labelKey: 'sidebar-recent' },
  { id: 'favorites', icon: Star, labelKey: 'sidebar-favorites' },
  { id: 'trash', icon: Trash2, labelKey: 'sidebar-trash' }
]

export const DriveSidebar: React.FC<DriveSidebarProps> = ({
  activeSection,
  onSectionChange,
  onCreateNew,
  t,
  'data-testid': testId = 'drive-sidebar'
}) => {
  return (
    <aside
      className="gba:w-64 gba:flex-shrink-0 gba:border-r gba:border-border/50 gba:bg-muted/30 gba:flex gba:flex-col"
      data-testid={testId}
    >
      <div className="gba:p-4 gba:border-b gba:border-border/50">
        <div className="gba:flex gba:items-center gba:gap-3 gba:mb-4">
          <div className="gba:w-9 gba:h-9 gba:rounded-xl gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
            <HardDrive className="gba:w-5 gba:h-5 gba:text-primary" />
          </div>
          <span className="gba:text-lg gba:font-semibold gba:text-foreground gba:tracking-tight">
            {t('sidebar-brand-title')}
          </span>
        </div>
        <Button
          variant="default"
          size="sm"
          className="gba:w-full gba:gap-2"
          onClick={onCreateNew}
          data-testid={`${testId}-new-btn`}
        >
          <Plus className="gba:w-4 gba:h-4" />
          New
        </Button>
      </div>

      <nav className="gba:flex-1 gba:p-2 gba:space-y-0.5 gba:overflow-y-auto" data-testid={`${testId}-nav`}>
        {SECTIONS.map(({ id, icon: Icon, labelKey }) => {
          const isActive = activeSection === id
          return (
            <button
              key={id}
              onClick={() => onSectionChange(id)}
              className={`gba:w-full gba:flex gba:items-center gba:gap-3 gba:px-3 gba:py-2 gba:rounded-lg gba:text-sm gba:font-medium gba:transition-colors ${
                isActive
                  ? 'gba:bg-primary/10 gba:text-primary'
                  : 'gba:text-muted-foreground gba:hover:bg-accent gba:hover:text-accent-foreground'
              }`}
              data-testid={`${testId}-section-${id}`}
            >
              <Icon className="gba:w-4 gba:h-4 gba:flex-shrink-0" />
              <span className="gba:truncate">{t(labelKey)}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
