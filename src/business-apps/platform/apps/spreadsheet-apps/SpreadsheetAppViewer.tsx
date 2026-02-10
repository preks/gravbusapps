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
import { emitDocumentActivity, emitDocumentActivityEnd } from '../spaces/hooks/useSpaceDocumentActivity'

import { TableView, FormView, DashboardView, KanbanView } from './views'
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
  const cellChangeBatchTimerRef = useRef<NodeJS.Timeout | null>(null)
  // Accumulate per-row cell changes so a multi-cell paste sends ONE backend PATCH
  const pendingCellUpdates = useRef<Map<string, { backendRowId: string; changes: Record<string, unknown> }>>(new Map())
  const cellPersistTimerRef = useRef<NodeJS.Timeout | null>(null)

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
    onSheetUpdate,
    onRowUpdate,
    onRowAdd,
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
  const [remoteUpdateKey, setRemoteUpdateKey] = useState(0)
  const [receivedOperation, setReceivedOperation] = useState<{
    operation: any
    timestamp: number
  } | null>(null)

  // --- Collaboration (header presence + FortuneSheet operations/cursors) ---
  const handleCollaborationOperation = useCallback((op: any) => {
    // Pass received operation to the grid so it can apply it
    if (op?.operation) {
      setReceivedOperation({ operation: op.operation, timestamp: Date.now() })
    }
  }, [])

  const collaboration = useSpreadsheetViewerCollaboration({
    appId: app.id,
    accessToken,
    onOperationReceived: handleCollaborationOperation
  })

  // Broadcast document activity to Spaces app
  useEffect(() => {
    if (!app.id || !userId) return

    const activityType = isEditing ? 'editing' : 'viewing'
    const docTitle = app.name || 'Untitled Spreadsheet'
    const urlSpaceId = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('spaceId') : null

    // Emit activity when starting
    emitDocumentActivity({
      userId,
      userName: collaboration.currentUserName || 'User',
      userAvatar: collaboration.currentUserAvatar,
      documentId: app.id,
      documentTitle: docTitle,
      documentType: 'spreadsheet',
      activityType,
      spaceId: urlSpaceId || undefined
    })

    // Keep-alive: re-emit activity every 30 seconds
    const keepAliveInterval = setInterval(() => {
      emitDocumentActivity({
        userId,
        userName: collaboration.currentUserName || 'User',
        userAvatar: collaboration.currentUserAvatar,
        documentId: app.id,
        documentTitle: docTitle,
        documentType: 'spreadsheet',
        activityType,
        spaceId: urlSpaceId || undefined
      })
    }, 30000)

    // Cleanup: emit activity end when leaving
    return () => {
      clearInterval(keepAliveInterval)
      emitDocumentActivityEnd(userId, app.id)
    }
  }, [app.id, app.name, userId, collaboration.currentUserName, collaboration.currentUserAvatar, isEditing])

  // --- Column handling (includes auto-add for FortuneSheet) ---
  const handleCellChangeRef = useRef<
    (rowId: string, columnName: string, value: unknown, options?: { fromRemote?: boolean }) => void
  >(() => {})

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
    async (rowId: string, columnName: string, value: unknown, options?: { fromRemote?: boolean }) => {
      if (entityEnabled) return

      const current = localSheetDataRef.current
      const idx = current.findIndex(r => String(r._id ?? r.id ?? '') === String(rowId))
      if (idx < 0) return

      const row = current[idx]
      const backendRowId = (row as any)._rowUuid || (row as any)._id || (row as any).id || rowId

      // Update the ref IMMEDIATELY (synchronously) so concurrent calls
      // (e.g. multi-cell paste) each see the previous call's changes.
      // Without this, all concurrent calls read the same original row
      // and only the last setLocalSheetData wins — losing all but one cell.
      const updatedRow = { ...row, [columnName]: value, _updatedAt: new Date().toISOString() }
      const next = [...current.slice(0, idx), updatedRow, ...current.slice(idx + 1)]
      localSheetDataRef.current = next

      if (options?.fromRemote) return

      // Debounce the React state update so all concurrent cell changes
      // (from a multi-cell paste) are batched into a single re-render.
      if (cellChangeBatchTimerRef.current) {
        clearTimeout(cellChangeBatchTimerRef.current)
      }
      cellChangeBatchTimerRef.current = setTimeout(() => {
        setLocalSheetData([...localSheetDataRef.current])
        onDataChange?.(activeSheetId, localSheetDataRef.current)
        cellChangeBatchTimerRef.current = null
      }, 50)

      // Accumulate cell changes per row so a multi-cell paste sends ONE
      // backend PATCH with all columns, avoiding the backend race condition
      // where concurrent PATCHes each read the same row and overwrite each other.
      const existing = pendingCellUpdates.current.get(rowId)
      if (existing) {
        existing.changes[columnName] = value
      } else {
        pendingCellUpdates.current.set(rowId, {
          backendRowId: String(backendRowId),
          changes: { [columnName]: value }
        })
      }

      if (cellPersistTimerRef.current) {
        clearTimeout(cellPersistTimerRef.current)
      }
      cellPersistTimerRef.current = setTimeout(async () => {
        const pending = new Map(pendingCellUpdates.current)
        pendingCellUpdates.current.clear()
        cellPersistTimerRef.current = null

        for (const [, { backendRowId: bid, changes }] of pending) {
          try {
            if (onRowUpdate) {
              await onRowUpdate(app.id, activeSheetId, bid, changes)
            } else {
              await SpreadsheetApiService.updateRow(app.id, activeSheetId, bid, changes)
            }
          } catch (error) {
            console.error('[SpreadsheetAppViewer] Failed to persist cell changes:', error)
          }
        }
      }, 100)
    },
    [activeSheetId, app.id, entityEnabled, localSheetDataRef, onDataChange, onRowUpdate, setLocalSheetData]
  )

  useEffect(() => {
    handleCellChangeRef.current = handleCellChange
  }, [handleCellChange])

  const handleFortuneSheetDataChange = useCallback(
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

  // --- Row insert/delete from FortuneSheet context menu ---

  // Helper to extract the backend UUID from a row object
  const getRowBackendId = useCallback((row: Record<string, unknown>): string => {
    return String(row._rowUuid ?? row._id ?? row.id ?? '')
  }, [])

  // Save the current row order to sheet settings so it's preserved across refreshes
  const persistRowOrder = useCallback(
    (rows: Record<string, unknown>[]) => {
      const rowOrder = rows.map(getRowBackendId).filter(Boolean)
      persistSheetPatch({ settings: { ...activeSheet.settings, rowOrder } })
    },
    [activeSheet.settings, getRowBackendId, persistSheetPatch]
  )

  const handleRowsInsert = useCallback(
    async (insertIndex: number, count: number, direction: 'lefttop' | 'rightbottom') => {
      if (entityEnabled) return

      const insertAt = direction === 'rightbottom' ? insertIndex + 1 : insertIndex
      const current = localSheetDataRef.current
      const newRows: Record<string, unknown>[] = []

      for (let i = 0; i < count; i++) {
        const rowPayload: Record<string, unknown> = {}
        activeSheet.columns.forEach(col => {
          rowPayload[col.name] = col.defaultValue ?? ''
        })

        try {
          const saved = onRowAdd
            ? await onRowAdd(app.id, activeSheetId, rowPayload)
            : await SpreadsheetApiService.addRow(app.id, activeSheetId, rowPayload)
          newRows.push({ ...rowPayload, ...(saved || {}) })
        } catch (error) {
          console.error('[SpreadsheetAppViewer] Failed to persist inserted row:', error)
          newRows.push(rowPayload)
        }
      }

      const next = [...current.slice(0, insertAt), ...newRows, ...current.slice(insertAt)]
      localSheetDataRef.current = next
      setLocalSheetData(next)

      // Save row order to sheet settings (persists across refresh)
      persistRowOrder(next)
    },
    [
      activeSheet.columns,
      activeSheetId,
      app.id,
      entityEnabled,
      localSheetDataRef,
      onRowAdd,
      persistRowOrder,
      setLocalSheetData
    ]
  )

  const handleRowsDelete = useCallback(
    async (startIndex: number, endIndex: number) => {
      if (entityEnabled) return

      const current = localSheetDataRef.current
      const rowsToDelete = current.slice(startIndex, endIndex + 1)

      // Remove from local state
      const next = [...current.slice(0, startIndex), ...current.slice(endIndex + 1)]
      localSheetDataRef.current = next
      setLocalSheetData(next)

      // Delete from backend
      for (const row of rowsToDelete) {
        const rowId = getRowBackendId(row)
        if (rowId) {
          try {
            await SpreadsheetApiService.deleteRow(app.id, activeSheetId, rowId)
          } catch (error) {
            console.error('[SpreadsheetAppViewer] Failed to delete row:', error)
          }
        }
      }

      // Save row order to sheet settings (persists across refresh)
      persistRowOrder(next)
    },
    [activeSheetId, app.id, entityEnabled, getRowBackendId, localSheetDataRef, persistRowOrder, setLocalSheetData]
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
        onRename={
          onAppUpdate
            ? newName => {
                const trimmed = newName.trim()
                if (trimmed && trimmed !== app.name) {
                  onAppUpdate({ ...app, name: trimmed })
                }
              }
            : undefined
        }
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
            onDataChange={handleFortuneSheetDataChange}
            onColumnAdd={columnsState.handleAutoColumnAdd}
            onColumnsInsert={columnsState.handleColumnsInsert}
            onColumnsDelete={columnsState.handleColumnsDelete}
            onRowsInsert={handleRowsInsert}
            onRowsDelete={handleRowsDelete}
            participants={collaboration.cursorParticipants}
            onOperationEmit={op => collaboration.emitOperation(op as any)}
            onCursorEmit={pos => collaboration.emitCursor({ path: pos.path })}
            collaborationEnabled={collaboration.isCollaborationConnected}
            onRemoteChangeApplied={() => setRemoteUpdateKey(k => k + 1)}
            remoteUpdateKey={remoteUpdateKey}
            receivedOperation={receivedOperation}
            isReadOnly={!isEditing || entityEnabled}
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
