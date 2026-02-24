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
import translations from '../_i18n'
import {
  FileSpreadsheet,
  History,
  Save,
  Lock,
  Unlock,
  Share2,
  Upload,
  Download,
  Plus,
  Columns,
  Zap,
  Settings
} from 'lucide-react'

export interface SpreadsheetActionsMenuProps {
  // Version/lock actions
  onShowVersionHistory: () => void
  onShowCheckpointDialog: () => void
  onShowPublishDialog: () => void
  isLockedByMe: boolean
  onAcquireLock: () => void
  onReleaseLock: () => void

  // Column actions
  canEdit: boolean
  onAddColumn: () => void
  onManageColumns: () => void

  // Other actions
  onOpenAutomations: () => void
  onShare?: () => void
  onEdit?: () => void
  allowExport?: boolean
  onExportToExcel?: () => void

  'data-testid'?: string
}

export const SpreadsheetActionsMenu: React.FC<SpreadsheetActionsMenuProps> = ({
  onShowVersionHistory,
  onShowCheckpointDialog,
  onShowPublishDialog,
  isLockedByMe,
  onAcquireLock,
  onReleaseLock,
  canEdit,
  onAddColumn,
  onManageColumns,
  onOpenAutomations,
  onShare,
  onEdit,
  allowExport,
  onExportToExcel,
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
          <DropdownMenuItem onClick={onShowVersionHistory}>
            <History className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('menu-version-history')}
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onShowCheckpointDialog}>
            <Save className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('menu-save-checkpoint')}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isLockedByMe ? (
            <DropdownMenuItem
              onClick={() => {
                void onReleaseLock()
              }}
            >
              <Unlock className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('menu-unlock-spreadsheet')}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem
              onClick={() => {
                void onAcquireLock()
              }}
            >
              <Lock className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('menu-lock-spreadsheet')}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onShowPublishDialog}>
            <Upload className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('menu-publish')}
          </DropdownMenuItem>
          {onShare && (
            <DropdownMenuItem onClick={onShare} data-testid={`${testId}-share`}>
              <Share2 className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('menu-share')}
            </DropdownMenuItem>
          )}
          {allowExport && onExportToExcel && (
            <DropdownMenuItem onClick={onExportToExcel} data-testid={`${testId}-export-excel`}>
              <Download className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('menu-export-to-excel')}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {canEdit && (
            <>
              <DropdownMenuItem onClick={onAddColumn}>
                <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('menu-add-column')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onManageColumns}>
                <Columns className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('menu-manage-columns')}
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem onClick={onOpenAutomations}>
            <Zap className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('menu-automations')}
          </DropdownMenuItem>
          {onEdit && (
            <DropdownMenuItem onClick={onEdit}>
              <Settings className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('menu-settings')}
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
