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
  DropdownMenuSeparator
} from '@newwork/nw-design-system'
import {
  FileSpreadsheet,
  History,
  Save,
  Lock,
  Unlock,
  Upload,
  Download,
  Plus,
  Columns,
  Zap,
  BarChart3,
  Settings,
  Sparkles
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
  onOpenAnalytics: () => void
  onOpenSheetsAI: () => void
  onOpenAutomations: () => void
  onEdit?: () => void
  allowExport?: boolean
  onExport?: () => void

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
  onOpenAnalytics,
  onOpenSheetsAI,
  onOpenAutomations,
  onEdit,
  allowExport,
  onExport,
  'data-testid': testId = 'spreadsheet-actions-menu'
}) => {
  return (
    <div className="gba:flex gba:items-center gba:gap-1.5" data-testid={testId}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gba:h-8">
            <FileSpreadsheet className="gba:w-4 gba:h-4 gba:mr-2" />
            Spreadsheet
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onShowVersionHistory}>
            <History className="gba:w-4 gba:h-4 gba:mr-2" />
            Version History
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onShowCheckpointDialog}>
            <Save className="gba:w-4 gba:h-4 gba:mr-2" />
            Save Checkpoint
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {isLockedByMe ? (
            <DropdownMenuItem onClick={onReleaseLock}>
              <Unlock className="gba:w-4 gba:h-4 gba:mr-2" />
              Unlock Spreadsheet
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={onAcquireLock}>
              <Lock className="gba:w-4 gba:h-4 gba:mr-2" />
              Lock Spreadsheet
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onShowPublishDialog}>
            <Upload className="gba:w-4 gba:h-4 gba:mr-2" />
            Publish...
          </DropdownMenuItem>
          {allowExport && (
            <DropdownMenuItem onClick={onExport}>
              <Download className="gba:w-4 gba:h-4 gba:mr-2" />
              Export to Excel
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {canEdit && (
            <>
              <DropdownMenuItem onClick={onAddColumn}>
                <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                Add Column
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onManageColumns}>
                <Columns className="gba:w-4 gba:h-4 gba:mr-2" />
                Manage Columns
              </DropdownMenuItem>
            </>
          )}
          <DropdownMenuItem onClick={onOpenAnalytics}>
            <BarChart3 className="gba:w-4 gba:h-4 gba:mr-2" />
            AI Analytics
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpenSheetsAI}>
            <Sparkles className="gba:w-4 gba:h-4 gba:mr-2" />
            Sheets AI
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onOpenAutomations}>
            <Zap className="gba:w-4 gba:h-4 gba:mr-2" />
            Automations
          </DropdownMenuItem>
          {onEdit && (
            <DropdownMenuItem onClick={onEdit}>
              <Settings className="gba:w-4 gba:h-4 gba:mr-2" />
              Settings
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
