/**
 * SpreadsheetAppViewer Component
 *
 * The main runtime viewer for generated spreadsheet apps.
 * Renders table, form, dashboard, and kanban views based on configuration.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { Card } from '@newwork/nw-design-system'
import type { DynamicFormField } from '@/business-apps/ser/types/flowTemplate'
import type { SpreadsheetApp, SpreadsheetSheet, SpreadsheetColumn } from './types'
import type { SpreadsheetAutomation, WorkflowRowLink } from './types/automation'
import { evaluateFormula, isFormula, type FormulaContext } from './utils/formulaEvaluator'
import { useEntityDataSource } from './hooks/useEntityDataSource'
import { useSpreadsheetViewerState } from './hooks/useSpreadsheetViewerState'
import { useSpreadsheetViewerCollaboration } from './hooks/useSpreadsheetViewerCollaboration'
import { useSpreadsheetCellSelection } from './hooks/useSpreadsheetCellSelection'
import { useSpreadsheetFormulas } from './hooks/useSpreadsheetFormulas'
import { useSpreadsheetColumns } from './hooks/useSpreadsheetColumns'
import { useSpreadsheetRows } from './hooks/useSpreadsheetRows'
import { useSpreadsheetBulkRows } from './hooks/useSpreadsheetBulkRows'
import { useSpreadsheetTableColumns } from './hooks/useSpreadsheetTableColumns'
import { useSpreadsheetAutomations } from './hooks/useSpreadsheetAutomations'
import { isTrackingColumn } from './utils/trackingColumns'
import { mapColumnTypeToFormType } from './utils/columnTypeMapping'
// isValidUrl, urlToMarkdown, isMarkdownLink moved to EditableCell in ./views
import { computeNextLocalSheetData, persistCellChangeToBackend } from './viewer/cellChange'
import { appendCellRef, buildRangeCells } from './viewer/formulaSelection'
import { createSpreadsheetGlobalKeyDownHandler, type SelectedCell as GlobalSelectedCell } from './viewer/globalKeyDown'
import { SpreadsheetApiService } from './services/SpreadsheetApiService'
import { useVersioning } from '../shared/hooks/useVersioning'
import { useFileLock } from '../shared/hooks/useFileLock'
import { useComments } from '../shared/hooks/useComments'
import { type FortuneSheetGridHandle } from './components/FortuneSheetGrid'
import { SpreadsheetSheetTabs } from './components/SpreadsheetSheetTabs'
import { EntityDataStatusBar } from './components/EntityDataStatusBar'
import { AutomationsPanel } from './components/AutomationsPanel'
import { SpreadsheetHeader } from './components/SpreadsheetHeader'
import { SpreadsheetDialogsSection, type SpreadsheetDialogsSectionProps } from './components/SpreadsheetDialogsSection'
import { usePublishing } from '../shared/hooks/usePublishing'
// LinkEditor moved to EditableCell in ./views
import { TableView, FormView, DashboardView, KanbanView } from './views'

/**
 * Get a nested value from an object using dot notation path
 * e.g., getNestedValue(obj, "ownerEmployee.displayName")
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.')
  let value: unknown = obj

  for (const part of parts) {
    if (value === null || value === undefined) return undefined
    if (typeof value === 'object') {
      value = (value as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }

  return value
}

export interface SpreadsheetAppViewerProps {
  app: SpreadsheetApp
  activeSheetId?: string
  activeViewId?: string
  onDataChange?: (sheetId: string, data: Record<string, unknown>[]) => void
  onRowAdd?: (
    appId: string,
    sheetId: string,
    rowData: Record<string, unknown>
  ) => Promise<Record<string, unknown> | null>
  onRowUpdate?: (
    appId: string,
    sheetId: string,
    rowId: string,
    updates: Record<string, unknown>
  ) => Promise<Record<string, unknown> | null>
  onAppUpdate?: (app: SpreadsheetApp) => void
  onSheetUpdate?: (
    appId: string,
    sheetId: string,
    updates: Partial<SpreadsheetSheet>
  ) => Promise<SpreadsheetSheet | null>
  onBack?: () => void
  onEdit?: () => void
  isEditing?: boolean
  accessToken?: string
  userId?: string
  'data-testid'?: string
}

/**
 * SpreadsheetAppViewer Component
 */
