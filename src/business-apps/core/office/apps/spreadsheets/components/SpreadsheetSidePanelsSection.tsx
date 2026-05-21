import { AnalyticsPanel } from './AnalyticsPanel'
import { AutomationsPanel } from './AutomationsPanel'
import { SheetsAIPanel } from './SheetsAIPanel'
import type { AnalyticsPanelTab, SheetsAITab } from '../hooks/useSpreadsheetSidePanelState'

type ViewerRow = Record<string, unknown>

export interface SpreadsheetSidePanelsSectionProps {
  isAutomationsOpen: boolean
  isAnalyticsOpen: boolean
  isSheetsAIOpen: boolean
  closeAutomationsPanel: () => void
  closeAnalyticsPanel: () => void
  closeSheetsAIPanel: () => void
  analyticsInitialTab: AnalyticsPanelTab
  sheetsAIInitialTab: SheetsAITab
  columns: any[]
  sheetData: ViewerRow[]
  sheetName: string
  activeSheetId: string
  appId: string
  accessToken: string
  canEditWithLock: boolean
  viewType: string
  entityEnabled: boolean
  getHeaderRowFromGrid?: (() => Map<string, string> | null) | undefined
  getSheetDataFromGrid?: (() => Record<string, unknown>[] | null) | undefined
  handleInsertAnalyticsRows: (rows: unknown[]) => Promise<void>
  handleApplyFormulaToColumn: (columnName: string, formula: string) => Promise<boolean>
  handleCreateReviewComment: (content: string) => Promise<boolean>
  onOpenCheckpointDialog: () => void
  testId: string
  automations: {
    automations: unknown[]
    executionHistory: unknown[]
    workflowLinks: unknown[]
    isLoading: boolean
    createAutomation: (...args: any[]) => Promise<unknown>
    updateAutomation: (...args: any[]) => Promise<unknown>
    deleteAutomation: (...args: any[]) => Promise<unknown>
    toggleAutomation: (id: string, enabled: boolean) => Promise<unknown>
    duplicateAutomation: (...args: any[]) => Promise<unknown>
    runAutomation: (id: string, rows: unknown[]) => Promise<unknown>
    refreshWorkflowStatuses: () => Promise<void>
    refreshAutomationsFromDocumentService: () => Promise<void>
  }
  onCheckCollectionResponses: () => void | Promise<void>
  onBulkCollectionColumnLabelsUpdate: (updates: Array<{ columnId: string; newLabel: string }>) => void | Promise<void>
}

export function SpreadsheetSidePanelsSection({
  isAutomationsOpen,
  isAnalyticsOpen,
  isSheetsAIOpen,
  closeAutomationsPanel,
  closeAnalyticsPanel,
  closeSheetsAIPanel,
  analyticsInitialTab,
  sheetsAIInitialTab,
  columns,
  sheetData,
  sheetName,
  activeSheetId,
  appId,
  accessToken,
  canEditWithLock,
  viewType,
  entityEnabled,
  getHeaderRowFromGrid,
  getSheetDataFromGrid,
  handleInsertAnalyticsRows,
  handleApplyFormulaToColumn,
  handleCreateReviewComment,
  onOpenCheckpointDialog,
  testId,
  automations,
  onCheckCollectionResponses,
  onBulkCollectionColumnLabelsUpdate
}: SpreadsheetSidePanelsSectionProps) {
  const headerRowReader = viewType === 'table' ? getHeaderRowFromGrid : undefined
  const sheetDataReader = viewType === 'table' && !entityEnabled ? getSheetDataFromGrid : undefined

  return (
    <>
      <AutomationsPanel
        isOpen={isAutomationsOpen}
        onClose={closeAutomationsPanel}
        automations={automations.automations}
        executionHistory={automations.executionHistory}
        workflowLinks={automations.workflowLinks}
        isLoading={automations.isLoading}
        columns={columns}
        sheetData={sheetData}
        spreadsheetId={appId}
        sheetId={activeSheetId}
        accessToken={accessToken}
        onCreateAutomation={automations.createAutomation}
        onUpdateAutomation={automations.updateAutomation}
        onDeleteAutomation={automations.deleteAutomation}
        onToggleAutomation={(id, enabled) => automations.toggleAutomation(id, enabled)}
        onDuplicateAutomation={automations.duplicateAutomation}
        onRunAutomation={(id, rows) => automations.runAutomation(id, rows)}
        onRefreshWorkflowStatuses={() => void automations.refreshWorkflowStatuses()}
        onRefreshAutomations={() => void automations.refreshAutomationsFromDocumentService()}
        onCheckCollectionResponses={onCheckCollectionResponses}
        onColumnLabelsUpdate={onBulkCollectionColumnLabelsUpdate}
        data-testid={`${testId}-automations-panel`}
      />

      <AnalyticsPanel
        isOpen={isAnalyticsOpen}
        onClose={closeAnalyticsPanel}
        initialTab={analyticsInitialTab}
        columns={columns}
        sheetData={sheetData}
        sheetName={sheetName}
        sheetId={activeSheetId}
        accessToken={accessToken}
        canEdit={canEditWithLock}
        onInsertRows={handleInsertAnalyticsRows}
        getHeaderRowFromGrid={headerRowReader}
        getSheetDataFromGrid={sheetDataReader}
        data-testid={`${testId}-analytics-panel`}
      />

      <SheetsAIPanel
        isOpen={isSheetsAIOpen}
        onClose={closeSheetsAIPanel}
        initialTab={sheetsAIInitialTab}
        appId={appId}
        sheetId={activeSheetId}
        sheetName={sheetName}
        accessToken={accessToken}
        columns={columns}
        sheetData={sheetData}
        onApplyFormula={handleApplyFormulaToColumn}
        onCreateReviewComment={handleCreateReviewComment}
        onOpenCheckpointDialog={onOpenCheckpointDialog}
        getHeaderRowFromGrid={headerRowReader}
        getSheetDataFromGrid={sheetDataReader}
        data-testid={`${testId}-sheets-ai-panel`}
      />
    </>
  )
}
