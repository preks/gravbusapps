import React from 'react'
import { ChevronRight, HardDrive, Share2, Users } from 'lucide-react'
import type { DriveBreadcrumb, DriveSection } from '../types/drive.types'

export interface DriveBreadcrumbsProps {
  section: DriveSection
  breadcrumbs: DriveBreadcrumb[]
  isCurrentFolderShared?: boolean
  onNavigateRoot: () => void
  onNavigateFolder: (folderId: string) => void
  t: (key: string) => string
  'data-testid'?: string
}

const SECTION_ROOT_KEYS: Record<DriveSection, string> = {
  'my-drive': 'breadcrumb-root',
  shared: 'breadcrumb-shared',
  recent: 'breadcrumb-recent',
  favorites: 'breadcrumb-favorites',
  trash: 'breadcrumb-trash'
}

export const DriveBreadcrumbs: React.FC<DriveBreadcrumbsProps> = ({
  section,
  breadcrumbs,
  isCurrentFolderShared,
  onNavigateRoot,
  onNavigateFolder,
  t,
  'data-testid': testId = 'drive-breadcrumbs'
}) => {
  return (
    <div className="gba:flex gba:flex-col gba:gap-2" data-testid={testId}>
      <nav className="gba:flex gba:items-center gba:gap-1 gba:text-sm">
        <button
          onClick={onNavigateRoot}
          className="gba:flex gba:items-center gba:gap-1.5 gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors gba:px-1.5 gba:py-0.5 gba:rounded"
          data-testid={`${testId}-root`}
        >
          <HardDrive className="gba:w-3.5 gba:h-3.5" />
          <span>{t(SECTION_ROOT_KEYS[section])}</span>
        </button>

        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={crumb.id}>
            <ChevronRight className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground/50" />
            {idx === breadcrumbs.length - 1 ? (
              <span
                className="gba:text-foreground gba:font-medium gba:px-1.5 gba:py-0.5 gba:flex gba:items-center gba:gap-1.5"
                data-testid={`${testId}-current`}
              >
                {crumb.name}
                {isCurrentFolderShared && (
                  <span className="gba:inline-flex gba:items-center gba:gap-1 gba:text-xs gba:font-medium gba:text-primary gba:bg-primary/10 gba:px-2 gba:py-0.5 gba:rounded-full">
                    <Users className="gba:w-3 gba:h-3" />
                    {t('shared-folder-badge')}
                  </span>
                )}
              </span>
            ) : (
              <button
                onClick={() => onNavigateFolder(crumb.id)}
                className="gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors gba:px-1.5 gba:py-0.5 gba:rounded"
                data-testid={`${testId}-crumb-${crumb.id}`}
              >
                {crumb.name}
              </button>
            )}
          </React.Fragment>
        ))}
      </nav>

      {isCurrentFolderShared && breadcrumbs.length > 0 && (
        <div
          className="gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:bg-primary/5 gba:rounded-lg gba:text-sm"
          data-testid={`${testId}-shared-banner`}
        >
          <Share2 className="gba:w-4 gba:h-4 gba:text-primary" />
          <span className="gba:text-muted-foreground">{t('shared-folder-banner')}</span>
        </div>
      )}
    </div>
  )
}
