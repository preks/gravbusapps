/**
 * SpreadsheetActionsMenu Component
 *
 * Dropdown menu for spreadsheet actions: versioning, columns, automations, etc.
 */

import React from 'react'
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  useTranslation
} from '@newwork/nw-design-system'
import { FileSpreadsheet, History, Save, Lock, Unlock, Share2, Download, Zap, BarChart3 } from 'lucide-react'
import { ArrowsClockwise } from '@phosphor-icons/react'
import translations from '../_i18n'

export interface SpreadsheetActionsMenuProps {
  // Version/lock actions
  onShowVersionHistory: () => void
  onShowCheckpointDialog: () => void
  isLockedByMe: boolean
  onAcquireLock: () => void
  onReleaseLock: () => void

  // Other actions
  canEdit: boolean
  onShare?: () => void
  onOpenAnalytics: () => void
  onOpenAutomations: () => void
  /** When provided with showCheckCollectionResponses, adds a menu entry to fetch collection completions */
  onCheckCollectionResponses?: () => void | Promise<void>
  showCheckCollectionResponses?: boolean
  onEdit?: () => void
  allowExport?: boolean
  onExport?: () => void

  'data-testid'?: string
}

export const SpreadsheetActionsMenu: React.FC<SpreadsheetActionsMenuProps> = ({
  isLockedByMe,
  onAcquireLock,
  onReleaseLock,
  onShare,
  onOpenAnalytics,
  onOpenAutomations,
  onCheckCollectionResponses,
  showCheckCollectionResponses = false,
  allowExport,
  onExport,
  'data-testid': testId = 'spreadsheet-actions-menu'
}) => {
  const { t } = useTranslation(translations)

  return (
    <div className="gba:flex gba:items-center gba:gap-1.5" data-testid={testId}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gba:h-8">
            <FileSpreadsheet className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('menu-spreadsheet')}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem disabled>
            <History className="gba:w-4 gba:h-4 gba:mr-2" />
            <span className="gba:flex-1">{t('menu-version-history')}</span>
            <span className="gba:ml-2 gba:rounded-full gba:bg-muted gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-medium gba:uppercase gba:tracking-wide gba:text-muted-foreground">
              {t('menu-coming-soon')}
            </span>
          </DropdownMenuItem>
          <DropdownMenuItem disabled>
            <Save className="gba:w-4 gba:h-4 gba:mr-2" />
            <span className="gba:flex-1">{t('menu-save-checkpoint')}</span>
            <span className="gba:ml-2 gba:rounded-full gba:bg-muted gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-medium gba:uppercase gba:tracking-wide gba:text-muted-foreground">
              {t('menu-coming-soon')}
            </span>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isLockedByMe ? (
            <DropdownMenuItem onClick={onReleaseLock}>
              <Unlock className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('menu-unlock-spreadsheet')}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={onAcquireLock}>
              <Lock className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('menu-lock-spreadsheet')}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {onShare && (
            <DropdownMenuItem onClick={onShare}>
              <Share2 className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('menu-share')}
            </DropdownMenuItem>
          )}
          {allowExport && (
            <DropdownMenuItem onClick={onExport}>
              <Download className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('menu-export-to-excel')}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onOpenAnalytics}>
            <BarChart3 className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('menu-ai-analytics')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpenAutomations}>
            <Zap className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('menu-automations')}
          </DropdownMenuItem>
          {showCheckCollectionResponses && onCheckCollectionResponses && (
            <DropdownMenuItem
              onClick={() => void onCheckCollectionResponses()}
              data-testid={`${testId}-check-collection-responses`}
            >
              <ArrowsClockwise className="gba:w-4 gba:h-4 gba:mr-2" aria-hidden />
              {t('menu-check-collection-responses')}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
