/**
 * BoardViewerHeader - hero-style header for an open board.
 * Uses the shared CreateHeroHeader (same pattern as agent-mesh).
 */

import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { LayoutGrid, Search, Database, Settings } from 'lucide-react'
import { CreateHeroHeader } from '@/business-apps/core/create/components/CreateHeroHeader'

export interface BoardViewerHeaderProps {
  boardName: string
  onBack?: () => void
  onOpenSearch: () => void
  onOpenSettings: () => void
  onOpenSystemData?: () => void
  testId: string
}

const HERO_BTN = 'gba:bg-white/10 gba:border-white/20 gba:text-white gba:hover:bg-white/15'

export const BoardViewerHeader: React.FC<BoardViewerHeaderProps> = ({
  boardName,
  onBack,
  onOpenSearch,
  onOpenSettings,
  onOpenSystemData,
  testId
}) => {
  return (
    <CreateHeroHeader
      icon={LayoutGrid}
      appLabel="Boards"
      title={boardName}
      onBack={onBack}
      data-testid={`${testId}-hero`}
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            className={HERO_BTN}
            onClick={onOpenSearch}
            data-testid={`${testId}-search`}
          >
            <Search className="gba:h-4 gba:w-4 gba:mr-1.5" />
            Search
          </Button>
          {onOpenSystemData && (
            <Button
              variant="outline"
              size="sm"
              className={HERO_BTN}
              onClick={onOpenSystemData}
              data-testid={`${testId}-system-data`}
            >
              <Database className="gba:h-4 gba:w-4 gba:mr-1.5" />
              Import
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className={HERO_BTN}
            onClick={onOpenSettings}
            data-testid={`${testId}-settings`}
          >
            <Settings className="gba:h-4 gba:w-4 gba:mr-1.5" />
            Settings
          </Button>
        </>
      }
    />
  )
}
