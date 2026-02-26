/**
 * SpreadsheetAppViewer
 *
 * Runtime viewer for a generated spreadsheet app.
 * Standardized on the top-level `components/`, `hooks/`, `views/` structure (no `viewer/` directory).
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { SpreadsheetAppViewerProps, SpreadsheetColumn, SpreadsheetSheet } from './types'
import { columnToFormField } from './types'
import { SpreadsheetApiService } from './services/SpreadsheetApiService'

import { useSpreadsheetViewerState } from './hooks/useSpreadsheetViewerState'
import { useSpreadsheetViewerCollaboration } from './hooks/useSpreadsheetViewerCollaboration'
import { useEntityDataSource } from './hooks/useEntityDataSource'
import { useSpreadsheetAutomations } from './hooks/useSpreadsheetAutomations'
import { useSpreadsheetBulkRows } from './hooks/useSpreadsheetBulkRows'
import { useSpreadsheetColumns } from './hooks/useSpreadsheetColumns'

import { useVersioning } from '../shared/hooks/useVersioning'
import { useComments } from '../shared/hooks/useComments'
import { useFileLock } from '../shared/hooks/useFileLock'
import { usePublishing } from '../shared/hooks/usePublishing'

import { TableView, FormView, DashboardView, KanbanView } from './views'
import type { UniverSheetGridHandle } from './components/UniverSheetGrid'
import { createUniverConversionContext } from './utils/univerAdapter'
import { AutomationsPanel } from './components/AutomationsPanel'
import { EntityDataStatusBar } from './components/EntityDataStatusBar'
import { SpreadsheetDialogsSection } from './components/SpreadsheetDialogsSection'
import { SpreadsheetHeader } from './components/SpreadsheetHeader'
import { SpreadsheetSheetTabs } from './components/SpreadsheetSheetTabs'

export const SpreadsheetAppViewer: React.FC<SpreadsheetAppViewerProps> = ({
  app,
  activeSheetId: initialSheetId,
  activeViewId: initialViewId,
  onDataChange,
  onRowAdd,
  onRowUpdate,
  onAppUpdate,
  onSheetUpdate,
  onBack,
  onEdit,
  isEditing = true,
  accessToken = '',
  userId,
  'data-testid': testId = 'spreadsheet-app-viewer'
}) => {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // --- Viewer State (sheet/view + local sheet data) ---
  const {
    activeSheetId,
    setActiveSheetId,
    activeSheet,
    activeView,
    localSheetData,
    setLocalSheetData,
    localSheetDataRef
  } = useSpreadsheetViewerState({
    app,
    initialSheetId,
    initialViewId: initialViewId ?? null
  })

  // --- Entity data source (optional per-sheet) ---
  const {
    state: entityState,
    loadData: loadEntityData,
    refresh: refreshEntityData
  } = useEntityDataSource({ accessToken, userId })
  const entityEnabled = Boolean(activeSheet.entityDataSource?.enabled)

  useEffect(() => {
    if (!entityEnabled || !activeSheet.entityDataSource) return
    void loadEntityData(activeSheet.entityDataSource)
  }, [activeSheetId, entityEnabled, activeSheet.entityDataSource, loadEntityData])

  const sheetData: Record<string, unknown>[] = useMemo(() => {
    if (!entityEnabled) return localSheetData
    return entityState.data?.records ?? []
  }, [entityEnabled, entityState.data?.records, localSheetData])

  const entityDataCount = entityEnabled ? (entityState.data?.count ?? 0) : localSheetData.length

  // --- Versioning / Comments / Lock / Publishing ---
  const versioning = useVersioning({
    entityId: app.id,
    entityType: 'spreadsheet_app',
    apiService: SpreadsheetApiService,
    autoSaveEnabled: true,
    autoSaveInterval: 30000
  })

  const comments = useComments({
    entityId: app.id,
    entityType: 'spreadsheet_app',
    apiService: SpreadsheetApiService
  })

  const fileLock = useFileLock({
    entityId: app.id,
    entityType: 'spreadsheet_app',
    currentUserId: userId,
    apiService: SpreadsheetApiService
  })

  const publishing = usePublishing({
    entityId: app.id,
    entityType: 'spreadsheet_app',
    currentStatus: app.publishMetadata?.status || 'draft',
    apiService: SpreadsheetApiService
  })

  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showCheckpointDialog, setShowCheckpointDialog] = useState(false)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [showComments, setShowComments] = useState(false)

  // --- Bulk row handlers (used by automation responses) ---
  const bulkRows = useSpreadsheetBulkRows({
    app,
    activeSheet: activeSheet ?? null,
    localSheetDataRef,
    setLocalSheetData,
    onDataChange,
    onAppUpdate,
    saveTimeoutRef
  })

  // Persist automations/workflow links back into the sheet config
  const persistSheetPatch = useCallback(
    (patch: Partial<SpreadsheetSheet>) => {
      if (onSheetUpdate) {
        void onSheetUpdate(app.id, activeSheetId, patch)
        return
      }
      if (!onAppUpdate) return
      const updatedSheets = app.sheets.map(sheet =>
        sheet.id === activeSheetId ? { ...sheet, ...patch, data: localSheetDataRef.current } : sheet
      )
      onAppUpdate({ ...app, sheets: updatedSheets })
    },
    [app, activeSheetId, localSheetDataRef, onAppUpdate, onSheetUpdate]
  )

  const automations = useSpreadsheetAutomations({
    spreadsheetId: app.id,
    sheetId: activeSheetId,
    accessToken,
    currentUserId: userId || '',
    initialAutomations: activeSheet.automations || [],
    initialWorkflowLinks: activeSheet.workflowLinks || [],
    onAutomationsChange: newAutomations => persistSheetPatch({ automations: newAutomations }),
    onWorkflowLinksChange: newLinks => persistSheetPatch({ workflowLinks: newLinks }),
    onAddRows: bulkRows.handleAddRows,
    onUpdateRows: bulkRows.handleUpdateRows,
    enablePolling: true,
    pollInterval: 10000
  })

  const [isAutomationsOpen, setIsAutomationsOpen] = useState(false)

  const spreadsheetGridRef = useRef<UniverSheetGridHandle | null>(null)

  // --- Collaboration (header presence + Univer grid operations/cursors) ---
  const handleCollaborationOperation = useCallback(
    (payload: { operation: { type: string; data?: unknown } }) => {
      const operation = payload.operation
      if (operation.type !== 'cell_update' && operation.type !== 'cell_change') return
      const d = operation.data as {
        sheetId?: string
        rowId?: string
        column?: string
        columnId?: string
        value?: unknown
      }
      if (!d?.sheetId || d.sheetId !== activeSheetId || d.rowId == null || d.value === undefined)
        return
      const columnKey = d.column ?? d.columnId
      if (columnKey == null) return
      const ctx = createUniverConversionContext(activeSheet.columns, localSheetDataRef.current)
      const rowIndex = ctx.rowIdToIndex.get(String(d.rowId))
      let colIndex = ctx.columnIdToIndex.get(String(columnKey))
      if (colIndex === undefined) {
        colIndex = activeSheet.columns.findIndex(
          (c) => c.id === columnKey || c.name === columnKey
        )
      }
      if (rowIndex !== undefined && colIndex !== undefined && colIndex >= 0) {
        spreadsheetGridRef.current?.applyRemoteCellUpdate(rowIndex, colIndex, d.value)
      }
    },
    [activeSheetId, activeSheet.columns]
  )

  const collaboration = useSpreadsheetViewerCollaboration({
    appId: app.id,
    accessToken,
    onOperationReceived: handleCollaborationOperation
  })

  // --- Column handling (includes auto-add for Univer grid) ---
  const handleCellChangeRef = useRef<(rowId: string, columnName: string, value: unknown) => void>(() => {})

  const columnsState = useSpreadsheetColumns({
    app,
    activeSheet,
    localSheetDataRef,
    handleCellChangeRef,
    onAppUpdate,
    onSheetUpdate,
    isCollaborationConnected: collaboration.isCollaborationConnected,
    emitOperation: op => collaboration.emitOperation(op as any)
  })

  // --- Row edit dialog state + handlers ---
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null)

  const handleCellChange = useCallback(
    async (rowId: string, columnName: string, value: unknown) => {
      if (entityEnabled) return // entity-sourced sheets are treated as read-only for now

      const current = localSheetDataRef.current
      const idx = current.findIndex(r => String(r._id ?? r.id ?? '') === String(rowId))
      if (idx < 0) return

      const row = current[idx]
      const backendRowId = (row as any)._rowUuid || (row as any)._id || (row as any).id || rowId

      const updatedRow = { ...row, [columnName]: value, _updatedAt: new Date().toISOString() }
      const next = [...current.slice(0, idx), updatedRow, ...current.slice(idx + 1)]
      setLocalSheetData(next)
      onDataChange?.(activeSheetId, next)

      try {
        if (onRowUpdate) {
          await onRowUpdate(app.id, activeSheetId, String(backendRowId), { [columnName]: value })
        } else {
          await SpreadsheetApiService.updateRow(app.id, activeSheetId, String(backendRowId), { [columnName]: value })
        }
      } catch (error) {
        console.error('[SpreadsheetAppViewer] Failed to persist cell change:', error)
      }
    },
    [activeSheetId, app.id, entityEnabled, localSheetDataRef, onDataChange, onRowUpdate, setLocalSheetData]
  )

  useEffect(() => {
    handleCellChangeRef.current = handleCellChange
  }, [handleCellChange])

  const handleUniverDataChange = useCallback(
    async (newData: Record<string, unknown>[]) => {
      if (entityEnabled) return

      const prev = localSheetDataRef.current
      if (newData.length <= prev.length) return

      const added = newData.slice(prev.length)
      const createdRows: Record<string, unknown>[] = []

      for (const row of added) {
        const rowPayload: Record<string, unknown> = {}
        activeSheet.columns.forEach(col => {
          const v = row[col.name]
          if (v !== undefined) rowPayload[col.name] = v
        })

        try {
          const saved = onRowAdd
            ? await onRowAdd(app.id, activeSheetId, rowPayload)
            : await SpreadsheetApiService.addRow(app.id, activeSheetId, rowPayload)
          createdRows.push({ ...row, ...(saved || {}) })
        } catch (error) {
          console.error('[SpreadsheetAppViewer] Failed to persist added row:', error)
        }
      }

      const next = [...prev, ...createdRows]
      setLocalSheetData(next)
      onDataChange?.(activeSheetId, next)
    },
    [
      activeSheet.columns,
      activeSheetId,
      app.id,
      entityEnabled,
      localSheetDataRef,
      onDataChange,
      onRowAdd,
      setLocalSheetData
    ]
  )

  const formFields = useMemo(() => {
    const visible = activeSheet.columns.filter(c => c.isVisible)
    return visible.map((col, idx) => columnToFormField(col, idx))
  }, [activeSheet.columns])

  const handleUpdateRow = useCallback(
    async (values: Record<string, unknown>) => {
      if (!editingRow) return
      const rowId = String(editingRow._id ?? editingRow.id ?? '')
      if (!rowId) return

      const next = localSheetDataRef.current.map(r => (String(r._id ?? r.id ?? '') === rowId ? { ...r, ...values } : r))
      setLocalSheetData(next)
      onDataChange?.(activeSheetId, next)
      setEditingRow(null)

      try {
        if (onRowUpdate) {
          await onRowUpdate(app.id, activeSheetId, rowId, values)
        } else {
          await SpreadsheetApiService.updateRow(app.id, activeSheetId, rowId, values)
        }
      } catch (error) {
        console.error('[SpreadsheetAppViewer] Failed to update row:', error)
      }
    },
    [activeSheetId, app.id, editingRow, localSheetDataRef, onDataChange, onRowUpdate, setLocalSheetData]
  )

  const handleDeleteRow = useCallback(
    async (rowId: string) => {
      const next = localSheetDataRef.current.filter(r => String(r._id ?? r.id ?? '') !== String(rowId))
      setLocalSheetData(next)
      onDataChange?.(activeSheetId, next)
      try {
        await SpreadsheetApiService.deleteRow(app.id, activeSheetId, rowId)
      } catch (error) {
        console.error('[SpreadsheetAppViewer] Failed to delete row:', error)
      }
    },
    [activeSheetId, app.id, localSheetDataRef, onDataChange, setLocalSheetData]
  )

  // --- Column editing save (from dialog) ---
  const [editingColumns, setEditingColumns] = useState<SpreadsheetColumn[]>([])
  const onSaveColumns = useCallback(
    (columns: SpreadsheetColumn[]) => persistSheetPatch({ columns }),
    [persistSheetPatch]
  )

  // --- Active view type ---
  const viewType = activeView?.config.type || activeSheet.viewType || 'table'

  return (
    <div className="gba:flex gba:flex-col gba:w-full gba:h-full gba:overflow-hidden" data-testid={testId}>
      <SpreadsheetHeader
        app={app}
        activeSheet={activeSheet}
        onBack={onBack}
        isEditing={isEditing}
        canEdit={isEditing && !entityEnabled}
        headerParticipants={collaboration.headerParticipants}
        isCollaborationConnected={collaboration.isCollaborationConnected}
        isEntityDataLoading={entityState.isLoading}
        onRefreshEntityData={() => void refreshEntityData()}
        versioning={{
          isSaving: versioning.isSaving,
          lastSaveTime: versioning.lastSaveTime,
          hasUnsavedChanges: versioning.hasUnsavedChanges
        }}
        onShowCheckpointDialog={() => setShowCheckpointDialog(true)}
        onShowVersionHistory={() => setShowVersionHistory(true)}
        publishingStatus={app.publishMetadata?.status || 'draft'}
        showComments={showComments}
        setShowComments={setShowComments}
        unresolvedCommentCount={comments.unresolvedCount}
        fileLock={{
          lock: fileLock.lock,
          isLockedByMe: fileLock.isLockedByMe,
          acquireLock: fileLock.acquireLock,
          releaseLock: fileLock.releaseLock
        }}
        onShowPublishDialog={() => setShowPublishDialog(true)}
        onAddColumn={columnsState.handleAddColumn}
        onManageColumns={() => columnsState.setIsManageColumnsDialogOpen(true)}
        onOpenAutomations={() => setIsAutomationsOpen(true)}
        onEdit={onEdit}
        testId={testId}
      />

      {entityEnabled && (
        <EntityDataStatusBar
          isLoading={entityState.isLoading}
          error={entityState.error}
          dataCount={entityDataCount}
          dataSourceName={activeSheet.entityDataSource?.entityDisplayName}
          onRefresh={() => void refreshEntityData()}
          onEdit={onEdit}
          data-testid={`${testId}-entity-data-status-bar`}
        />
      )}

      <div className="gba:flex-1 gba:relative gba:min-h-0 gba:overflow-hidden">
        {viewType === 'table' && (
          <TableView
            sheet={activeSheet}
            data={sheetData}
            columns={[]}
            spreadsheetColumns={activeSheet.columns.filter(c => c.isVisible)}
            testId={`${testId}-table-view`}
            onCellChange={handleCellChange}
            onDataChange={handleUniverDataChange}
            onColumnAdd={columnsState.handleAutoColumnAdd}
            participants={collaboration.cursorParticipants}
            onOperationEmit={op => collaboration.emitOperation(op as any)}
            onCursorEmit={pos => collaboration.emitCursor({ path: pos.path })}
            collaborationEnabled={collaboration.isCollaborationConnected}
            isReadOnly={!isEditing || entityEnabled}
            gridRef={spreadsheetGridRef}
          />
        )}

        {viewType === 'form' && (
          <FormView
            sheet={activeSheet}
            data={sheetData}
            onEdit={row => setEditingRow(row)}
            onDelete={handleDeleteRow}
            testId={`${testId}-form-view`}
          />
        )}

        {viewType === 'dashboard' && (
          <DashboardView sheet={activeSheet} data={sheetData} testId={`${testId}-dashboard-view`} />
        )}

        {viewType === 'kanban' && (
          <KanbanView
            sheet={activeSheet}
            data={sheetData}
            view={activeView!}
            onEdit={row => setEditingRow(row)}
            testId={`${testId}-kanban-view`}
          />
        )}
      </div>

      <SpreadsheetSheetTabs
        sheets={app.sheets}
        activeSheetId={activeSheetId}
        onSheetChange={setActiveSheetId}
        entityDataLength={entityEnabled ? entityDataCount : undefined}
        data-testid={`${testId}-sheet-tabs`}
      />

      <SpreadsheetDialogsSection
        editingRow={editingRow}
        setEditingRow={setEditingRow}
        formFields={formFields}
        handleUpdateRow={handleUpdateRow}
        accessToken={accessToken}
        isManageColumnsDialogOpen={columnsState.isManageColumnsDialogOpen}
        setIsManageColumnsDialogOpen={columnsState.setIsManageColumnsDialogOpen}
        columns={activeSheet.columns}
        editingColumns={editingColumns}
        setEditingColumns={setEditingColumns}
        handleAddColumn={columnsState.handleAddColumn}
        onSaveColumns={onSaveColumns}
        showVersionHistory={showVersionHistory}
        setShowVersionHistory={setShowVersionHistory}
        versioning={versioning as any}
        handleRestoreVersion={versioning.restoreVersion as any}
        showCheckpointDialog={showCheckpointDialog}
        setShowCheckpointDialog={setShowCheckpointDialog}
        showPublishDialog={showPublishDialog}
        setShowPublishDialog={setShowPublishDialog}
        publishing={publishing as any}
        showComments={showComments}
        setShowComments={setShowComments}
        comments={comments as any}
        currentUserId={userId}
        currentUserName={collaboration.currentUserName}
        currentUserAvatar={collaboration.currentUserAvatar}
        testId={testId}
      />

      <AutomationsPanel
        isOpen={isAutomationsOpen}
        onClose={() => setIsAutomationsOpen(false)}
        automations={automations.automations}
        executionHistory={automations.executionHistory}
        workflowLinks={automations.workflowLinks}
        isLoading={automations.isLoading}
        columns={activeSheet.columns}
        sheetData={sheetData}
        spreadsheetId={app.id}
        sheetId={activeSheetId}
        accessToken={accessToken}
        onCreateAutomation={automations.createAutomation}
        onUpdateAutomation={automations.updateAutomation}
        onDeleteAutomation={automations.deleteAutomation}
        onToggleAutomation={async (id, enabled) => automations.toggleAutomation(id, enabled)}
        onDuplicateAutomation={automations.duplicateAutomation}
        onRunAutomation={(id, rows) => automations.runAutomation(id, rows)}
        onRefreshWorkflowStatuses={() => void automations.refreshWorkflowStatuses()}
        data-testid={`${testId}-automations-panel`}
      />
    </div>
  )
}