export const SpreadsheetAppViewer: React.FC<SpreadsheetAppViewerProps> = ({
  app,
  activeSheetId: initialSheetId,
  activeViewId: initialViewId,
  onDataChange,
  onAppUpdate: _onAppUpdate,
  onSheetUpdate,
  onBack,
  onEdit,
  isEditing = true,
  accessToken = '',
  userId,
  'data-testid': testId = 'spreadsheet-app-viewer'
}) => {
  // Core viewer state (active sheet, view, local data)
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
    initialViewId
  })

  // UI State
  const [isAutomationsOpen, setIsAutomationsOpen] = useState(false)

  // Versioning UI state
  const [showVersionHistory, setShowVersionHistory] = useState(false)
  const [showCheckpointDialog, setShowCheckpointDialog] = useState(false)
  const [showPublishDialog, setShowPublishDialog] = useState(false)
  const [showComments, setShowComments] = useState(false)

  // Versioning, Comments, Locking, Publishing hooks
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

  // Prevent the entire page from horizontally overflowing when the table content (or resizer handles)
  // becomes slightly wider than the viewport. We keep horizontal scrolling inside the table container.
  //
  // NOTE: We set *style* properties (not classes) because global CSS may set `overflow: auto` later in the cascade,
  // which would override `overflow-x` utilities on <html>/<body>.
  useEffect(() => {
    const html = document.documentElement
    const body = document.body

    const prevHtmlOverflowX = html.style.overflowX
    const prevBodyOverflowX = body.style.overflowX

    html.style.overflowX = 'hidden'
    body.style.overflowX = 'hidden'

    return () => {
      html.style.overflowX = prevHtmlOverflowX
      body.style.overflowX = prevBodyOverflowX
    }
  }, [])

  // Entity data loading
  const [entityData, setEntityData] = useState<Record<string, unknown>[]>([])
  const [isEntityDataLoading, setIsEntityDataLoading] = useState(false)
  const [entityDataError, setEntityDataError] = useState<string | null>(null)

  // Entity data source hook
  const { loadData: loadEntityData } = useEntityDataSource({
    accessToken,
    userId
  })

  // Get initial automations from current sheet (computed before activeSheet memo)
  const currentSheetData = useMemo(() => {
    return app.sheets.find(s => s.id === activeSheetId)
  }, [app.sheets, activeSheetId])

  // Automations hook - persist automations to sheet data
  const handleAutomationsChange = useCallback(
    (newAutomations: SpreadsheetAutomation[]) => {
      if (_onAppUpdate) {
        const updatedSheets = app.sheets.map(sheet =>
          sheet.id === activeSheetId
            ? {
                ...sheet,
                // IMPORTANT: Preserve latest local sheet data to avoid stale overwrites
                // when automations change triggers a save concurrently with row updates.
                data: localSheetDataRef.current,
                automations: newAutomations
              }
            : sheet
        )
        _onAppUpdate({ ...app, sheets: updatedSheets })
      }
    },
    [app, activeSheetId, _onAppUpdate]
  )

  const handleWorkflowLinksChange = useCallback(
    (newLinks: WorkflowRowLink[]) => {
      if (_onAppUpdate) {
        const updatedSheets = app.sheets.map(sheet =>
          sheet.id === activeSheetId
            ? {
                ...sheet,
                // IMPORTANT: Preserve latest local sheet data to avoid stale overwrites
                // when workflowLinks updates race with row additions/updates.
                data: localSheetDataRef.current,
                workflowLinks: newLinks
              }
            : sheet
        )
        _onAppUpdate({ ...app, sheets: updatedSheets })
      }
    },
    [app, activeSheetId, _onAppUpdate]
  )

  // Timeout ref for cleanup (defined early for bulk rows hook)
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)

  // Bulk row handlers (from automation responses)
  const { handleAddRowsRef, handleUpdateRowsRef } = useSpreadsheetBulkRows({
    app,
    activeSheet,
    localSheetDataRef,
    setLocalSheetData,
    onDataChange,
    onAppUpdate: _onAppUpdate,
    saveTimeoutRef
  })

  const {
    automations,
    executionHistory,
    workflowLinks,
    isLoading: isAutomationsLoading,
    createAutomation,
    updateAutomation,
    deleteAutomation,
    toggleAutomation,
    duplicateAutomation,
    runAutomation,
    refreshWorkflowStatuses
  } = useSpreadsheetAutomations({
    spreadsheetId: app.id,
    sheetId: activeSheetId,
    accessToken,
    currentUserId: userId || '',
    initialAutomations: currentSheetData?.automations || [],
    initialWorkflowLinks: currentSheetData?.workflowLinks || [],
    onAutomationsChange: handleAutomationsChange,
    onWorkflowLinksChange: handleWorkflowLinksChange,
    onAddRows: rows => handleAddRowsRef.current?.(rows),
    onUpdateRows: updates => handleUpdateRowsRef.current?.(updates)
  })

  // Prevent duplicate backing-row creation for entity-data-source rows (non-UUID row ids)
  const pendingBackingRowCreateRef = React.useRef<Set<string>>(new Set())

  // Ref for FortuneSheetGrid to call imperative methods (remote cell updates)
  const fortuneSheetGridRef = React.useRef<FortuneSheetGridHandle | null>(null)
  // Ref to avoid TDZ when auto-adding columns
  const handleCellChangeRef = React.useRef<(rowId: string, columnName: string, value: unknown) => void>(() => {})

  // Ref to track active sheet (avoid re-creating callbacks)
  const activeSheetIdRef = useRef(activeSheetId)
  useEffect(() => {
    activeSheetIdRef.current = activeSheetId
  }, [activeSheetId])

  // Ref to store column update callback from parent
  const onAppUpdateRef = useRef(_onAppUpdate)
  useEffect(() => {
    onAppUpdateRef.current = _onAppUpdate
  }, [_onAppUpdate])

  // Keep latest app in a ref for stable callbacks
  const appRef = useRef(app)
  useEffect(() => {
    appRef.current = app
  }, [app])

  const updateAppForSheet = useCallback((sheetId: string, update: (sheet: SpreadsheetSheet) => SpreadsheetSheet) => {
    const onAppUpdate = onAppUpdateRef.current
    if (!onAppUpdate) return

    const currentApp = appRef.current
    const targetSheet = currentApp.sheets.find(s => s.id === sheetId)
    if (!targetSheet) return

    const updatedSheets = currentApp.sheets.map(sheet => (sheet.id === sheetId ? update(sheet) : sheet))
    onAppUpdate({ ...currentApp, sheets: updatedSheets })
  }, [])

  const handleRemoteCellUpdate = useCallback(
    (params: {
      sheetId: string
      rowId?: string
      rowIndex?: number
      columnIndex?: number
      column: string
      value: unknown
      isActiveSheet: boolean
    }) => {
      if (params.isActiveSheet) {
        // 1) Update FortuneSheet directly via its API (no re-render)
        const currentApp = appRef.current
        const targetSheet = currentApp?.sheets.find(s => s.id === params.sheetId)
        if (targetSheet && fortuneSheetGridRef.current) {
          // Find rowIndex if we have rowId
          let rowIdx = params.rowIndex
          if (rowIdx === undefined && params.rowId) {
            rowIdx = localSheetDataRef.current.findIndex(row => row._id === params.rowId)
          }

          // Find columnIndex if we have column name
          let colIdx = params.columnIndex
          if (colIdx === undefined) {
            colIdx = targetSheet.columns.findIndex(col => col.name === params.column || col.id === params.column)
          }

          if (rowIdx !== undefined && rowIdx >= 0 && colIdx !== undefined && colIdx >= 0) {
            fortuneSheetGridRef.current.applyRemoteCellUpdate(rowIdx, colIdx, params.value)
          }
        }

        // 2) Update local state for persistence (but FortuneSheet already updated)
        setLocalSheetData(prev => {
          let updated = false
          const next = prev.map((row, idx) => {
            if (params.rowId && row._id === params.rowId) {
              updated = true
              return { ...row, [params.column]: params.value }
            }
            if (!updated && typeof params.rowIndex === 'number' && idx === params.rowIndex) {
              updated = true
              return { ...row, [params.column]: params.value }
            }
            return row
          })

          return updated ? next : prev
        })
        return
      }

      updateAppForSheet(params.sheetId, sheet => {
        let updated = false
        const updatedData = (sheet.data || []).map((row: Record<string, unknown>) => {
          if (params.rowId && row._id === params.rowId) {
            updated = true
            return { ...row, [params.column]: params.value }
          }
          return row
        })

        if (!updated && typeof params.rowIndex === 'number' && updatedData[params.rowIndex]) {
          updatedData[params.rowIndex] = {
            ...(updatedData[params.rowIndex] as Record<string, unknown>),
            [params.column]: params.value
          }
        }

        return { ...sheet, data: updatedData }
      })
    },
    [updateAppForSheet]
  )

  const handleRemoteRowAdd = useCallback(
    (params: { sheetId: string; rowData: Record<string, unknown>; isActiveSheet: boolean }) => {
      if (params.isActiveSheet) {
        setLocalSheetData(prev => {
          const exists = prev.some(row => row._id === params.rowData._id)
          return exists ? prev : [...prev, params.rowData]
        })
        return
      }

      updateAppForSheet(params.sheetId, sheet => {
        const existingData = sheet.data || []
        const exists = existingData.some((row: Record<string, unknown>) => row._id === params.rowData._id)
        return exists ? sheet : { ...sheet, data: [...existingData, params.rowData] }
      })
    },
    [updateAppForSheet]
  )

  const handleRemoteRowDelete = useCallback(
    (params: { sheetId: string; rowId: string; isActiveSheet: boolean }) => {
      if (params.isActiveSheet) {
        setLocalSheetData(prev => prev.filter(row => row._id !== params.rowId))
        return
      }

      updateAppForSheet(params.sheetId, sheet => {
        const updatedData = (sheet.data || []).filter((row: Record<string, unknown>) => row._id !== params.rowId)
        return { ...sheet, data: updatedData }
      })
    },
    [updateAppForSheet]
  )

  const handleRemoteColumnAdd = useCallback(
    (params: { sheetId: string; column: SpreadsheetColumn; isActiveSheet: boolean }) => {
      updateAppForSheet(params.sheetId, sheet => ({
        ...sheet,
        columns: [...sheet.columns, params.column],
        data: params.isActiveSheet ? localSheetDataRef.current : sheet.data
      }))
    },
    [updateAppForSheet]
  )

  const handleRemoteColumnUpdate = useCallback(
    (params: {
      sheetId: string
      columns?: SpreadsheetColumn[]
      columnId?: string
      columnPatch?: Partial<SpreadsheetColumn>
      isActiveSheet: boolean
    }) => {
      updateAppForSheet(params.sheetId, sheet => {
        let updatedColumns: SpreadsheetColumn[]
        if (params.columnId && params.columnPatch) {
          updatedColumns = sheet.columns.map(col =>
            col.id === params.columnId ? { ...col, ...params.columnPatch } : col
          )
        } else if (params.columns) {
          updatedColumns = params.columns
        } else {
          return sheet
        }

        return {
          ...sheet,
          columns: updatedColumns,
          data: params.isActiveSheet ? localSheetDataRef.current : sheet.data
        }
      })
    },
    [updateAppForSheet]
  )

  const handleRemoteColumnDelete = useCallback(
    (params: { sheetId: string; columnId: string; isActiveSheet: boolean }) => {
      updateAppForSheet(params.sheetId, sheet => ({
        ...sheet,
        columns: sheet.columns.filter(col => col.id !== params.columnId),
        data: params.isActiveSheet ? localSheetDataRef.current : sheet.data
      }))
    },
    [updateAppForSheet]
  )

  // Collaboration callbacks (stable references - no dependencies)
  const onOperationReceivedCallback = useCallback((operation: any) => {
    // Skip if this is our own operation (we already applied it optimistically)
    if (operation?.userId === currentUserIdRef.current) return

    const op = operation?.operation
    const type: string | undefined = op?.type
    const data: any = op?.data
    const sheetId: string | undefined = data?.sheetId
    if (!type || !sheetId) return

    const isActiveSheet = sheetId === activeSheetIdRef.current

    switch (type) {
      case 'cell_update':
        handleRemoteCellUpdate({
          sheetId,
          rowId: data.rowId,
          column: data.column,
          value: data.value && typeof data.value === 'object' && 'v' in data.value ? data.value.v : data.value,
          rowIndex: data.rowIndex,
          isActiveSheet
        })
        return
      case 'cell_change': {
        const rowId = data?.rowId
        const columnId = data?.columnId ?? data?.column
        if (!rowId || !columnId) return

        const currentApp = appRef.current
        const targetSheet = currentApp?.sheets.find(sheet => sheet.id === sheetId)
        const columnName = targetSheet?.columns.find(col => col.id === columnId)?.name || columnId
        const value = data.value && typeof data.value === 'object' && 'v' in data.value ? data.value.v : data.value

        handleRemoteCellUpdate({
          sheetId,
          rowId,
          rowIndex: data?.rowIndex,
          column: columnName,
          value,
          isActiveSheet
        })
        return
      }
      case 'row_add':
        handleRemoteRowAdd({ sheetId, rowData: data.rowData, isActiveSheet })
        return
      case 'row_delete':
        handleRemoteRowDelete({ sheetId, rowId: data.rowId, isActiveSheet })
        return
      case 'column_add':
        handleRemoteColumnAdd({ sheetId, column: data.column, isActiveSheet })
        return
      case 'column_update':
        handleRemoteColumnUpdate({
          sheetId,
          columns: data.columns,
          columnId: data.columnId,
          columnPatch: data.columnPatch,
          isActiveSheet
        })
        return
      case 'column_delete':
        handleRemoteColumnDelete({ sheetId, columnId: data.columnId, isActiveSheet })
        return
      default:
        return
    }
  }, []) // No dependencies - completely stable

  // Collaboration state with enriched participants
  const {
    headerParticipants,
    cursorParticipants,
    currentUserName,
    currentUserAvatar,
    currentUserIdRef,
    isCollaborationConnected,
    emitOperation,
    emitCursor
  } = useSpreadsheetViewerCollaboration({
    appId: app.id,
    accessToken,
    onOperationReceived: onOperationReceivedCallback
  })

  // Cell selection state
  const { selectedCell, setSelectedCell, selectedCellRef, emitCursorImmediate } = useSpreadsheetCellSelection({
    activeSheetId,
    isCollaborationConnected,
    emitCursor
  })

  // Formula editing state
  const {
    formulaSelectionMode,
    setFormulaSelectionMode,
    formulaSelectionModeRef,
    formulaSelectedCells,
    setFormulaSelectedCells,
    currentFormulaValueRef,
    formulaBarInputRef,
    setCurrentFormulaDisplay
  } = useSpreadsheetFormulas({
    selectedCellRowId: selectedCell?.rowId,
    selectedCellColId: selectedCell?.colId
  })

  // Refs for frequently-changing values (to avoid column re-creation)
  const formulaSelectedCellsRef = useRef(formulaSelectedCells)
  formulaSelectedCellsRef.current = formulaSelectedCells

  const cursorParticipantsRef = useRef(cursorParticipants)
  cursorParticipantsRef.current = cursorParticipants

  // Column management state and handlers
  const {
    isManageColumnsDialogOpen,
    setIsManageColumnsDialogOpen,
    editingColumns,
    setEditingColumns,
    setEditingColumnId,
    setEditingColumnLabel,
    editingColumnIdRef,
    editingColumnLabelRef,
    handleAddColumn,
    handleAutoColumnAdd,
    handleDeleteColumn,
    handleAddColumnRef,
    handleRenameColumnRef,
    handleReorderColumnsRef,
    columnIndexToLetter
  } = useSpreadsheetColumns({
    app,
    activeSheet,
    localSheetDataRef,
    handleCellChangeRef,
    onAppUpdate: _onAppUpdate,
    onSheetUpdate,
    isCollaborationConnected,
    emitOperation
  })

  // Row management state and handlers
  const {
    editingRow,
    setEditingRow,
    filteredDataRef,
    handleAddRow,
    handleUpdateRow,
    handleDeleteRow,
    handleFortuneSheetDataChange
  } = useSpreadsheetRows({
    app,
    activeSheet,
    localSheetData,
    setLocalSheetData,
    onDataChange,
    isCollaborationConnected,
    emitOperation
  })

  // Cleanup: cancel any pending save on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  /**
   * Evaluate formulas for a row
   */
  const evaluateRowFormulas = useCallback(
    (row: Record<string, unknown>, rowIndex: number, allData: Record<string, unknown>[]): Record<string, unknown> => {
      if (!activeSheet) return row

      // IMPORTANT:
      // Excel-like references (A1, B2, ...) must match the SAME column ordering used by the table.
      // The table sorts visible columns (tracking first, then by `order`) and also prepends a row-number column.
      // Formula references should NOT count the row-number column, so we build the context using the same
      // sorted visible spreadsheet columns only.
      const columnsForFormulaIndex = activeSheet.columns
        .filter(col => col.isVisible)
        .sort((a, b) => {
          const aIsTracking = a.isTracking || isTrackingColumn(a.name)
          const bIsTracking = b.isTracking || isTrackingColumn(b.name)
          if (aIsTracking && !bIsTracking) return -1
          if (!aIsTracking && bIsTracking) return 1
          return a.order - b.order
        })

      const context: FormulaContext = {
        row,
        allRows: allData,
        columns: columnsForFormulaIndex.map(col => ({ name: col.name, id: col.id })),
        currentRowIndex: rowIndex
      }

      const updatedRow = { ...row }

      // Evaluate calculated columns
      for (const col of activeSheet.columns) {
        if (col.type === 'calculated' && col.formula) {
          try {
            const result = evaluateFormula(col.formula, context)
            updatedRow[col.name] = result
          } catch (error) {
            console.error(`Error evaluating formula for column ${col.name}:`, error)
            updatedRow[col.name] = '#ERROR!'
          }
        }
      }

      // Evaluate cell formulas (check both direct value and _formulas object)
      for (const col of activeSheet.columns) {
        // Try to get cell value by column name first, then by column ID
        const cellValue = updatedRow[col.name] ?? updatedRow[col.id]
        const formulas = updatedRow._formulas as Record<string, string> | undefined
        const formula = formulas?.[col.name] ?? formulas?.[col.id] ?? cellValue

        if (isFormula(formula)) {
          try {
            const result = evaluateFormula(formula as string, context)
            // Store the result but keep the formula in _formulas
            updatedRow[col.name] = result
            const formulasObj = (updatedRow._formulas as Record<string, string>) || {}
            formulasObj[col.name] = formula as string
            updatedRow._formulas = formulasObj
          } catch (error) {
            console.error(`Error evaluating formula in cell ${col.name}:`, error)
            updatedRow[col.name] = '#ERROR!'
            const formulasObj = (updatedRow._formulas as Record<string, string>) || {}
            formulasObj[col.name] = formula as string
            updatedRow._formulas = formulasObj
          }
        }
      }

      return updatedRow
    },
    [activeSheet]
  )

  /**
   * Recalculate all formulas in all rows
   */
  const recalculateAllFormulas = useCallback(
    (data: Record<string, unknown>[]): Record<string, unknown>[] => {
      return data.map((row, index) => evaluateRowFormulas(row, index, data))
    },
    [evaluateRowFormulas]
  )

  /**
   * Load entity data when sheet has a data source configured
   */
  const loadSheetEntityData = useCallback(async () => {
    if (!activeSheet?.entityDataSource?.enabled) {
      setEntityData([])
      setEntityDataError(null)
      return
    }

    setIsEntityDataLoading(true)
    setEntityDataError(null)

    try {
      const result = await loadEntityData(activeSheet.entityDataSource)

      if (result && result.records.length > 0) {
        // Get field mappings (or use all fields if none specified)
        const fieldMappings = activeSheet.entityDataSource.fieldMappings || []
        const includedFields = fieldMappings.filter(m => m.include)

        // Map entity records to spreadsheet format
        const mappedData = result.records.map((record, index) => {
          const mappedRow: Record<string, unknown> = {
            _id: (record.id as string) || `entity_${index}`,
            _entityType: result.entityType,
            _fetchedAt: result.fetchedAt
          }

          // If we have field mappings, use them to map entity fields to column names
          // Otherwise, just spread all entity fields
          if (includedFields.length > 0) {
            for (const mapping of includedFields) {
              // Get value from nested path (e.g., "ownerEmployee.displayName")
              const value = getNestedValue(record, mapping.entityField)
              // Use the entity field name as the key (columns will match on name)
              mappedRow[mapping.entityField] = value
              // Also map to the display label for easier matching
              mappedRow[mapping.entityFieldLabel] = value
            }
          } else {
            // No mappings - just spread all record fields
            Object.assign(mappedRow, record)
          }

          return mappedRow
        })

        setEntityData(mappedData)
      } else {
        setEntityData([])
      }
    } catch (error) {
      console.error('[SpreadsheetViewer] Failed to load entity data:', error)
      setEntityDataError(error instanceof Error ? error.message : 'Failed to load entity data')
    } finally {
      setIsEntityDataLoading(false)
    }
  }, [activeSheet?.entityDataSource, loadEntityData])

  /**
   * Effect to load entity data when sheet changes or on mount
   */
  useEffect(() => {
    if (activeSheet?.entityDataSource?.enabled) {
      // Load based on refresh mode
      const { refreshMode } = activeSheet.entityDataSource
      if (refreshMode === 'onOpen' || refreshMode === 'manual') {
        loadSheetEntityData()
      }
    } else {
      // Clear entity data if data source is disabled
      setEntityData([])
    }
  }, [
    activeSheetId,
    activeSheet?.entityDataSource?.enabled,
    activeSheet?.entityDataSource?.refreshMode,
    loadSheetEntityData
  ])

  /**
   * Manual refresh function
   */
  const handleRefreshEntityData = useCallback(() => {
    loadSheetEntityData()
  }, [loadSheetEntityData])

  /**
   * Handle version restore
   */
  const handleRestoreVersion = useCallback(
    async (versionNumber: number) => {
      const versionData = await SpreadsheetApiService.getVersion(app.id, versionNumber)
      if (!versionData) {
        console.error('[SpreadsheetAppViewer] Failed to get version data')
        return
      }
      const success = await versioning.restoreVersion(versionNumber)
      if (success) {
        await versioning.loadVersions()
        setShowVersionHistory(false)
        setTimeout(() => window.location.reload(), 500)
      } else {
        alert('Failed to restore version. Check console for details.')
      }
    },
    [app.id, versioning]
  )

  /**
   * Determine which data to use - entity data or static sheet data
   * When entity data source is enabled, merge entity data with custom column data from sheet.data
   * Uses localSheetData for immediate UI updates (pending changes not yet saved)
   */
  const sourceData = useMemo(() => {
    if (activeSheet?.entityDataSource?.enabled && entityData.length > 0) {
      // Create a map of custom column data from localSheetData (keyed by _id)
      const customDataMap = new Map<string, Record<string, unknown>>()
      localSheetData.forEach(row => {
        if (row._id) {
          customDataMap.set(row._id as string, row)
        }
      })

      // Merge entity data with custom column data
      return entityData.map(entityRow => {
        const entityId = (entityRow._id || entityRow.id) as string
        const customData = customDataMap.get(entityId) || {}

        // Merge: entity data first, then custom column data (custom overrides entity)
        return {
          ...entityRow,
          ...customData,
          _id: entityId // Ensure _id is preserved
        }
      })
    }
    return localSheetData
  }, [activeSheet?.entityDataSource?.enabled, localSheetData, entityData])

  // Evaluate formulas for all data
  const filteredData = useMemo(() => {
    if (!activeSheet) return []

    // Recalculate all formulas
    return recalculateAllFormulas(sourceData)
  }, [activeSheet, sourceData, recalculateAllFormulas])

  // Keep filteredDataRef synchronized with filteredData
  useEffect(() => {
    filteredDataRef.current = filteredData
  }, [filteredData, filteredDataRef])

  /**
   * Handle cell selection for formula input
   */
  const handleFormulaCellSelect = useCallback(
    (rowIndex: number, colIndex: number, isRangeEnd: boolean = false) => {
      const mode = formulaSelectionModeRef.current
      if (!mode || !activeSheet) return

      // Get Excel-style reference (A1, B2, etc.)
      const colLetter = columnIndexToLetter(colIndex)
      const rowNum = rowIndex + 1 // Convert to 1-based
      const cellRef = `${colLetter}${rowNum}`

      // Track selected cells for highlighting
      if (isRangeEnd && mode.startCell) {
        const rangeCells = buildRangeCells({ start: mode.startCell, end: { rowIndex, colIndex } })
        setFormulaSelectedCells(prev => [
          ...prev.filter(c => !(c.rowIndex === mode.startCell!.rowIndex && c.colIndex === mode.startCell!.colIndex)),
          ...rangeCells
        ])
        setFormulaSelectionMode({ ...mode, endCell: { rowIndex, colIndex }, isRangeSelection: true })
      } else {
        setFormulaSelectedCells(prev => [...prev, { rowIndex, colIndex }])
        setFormulaSelectionMode({ ...mode, startCell: { rowIndex, colIndex }, endCell: null, isRangeSelection: false })
      }

      // Get current formula from ref or input
      const activeCellElement = document.querySelector(
        `[data-cell-rowid="${mode.editingCell.rowId}"][data-cell-colid="${mode.editingCell.colId}"] input`
      ) as HTMLInputElement | null

      const currentFormula = activeCellElement?.value?.trim() || currentFormulaValueRef.current?.trim() || '='

      // Build new formula string
      let newFormula = currentFormula
      if (isRangeEnd && mode.startCell) {
        const startColLetter = columnIndexToLetter(mode.startCell.colIndex)
        const startRowNum = mode.startCell.rowIndex + 1
        const startRef = `${startColLetter}${startRowNum}`
        const rangeRef = `${startRef}:${cellRef}`

        // If the formula currently ends with the startRef, replace it with the rangeRef (Excel-like)
        if (newFormula.trim().endsWith(startRef)) {
          newFormula = `${newFormula.trim().slice(0, -startRef.length)}${rangeRef}`
        } else {
          newFormula = appendCellRef(newFormula, rangeRef)
        }
      } else {
        newFormula = appendCellRef(newFormula, cellRef)
      }

      // Always update the ref and state so we can save later and display properly
      currentFormulaValueRef.current = newFormula
      setCurrentFormulaDisplay(newFormula)

      // Update input if it exists
      if (activeCellElement) {
        activeCellElement.value = newFormula
        activeCellElement.dispatchEvent(new Event('input', { bubbles: true }))
      }

      // Keep typing in the formula bar (Excel-like). Clicking cells to insert references should not steal focus.
      requestAnimationFrame(() => {
        const input = formulaBarInputRef.current
        if (!input) return
        input.focus()
        input.setSelectionRange(newFormula.length, newFormula.length)
      })
    },
    [activeSheet, columnIndexToLetter, setFormulaSelectionMode]
  )

  /**
   * Handle inline cell change (Excel-like editing)
   * When entity data source is enabled, save custom column data separately in activeSheet.data
   * Uses localSheetDataRef to access current data without causing callback recreation
   */
  const handleCellChange = useCallback(
    (rowId: string, columnName: string, value: unknown) => {
      const currentActiveSheet = activeSheet
      if (!currentActiveSheet) return

      // Check if the value is a formula
      const isFormulaValue = typeof value === 'string' && value.trim().startsWith('=')

      // Check if we're using entity data source (use current values via closure)
      const currentEntityDataLength = entityData.length
      const isEntityDataSource = !!(currentActiveSheet.entityDataSource?.enabled && currentEntityDataLength > 0)

      // Use ref for localSheetData to avoid dependency on rapidly changing state
      const currentLocalSheetData = localSheetDataRef.current

      const { nextData, localRow } = computeNextLocalSheetData({
        localSheetData: currentLocalSheetData,
        rowId,
        columnName,
        value,
        isFormulaValue,
        isEntityDataSource
      })

      // Recalculate all formulas (in case this cell is referenced by others)
      const newData = recalculateAllFormulas(nextData)

      // Update ref immediately to avoid stale data in rapid edits
      localSheetDataRef.current = newData

      // Update local state for UI
      setLocalSheetData(newData)

      persistCellChangeToBackend({
        appId: app.id,
        sheetId: currentActiveSheet.id,
        rowId,
        columnName,
        value,
        localRow,
        pendingBackingRowCreate: pendingBackingRowCreateRef.current,
        setLocalSheetData
      })

      // Also emit collaboration operation for real-time sync to other clients (uses UI row id)
      if (isCollaborationConnected) {
        emitOperation({
          type: 'cell_update',
          data: {
            sheetId: currentActiveSheet.id,
            rowId,
            column: columnName,
            value
          }
        })
      }
    },
    [activeSheet, entityData.length, app.id, recalculateAllFormulas, isCollaborationConnected, emitOperation]
  )

  useEffect(() => {
    handleCellChangeRef.current = handleCellChange
  }, [handleCellChange])

  // Global keyboard handler for formula mode (Enter/Escape to finish/cancel)
  useEffect(() => {
    if (!formulaSelectionMode) return

    const handleFormulaKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()

        // Use the stored formula value from the ref
        let formulaValue = currentFormulaValueRef.current

        if (formulaValue) {
          // Auto-close parentheses if needed
          const openParens = (formulaValue.match(/\(/g) || []).length
          const closeParens = (formulaValue.match(/\)/g) || []).length
          if (openParens > closeParens) {
            formulaValue += ')'.repeat(openParens - closeParens)
          }

          const column = activeSheet?.columns.find(c => c.id === formulaSelectionMode.editingCell.colId)

          if (column) {
            handleCellChange(formulaSelectionMode.editingCell.rowId, column.name, formulaValue)
          }
        }

        currentFormulaValueRef.current = ''
        setCurrentFormulaDisplay(null)
        setFormulaSelectionMode(null)
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        currentFormulaValueRef.current = ''
        setCurrentFormulaDisplay(null)
        setFormulaSelectionMode(null)
      }
    }

    document.addEventListener('keydown', handleFormulaKeyDown, true)
    return () => document.removeEventListener('keydown', handleFormulaKeyDown, true)
  }, [formulaSelectionMode, activeSheet, handleCellChange])

  // Track if any cell is currently editing (to prevent global key handler interference)
  const isEditingRef = React.useRef(false)

  // Global keyboard handler for selected cell (Excel-like behavior)
  useEffect(() => {
    if (!selectedCell) return

    const handleGlobalKeyDown = createSpreadsheetGlobalKeyDownHandler({
      selectedCell: selectedCell as GlobalSelectedCell,
      activeSheetColumns: activeSheet?.columns || [],
      activeSheetAllowEdit: Boolean(activeSheet?.settings.allowEdit),
      isEditingEnabled: Boolean(isEditing),
      isEditingCell: isEditingRef.current,
      isFormulaSelectionMode: Boolean(formulaSelectionMode),
      filteredData,
      handleCellChange,
      emitCursorImmediate,
      setSelectedCell
    })

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [selectedCell, activeSheet, filteredData, formulaSelectionMode, handleCellChange, emitCursorImmediate])

  /**
   * Convert columns to form fields
   */
  const formFields: DynamicFormField[] = useMemo(() => {
    if (!activeSheet) return []

    return activeSheet.columns
      .filter(col => col.isVisible && col.isEditable)
      .map((col, index) => ({
        name: col.name,
        label: col.label,
        type: mapColumnTypeToFormType(col.type),
        required: col.isRequired,
        placeholder: `Enter ${col.label.toLowerCase()}`,
        order: index,
        options: col.selectOptions?.map(opt => ({
          value: opt.value,
          label: opt.label
        })),
        validation: col.validation
          ? [
              ...(col.validation.required ? [{ type: 'required' as const, message: `${col.label} is required` }] : []),
              ...(col.validation.min !== undefined ? [{ type: 'min' as const, value: col.validation.min }] : []),
              ...(col.validation.max !== undefined ? [{ type: 'max' as const, value: col.validation.max }] : [])
            ]
          : undefined
      }))
  }, [activeSheet])

  /**
   * Compute visible columns (sorted: tracking columns first, then regular columns by order)
   * Used by both tableColumns and FortuneSheetGrid
   */
  const visibleColumns = useMemo(() => {
    if (!activeSheet) return []

    return activeSheet.columns
      .filter(col => col.isVisible)
      .sort((a, b) => {
        // Determine if columns are tracking (either by flag or by name pattern)
        const aIsTracking = a.isTracking || isTrackingColumn(a.name)
        const bIsTracking = b.isTracking || isTrackingColumn(b.name)
        // Tracking columns come first
        if (aIsTracking && !bIsTracking) return -1
        if (!aIsTracking && bIsTracking) return 1
        // Then sort by order
        return a.order - b.order
      })
  }, [activeSheet])

  // Table columns generated via hook
  const tableColumns = useSpreadsheetTableColumns({
    activeSheet,
    visibleColumns,
    filteredData,
    isEditing,
    canEdit: !!_onAppUpdate,
    handleCellChange,
    handleDeleteRow,
    handleFormulaCellSelect,
    formulaSelectionModeRef,
    setFormulaSelectionMode,
    formulaSelectedCellsRef,
    currentFormulaValueRef,
    setCurrentFormulaDisplay,
    selectedCellRef,
    setSelectedCell,
    cursorParticipantsRef,
    emitCursorImmediate,
    editingColumnIdRef,
    editingColumnLabelRef,
    setEditingColumnId,
    setEditingColumnLabel,
    handleRenameColumnRef,
    handleDeleteColumn,
    handleReorderColumnsRef,
    handleAddColumnRef,
    isEditingRef,
    accessToken
  })

  // ============================================================
  // MEMOIZED PROPS - Prevent re-renders from inline object/function creation
  // ============================================================

  // Memoized versioning props for SpreadsheetHeader
  const versioningHeaderProps = useMemo(
    () => ({
      isSaving: versioning.isSaving,
      lastSaveTime: versioning.lastSaveTime,
      hasUnsavedChanges: versioning.hasUnsavedChanges
    }),
    [versioning.isSaving, versioning.lastSaveTime, versioning.hasUnsavedChanges]
  )

  // Memoized file lock props for SpreadsheetHeader
  const fileLockHeaderProps = useMemo(
    () => ({
      lock: fileLock.lock,
      isLockedByMe: fileLock.isLockedByMe,
      acquireLock: fileLock.acquireLock,
      releaseLock: fileLock.releaseLock
    }),
    [fileLock.lock, fileLock.isLockedByMe, fileLock.acquireLock, fileLock.releaseLock]
  )

  // Memoized callbacks for SpreadsheetHeader
  const handleShowCheckpointDialog = useCallback(() => setShowCheckpointDialog(true), [])
  const handleShowVersionHistory = useCallback(() => setShowVersionHistory(true), [])
  const handleShowPublishDialog = useCallback(() => setShowPublishDialog(true), [])
  const handleOpenAutomations = useCallback(() => setIsAutomationsOpen(true), [])
  const handleCloseAutomations = useCallback(() => setIsAutomationsOpen(false), [])
  const handleOpenManageColumns = useCallback(() => setIsManageColumnsDialogOpen(true), [])

  // Memoized cursor emit callback for TableView
  const handleCursorEmit = useCallback((position: { path: string[] }) => emitCursor(position), [emitCursor])

  // Memoized callbacks for AutomationsPanel
  const handleCreateAutomation = useCallback(
    async (automation: Omit<SpreadsheetAutomation, 'id' | 'createdAt' | 'updatedAt' | 'runCount'>) => {
      await createAutomation(automation)
    },
    [createAutomation]
  )

  const handleUpdateAutomationCallback = useCallback(
    async (id: string, automation: Partial<SpreadsheetAutomation>) => {
      await updateAutomation(id, automation)
    },
    [updateAutomation]
  )

  const handleDeleteAutomationCallback = useCallback(
    async (id: string) => {
      await deleteAutomation(id)
    },
    [deleteAutomation]
  )

  const handleToggleAutomationCallback = useCallback(
    async (id: string, enabled: boolean) => {
      await toggleAutomation(id, enabled)
    },
    [toggleAutomation]
  )

  const handleDuplicateAutomationCallback = useCallback(
    async (id: string) => {
      await duplicateAutomation(id)
    },
    [duplicateAutomation]
  )

  const handleRunAutomationCallback = useCallback(
    async (id: string, rows?: Array<{ id: string; cells: Record<string, unknown> }>) => {
      await runAutomation(id, rows)
    },
    [runAutomation]
  )

  // Memoized onSaveColumns callback for SpreadsheetDialogsSection
  const handleSaveColumns = useCallback(
    (finalColumns: SpreadsheetColumn[]) => {
      const updatedSheets = app.sheets.map(sheet =>
        sheet.id === activeSheet?.id ? { ...sheet, data: localSheetDataRef.current, columns: finalColumns } : sheet
      )
      _onAppUpdate?.({ ...app, sheets: updatedSheets })
      if (isCollaborationConnected) {
        emitOperation({ type: 'column_update', data: { sheetId: activeSheet?.id, columns: finalColumns } })
      }
    },
    [app, activeSheet?.id, _onAppUpdate, isCollaborationConnected, emitOperation]
  )

  if (!activeSheet) {
    return (
      <Card className="gba:p-8 gba:text-center">
        <p className="gba:text-muted-foreground">No sheets available</p>
      </Card>
    )
  }

  return (
    <div
      className="gba:flex gba:flex-col gba:h-full gba:min-w-0"
      style={{ width: '100%', maxWidth: '100vw', overflow: 'hidden' }}
      data-testid={testId}
    >
      {/* Modern Header */}
      <div className="gba:flex-shrink-0 gba:min-w-0 gba:w-full gba:overflow-hidden gba:bg-gradient-to-r gba:from-background gba:to-muted/30">
        <SpreadsheetHeader
          app={app}
          activeSheet={activeSheet}
          onBack={onBack}
          isEditing={isEditing}
          canEdit={!!_onAppUpdate}
          headerParticipants={headerParticipants}
          isCollaborationConnected={isCollaborationConnected}
          isEntityDataLoading={isEntityDataLoading}
          onRefreshEntityData={handleRefreshEntityData}
          versioning={versioningHeaderProps}
          onShowCheckpointDialog={handleShowCheckpointDialog}
          onShowVersionHistory={handleShowVersionHistory}
          publishingStatus={publishing.metadata?.status || 'draft'}
          showComments={showComments}
          setShowComments={setShowComments}
          unresolvedCommentCount={comments.unresolvedCount}
          fileLock={fileLockHeaderProps}
          onShowPublishDialog={handleShowPublishDialog}
          onAddColumn={handleAddColumn}
          onManageColumns={handleOpenManageColumns}
          onOpenAutomations={handleOpenAutomations}
          onEdit={onEdit}
          testId={testId}
        />

        {/* Automations Panel */}
        <AutomationsPanel
          isOpen={isAutomationsOpen}
          onClose={handleCloseAutomations}
          automations={automations}
          executionHistory={executionHistory}
          workflowLinks={workflowLinks}
          isLoading={isAutomationsLoading}
          columns={activeSheet.columns}
          sheetData={activeSheet.data}
          spreadsheetId={app.id}
          sheetId={activeSheetId}
          accessToken={accessToken}
          onCreateAutomation={handleCreateAutomation}
          onUpdateAutomation={handleUpdateAutomationCallback}
          onDeleteAutomation={handleDeleteAutomationCallback}
          onToggleAutomation={handleToggleAutomationCallback}
          onDuplicateAutomation={handleDuplicateAutomationCallback}
          onRunAutomation={handleRunAutomationCallback}
          onRefreshWorkflowStatuses={refreshWorkflowStatuses}
          data-testid={`${testId}-automations-panel`}
        />

        {/* Sheet tabs */}
        <SpreadsheetSheetTabs
          sheets={app.sheets}
          activeSheetId={activeSheetId}
          onSheetChange={setActiveSheetId}
          entityDataLength={activeSheet?.entityDataSource?.enabled ? entityData.length : undefined}
          data-testid={`${testId}-sheet-tabs`}
        />
      </div>

      {/* Entity data status bar */}
      {activeSheet?.entityDataSource?.enabled && (
        <EntityDataStatusBar
          isLoading={isEntityDataLoading}
          error={entityDataError}
          dataCount={entityData.length}
          dataSourceName={activeSheet.entityDataSource.entityDisplayName}
          onRefresh={handleRefreshEntityData}
          onEdit={onEdit}
          data-testid={`${testId}-entity-status`}
        />
      )}

      {/* Content */}
      <div className="gba:flex-1 gba:flex gba:flex-col gba:min-w-0 gba:min-h-0 gba:overflow-hidden gba:relative">
        {activeView?.type === 'table' ? (
          <div className="gba:flex-1 gba:min-w-0 gba:min-h-0 gba:overflow-hidden gba:absolute gba:inset-0">
            <TableView
              sheet={activeSheet}
              data={filteredData}
              columns={tableColumns}
              spreadsheetColumns={visibleColumns}
              testId={`${testId}-table`}
              onAddRow={activeSheet.settings.allowAdd ? handleAddRow : undefined}
              showAddRow={false}
              onCellChange={handleCellChange}
              onColumnAdd={handleAutoColumnAdd}
              onDataChange={handleFortuneSheetDataChange}
              participants={cursorParticipants}
              onOperationEmit={emitOperation}
              onCursorEmit={handleCursorEmit}
              collaborationEnabled={isCollaborationConnected}
              isReadOnly={!isEditing || (!!fileLock.lock?.isLocked && !fileLock.isLockedByMe)}
              gridRef={fortuneSheetGridRef}
            />
          </div>
        ) : (
          <div className="gba:flex-1 gba:overflow-auto gba:p-6">
            {activeView?.type === 'form' && (
              <FormView
                sheet={activeSheet}
                data={filteredData}
                onEdit={setEditingRow}
                onDelete={handleDeleteRow}
                testId={`${testId}-form`}
              />
            )}

            {activeView?.type === 'dashboard' && (
              <DashboardView sheet={activeSheet} data={filteredData} testId={`${testId}-dashboard`} />
            )}

            {activeView?.type === 'kanban' && (
              <KanbanView
                sheet={activeSheet}
                data={filteredData}
                view={activeView}
                onEdit={setEditingRow}
                testId={`${testId}-kanban`}
              />
            )}
          </div>
        )}
      </div>

      {/* All Dialogs */}
      <SpreadsheetDialogsSection
        editingRow={editingRow}
        setEditingRow={setEditingRow}
        formFields={formFields}
        handleUpdateRow={handleUpdateRow}
        accessToken={accessToken}
        isManageColumnsDialogOpen={isManageColumnsDialogOpen}
        setIsManageColumnsDialogOpen={setIsManageColumnsDialogOpen}
        columns={activeSheet.columns}
        editingColumns={editingColumns}
        setEditingColumns={setEditingColumns}
        handleAddColumn={handleAddColumn}
        onSaveColumns={handleSaveColumns}
        showVersionHistory={showVersionHistory}
        setShowVersionHistory={setShowVersionHistory}
        versioning={versioning}
        handleRestoreVersion={handleRestoreVersion}
        showCheckpointDialog={showCheckpointDialog}
        setShowCheckpointDialog={setShowCheckpointDialog}
        showPublishDialog={showPublishDialog}
        setShowPublishDialog={setShowPublishDialog}
        publishing={publishing}
        showComments={showComments}
        setShowComments={setShowComments}
        comments={comments as SpreadsheetDialogsSectionProps['comments']}
        currentUserId={userId}
        currentUserName={currentUserName}
        currentUserAvatar={currentUserAvatar}
        testId={testId}
      />
    </div>
  )
}
