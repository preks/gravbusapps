/**
 * Presentational shell for SpreadsheetAppViewer: header, entity bar, main grid area,
 * emergency fallback, sheet tabs, dialogs, diagnostics, side panels, collaboration banner, debug bar.
 */

import React, { memo } from 'react'
import type { ComponentProps } from 'react'
import type { SpreadsheetColumn } from '../types'
import { EntityDataStatusBar } from './EntityDataStatusBar'
import { SpreadsheetCollaborationHealthBanner } from './SpreadsheetCollaborationHealthBanner'
import { SpreadsheetSidePanelsSection } from './SpreadsheetSidePanelsSection'
import type { SpreadsheetSidePanelsSectionProps } from './SpreadsheetSidePanelsSection'
import { SpreadsheetDialogsSection } from './SpreadsheetDialogsSection'
import type { SpreadsheetDialogsSectionProps } from './SpreadsheetDialogsSection'
import { SpreadsheetDiagnosticsDialog } from './SpreadsheetDiagnosticsDialog'
import { SpreadsheetDebugStatusBar } from './SpreadsheetDebugStatusBar'
import type { SpreadsheetDebugStatusBarProps } from './SpreadsheetDebugStatusBar'
import { SpreadsheetHeader } from './SpreadsheetHeader'
import type { SpreadsheetHeaderProps } from './SpreadsheetHeader'
import { SpreadsheetSheetTabs } from './SpreadsheetSheetTabs'
import type { SpreadsheetSheetTabsProps } from './SpreadsheetSheetTabs'
import type { SpreadsheetCollaborationHealthBannerProps } from './SpreadsheetCollaborationHealthBanner'
import type { EntityDataStatusBarProps } from './EntityDataStatusBar'
import { SpreadsheetCommentsSidebar } from './SpreadsheetCommentsSidebar'
import type { SpreadsheetCommentsSidebarProps } from './SpreadsheetCommentsSidebar'

export interface SpreadsheetViewerLayoutProps {
  testId: string
  headerProps: SpreadsheetHeaderProps
  entityStatusBarProps: EntityDataStatusBarProps | null
  mainView: React.ReactNode
  emergencyFallback: {
    show: boolean
    columns: SpreadsheetColumn[]
    sheetData: Record<string, unknown>[]
  }
  sheetTabsProps: SpreadsheetSheetTabsProps | null
  commentsSidebarProps: SpreadsheetCommentsSidebarProps | null
  dialogsProps: SpreadsheetDialogsSectionProps
  diagnosticsProps: ComponentProps<typeof SpreadsheetDiagnosticsDialog>
  sidePanelsProps: SpreadsheetSidePanelsSectionProps
  collaborationHealthBannerProps: SpreadsheetCollaborationHealthBannerProps
  debugStatusBarProps: SpreadsheetDebugStatusBarProps | null
}

function SpreadsheetViewerEmergencyFallback({
  columns,
  sheetData
}: {
  columns: SpreadsheetColumn[]
  sheetData: Record<string, unknown>[]
}) {
  return (
    <div className="gba:absolute gba:inset-0 gba:z-50 gba:bg-background gba:p-4 gba:overflow-auto">
      <div className="gba:mb-3 gba:text-sm gba:text-muted-foreground">
        Spreadsheet grid failed to initialize. Showing emergency fallback table.
      </div>
      <div className="gba:overflow-auto gba:border gba:rounded-md">
        <table className="gba:min-w-full gba:text-sm">
          <thead className="gba:bg-muted/40">
            <tr>
              {columns.map(col => (
                <th key={col.id} className="gba:px-3 gba:py-2 gba:text-left gba:font-medium">
                  {col.label || col.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(sheetData.length > 0 ? sheetData.slice(0, 100) : [{}]).map((row, idx) => (
              <tr
                key={String((row as Record<string, unknown>)._rowUuid || (row as Record<string, unknown>)._id || idx)}
                className="gba:border-t"
              >
                {columns.map(col => (
                  <td key={col.id} className="gba:px-3 gba:py-2">
                    {String((row as Record<string, unknown>)[col.name] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export const SpreadsheetViewerLayout: React.FC<SpreadsheetViewerLayoutProps> = memo(function SpreadsheetViewerLayout({
  testId,
  headerProps,
  entityStatusBarProps,
  mainView,
  emergencyFallback,
  sheetTabsProps,
  commentsSidebarProps,
  dialogsProps,
  diagnosticsProps,
  sidePanelsProps,
  collaborationHealthBannerProps,
  debugStatusBarProps
}) {
  return (
    <div className="gba:flex gba:flex-col gba:w-full gba:h-full gba:min-h-0 gba:overflow-hidden" data-testid={testId}>
      <SpreadsheetHeader {...headerProps} />

      {entityStatusBarProps ? <EntityDataStatusBar {...entityStatusBarProps} /> : null}

      <div className="gba:flex gba:flex-1 gba:min-h-0 gba:w-full gba:overflow-hidden">
        <div className="gba:flex gba:min-h-0 gba:min-w-0 gba:flex-1 gba:flex-col gba:overflow-hidden">
          <div className="gba:relative gba:min-h-0 gba:flex-1 gba:overflow-hidden">
            {mainView}
            {emergencyFallback.show ? (
              <SpreadsheetViewerEmergencyFallback
                columns={emergencyFallback.columns}
                sheetData={emergencyFallback.sheetData}
              />
            ) : null}
          </div>

          {sheetTabsProps ? <SpreadsheetSheetTabs {...sheetTabsProps} /> : null}
        </div>

        {commentsSidebarProps ? <SpreadsheetCommentsSidebar {...commentsSidebarProps} /> : null}
      </div>

      <SpreadsheetDialogsSection {...dialogsProps} />

      <SpreadsheetDiagnosticsDialog {...diagnosticsProps} />

      <SpreadsheetSidePanelsSection {...sidePanelsProps} />

      <SpreadsheetCollaborationHealthBanner {...collaborationHealthBannerProps} />

      {debugStatusBarProps ? <SpreadsheetDebugStatusBar {...debugStatusBarProps} /> : null}
    </div>
  )
})
