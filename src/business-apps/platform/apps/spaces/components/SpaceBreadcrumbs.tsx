/**
 * SpaceBreadcrumbs
 *
 * Breadcrumb navigation for folders inside a Space.
 * Minimal, clean design with subtle interactions.
 */

import React, { useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { ChevronRight, Home } from 'lucide-react'
import type { SpaceFolder } from '../types/space.types'
import translations from '../_i18n'

export interface SpaceBreadcrumbsProps {
  folders: SpaceFolder[]
  selectedFolderId: string | null
  onSelectRoot: () => void
  onSelectFolder: (folderId: string) => void
  'data-testid'?: string
}

export const SpaceBreadcrumbs: React.FC<SpaceBreadcrumbsProps> = ({
  folders,
  selectedFolderId,
  onSelectRoot,
  onSelectFolder,
  'data-testid': testId = 'space-breadcrumbs'
}) => {
  const { t } = useTranslation(translations)
  const path = useMemo(() => {
    if (!selectedFolderId) return []
    const byId = new Map(folders.map(f => [f.id, f]))
    const result: SpaceFolder[] = []
    let current = byId.get(selectedFolderId)
    while (current) {
      result.unshift(current)
      const parentId = current.parentId ?? null
      if (!parentId) break
      current = byId.get(parentId)
    }
    return result
  }, [folders, selectedFolderId])

  return (
    <nav
      className="gba:flex gba:items-center gba:gap-1 gba:text-sm gba:flex-wrap"
      aria-label={t('common-breadcrumb')}
      data-testid={testId}
    >
      <button
        type="button"
        onClick={onSelectRoot}
        className={`gba:inline-flex gba:items-center gba:gap-1.5 gba:px-2 gba:py-1 gba:rounded-md gba:text-sm gba:transition-colors ${
          path.length === 0
            ? 'gba:text-foreground gba:font-medium'
            : 'gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/50'
        }`}
        data-testid={`${testId}-root`}
      >
        <Home className="gba:w-3.5 gba:h-3.5" />
        <span>{t('common-root')}</span>
      </button>

      {path.map((folder, index) => {
        const isLast = index === path.length - 1
        return (
          <React.Fragment key={folder.id}>
            <ChevronRight className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground/50 gba:flex-shrink-0" />
            <button
              type="button"
              onClick={() => onSelectFolder(folder.id)}
              className={`gba:px-2 gba:py-1 gba:rounded-md gba:text-sm gba:transition-colors gba:max-w-48 gba:truncate ${
                isLast
                  ? 'gba:text-foreground gba:font-medium'
                  : 'gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/50'
              }`}
              data-testid={`${testId}-folder-${folder.id}`}
            >
              {folder.name}
            </button>
          </React.Fragment>
        )
      })}
    </nav>
  )
}

export default SpaceBreadcrumbs
