/**
 * AutomationsPanel Component
 *
 * Slide-over drawer for managing spreadsheet automations.
 */

import React, { memo } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@newwork/nw-design-system'
import { Zap, X } from 'lucide-react'
import { AutomationsHub } from './automations/AutomationsHub'
import { AutomationWizard } from './automations/AutomationWizard'
import type { SpreadsheetAutomation, SpreadsheetColumn } from '../types'

export interface AutomationsPanelProps {
  isOpen: boolean
  onClose: () => void
  automations: SpreadsheetAutomation[]
  executionHistory: unknown[]
  workflowLinks: unknown[]
  isLoading: boolean
  columns: SpreadsheetColumn[]
  sheetData: Record<string, unknown>[]
  spreadsheetId: string
  sheetId: string
  accessToken: string
  /** Optional: Update column labels in batch (e.g. for bulk collection form field headers) */
  onColumnLabelsUpdate?: (updates: Array<{ columnId: string; newLabel: string }>) => void
  onCreateAutomation: (
    automation: Omit<SpreadsheetAutomation, 'id' | 'createdAt' | 'updatedAt' | 'runCount'>
  ) => Promise<unknown>
  onUpdateAutomation: (id: string, automation: Partial<SpreadsheetAutomation>) => Promise<unknown>
  onDeleteAutomation: (id: string) => Promise<unknown>
  onToggleAutomation: (id: string, enabled: boolean) => Promise<unknown>
  onDuplicateAutomation: (id: string) => Promise<unknown>
  onRunAutomation: (id: string, rows?: Array<{ id: string; cells: Record<string, unknown> }>) => Promise<unknown>
  onRefreshWorkflowStatuses: () => void
  'data-testid'?: string
}

export const AutomationsPanel: React.FC<AutomationsPanelProps> = memo(function AutomationsPanel({
  isOpen,
  onClose,
  automations,
  executionHistory,
  workflowLinks,
  isLoading,
  columns,
  sheetData,
  spreadsheetId,
  sheetId,
  accessToken,
  onColumnLabelsUpdate,
  onCreateAutomation,
  onUpdateAutomation,
  onDeleteAutomation,
  onToggleAutomation,
  onDuplicateAutomation,
  onRunAutomation,
  onRefreshWorkflowStatuses,
  'data-testid': testId = 'automations-panel'
}) {
  const [isWizardOpen, setIsWizardOpen] = React.useState(false)
  const [editingAutomation, setEditingAutomation] = React.useState<SpreadsheetAutomation | null>(null)

  if (!isOpen) return null

  return (
    <>
      {createPortal(
        <div className="gba:fixed gba:inset-0" style={{ zIndex: 999999 }} data-testid={testId}>
          {/* Backdrop overlay */}
          <div
            className="gba:absolute gba:inset-0 gba:bg-black/30 gba:backdrop-blur-[2px] gba:transition-opacity"
            onClick={onClose}
            style={{ zIndex: 999999 }}
          />
          {/* Drawer panel */}
          <div
            className="gba:absolute gba:top-0 gba:right-0 gba:bottom-0 gba:w-[560px] gba:max-w-[90vw] gba:bg-background gba:border-l gba:border-border/50 gba:overflow-hidden gba:flex gba:flex-col"
            style={{ zIndex: 1000000, boxShadow: '-8px 0 32px rgba(0,0,0,0.12)' }}
          >
            {/* Header */}
            <div className="gba:flex gba:items-center gba:justify-between gba:px-5 gba:py-3.5 gba:border-b gba:border-border/50 gba:bg-gradient-to-r gba:from-muted/30 gba:to-transparent">
              <div className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:w-9 gba:h-9 gba:rounded-lg gba:bg-gradient-to-br gba:from-primary/20 gba:to-primary/5 gba:flex gba:items-center gba:justify-center gba:border gba:border-primary/20">
                  <Zap className="gba:w-4.5 gba:h-4.5 gba:text-primary" />
                </div>
                <div>
                  <h2 className="gba:text-base gba:font-semibold gba:text-foreground">Automations</h2>
                  <p className="gba:text-xs gba:text-muted-foreground">Automate workflows and actions</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="gba:h-8 gba:w-8 gba:p-0 gba:rounded-full gba:hover:bg-muted"
              >
                <X className="gba:w-4 gba:h-4" />
              </Button>
            </div>
            {/* Content */}
            <div className="gba:flex-1 gba:overflow-auto gba:p-5">
              <AutomationsHub
                automations={automations}
                executionHistory={executionHistory}
                workflowLinks={workflowLinks}
                isLoading={isLoading}
                onCreateAutomation={() => {
                  setEditingAutomation(null)
                  setIsWizardOpen(true)
                }}
                onEditAutomation={automation => {
                  setEditingAutomation(automation)
                  setIsWizardOpen(true)
                }}
                onDeleteAutomation={onDeleteAutomation}
                onToggleAutomation={onToggleAutomation}
                onDuplicateAutomation={onDuplicateAutomation}
                onRunAutomation={async id => {
                  const rows = sheetData.map(row => ({
                    id: String(row._id || row.id || ''),
                    cells: row
                  }))
                  await onRunAutomation(id, rows)
                }}
                onRefresh={onRefreshWorkflowStatuses}
                data-testid={`${testId}-hub`}
              />
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Automation Wizard */}
      <AutomationWizard
        isOpen={isWizardOpen}
        onClose={() => {
          setIsWizardOpen(false)
          setEditingAutomation(null)
        }}
        columns={columns}
        existingAutomation={editingAutomation ?? undefined}
        accessToken={accessToken}
        onColumnLabelsUpdate={onColumnLabelsUpdate}
        onSave={async automation => {
          if (editingAutomation) {
            await onUpdateAutomation(editingAutomation.id, automation)
          } else {
            await onCreateAutomation(automation)
          }
          setIsWizardOpen(false)
          setEditingAutomation(null)
        }}
        spreadsheetId={spreadsheetId}
        sheetId={sheetId}
        data-testid={`${testId}-wizard`}
      />
    </>
  )
})
