/**
 * SpreadsheetAppViewer Component
 *
 * The main runtime viewer for generated spreadsheet apps.
 * Renders table, form, dashboard, and kanban views based on configuration.
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { ColumnDef, Row } from '@tanstack/react-table'
import {
  Card,
  Button,
  Badge,
  Input,
  Label,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DataTable
} from '@newwork/nw-design-system'
import {
  Table2,
  FileInput,
  BarChart3,
  Kanban,
  Calendar,
  Plus,
  Search,
  Download,
  Upload,
  Settings,
  Filter,
  MoreVertical,
  Pencil,
  Trash2,
  ChevronLeft,
  Layers,
  RefreshCw,
  Database,
  Loader2,
  AlertCircle,
  Columns,
  Eye,
  EyeOff,
  Workflow,
  X,
  Save,
  Activity,
  User
} from 'lucide-react'
import { DynamicFormGenerator } from '@/business-apps/ser/components/DynamicFormGenerator'
import type { DynamicFormField } from '@/business-apps/ser/types/flowTemplate'
import type { SpreadsheetApp, SpreadsheetSheet, SpreadsheetColumn, ViewType, SheetView, ColumnType } from './types'
import { evaluateFormula, isFormula, type FormulaContext } from './utils/formulaEvaluator'
import { getIconByName, DEFAULT_APP_ICON } from './utils/appIcons'
import { useEntityDataSource } from './hooks/useEntityDataSource'
import { AutomationsHub, AutomationWizard } from './components/automations'
import { useSpreadsheetAutomations } from './hooks/useSpreadsheetAutomations'
import { isTrackingColumn } from './utils/trackingColumns'
import { TRACKING_COLUMNS } from './components/automations/TrackingColumnsConfig'
import { normalizeImageSrc } from './utils/normalizeImageSrc'
import { useCollaboration } from '../shared/hooks/useCollaboration'
import { PresenceIndicator } from '../shared/components/PresenceIndicator'
import { CellCollaboratorIndicator } from '../shared/components/CellCollaboratorIndicator'

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
  onBack?: () => void
  onEdit?: () => void
  isEditing?: boolean
  accessToken?: string
  userId?: string
  'data-testid'?: string
}

/**
 * Get icon for view type
 */
function getViewIcon(type: ViewType) {
  switch (type) {
    case 'table':
      return Table2
    case 'form':
      return FileInput
    case 'dashboard':
      return BarChart3
    case 'kanban':
      return Kanban
    case 'calendar':
      return Calendar
    default:
      return Table2
  }
}

/**
 * SpreadsheetAppViewer Component
 */
export const SpreadsheetAppViewer: React.FC<SpreadsheetAppViewerProps> = ({
  app,
  activeSheetId: initialSheetId,
  activeViewId: initialViewId,
  onDataChange,
  onRowAdd,
  onAppUpdate: _onAppUpdate,
  onBack,
  onEdit,
  accessToken = '',
  userId,
  'data-testid': testId = 'spreadsheet-app-viewer'
}) => {
  // State
  const [activeSheetId, setActiveSheetId] = useState(initialSheetId || app.sheets[0]?.id || '')
  const [activeViewId, setActiveViewId] = useState<string | null>(initialViewId || null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isManageColumnsDialogOpen, setIsManageColumnsDialogOpen] = useState(false)
  const [editingColumns, setEditingColumns] = useState<SpreadsheetColumn[]>([])
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null)
  const [isAutomationsOpen, setIsAutomationsOpen] = useState(false)
  const [isAutomationWizardOpen, setIsAutomationWizardOpen] = useState(false)
  const [editingAutomation, setEditingAutomation] = useState<import('./types/automation').SpreadsheetAutomation | null>(
    null
  )

  // Excel-like cell selection state
  const [selectedCell, setSelectedCell] = useState<{
    rowId: string
    colId: string
    rowIndex: number
    colIndex: number
  } | null>(null)

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
    (newAutomations: import('./types/automation').SpreadsheetAutomation[]) => {
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
    (newLinks: import('./types/automation').WorkflowRowLink[]) => {
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

  // Refs for row callbacks (used by automation hook for bulk collection)
  // Defined before hook call to be available in the callback
  const handleAddRowsRef = useRef<
    ((rows: Array<{ cells: Record<string, unknown>; metadata?: Record<string, unknown> }>) => void) | undefined
  >(undefined)
  const handleUpdateRowsRef = useRef<
    ((updates: Array<{ workflowId: string; cells: Record<string, unknown> }>) => void) | undefined
  >(undefined)

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

  const [formulaSelectionMode, setFormulaSelectionMode] = useState<FormulaSelectionMode>(null)
  const formulaSelectionModeRef = React.useRef<FormulaSelectionMode>(null)

  // Track all cells selected during formula mode for highlighting
  const [formulaSelectedCells, setFormulaSelectedCells] = useState<Array<{ rowIndex: number; colIndex: number }>>([])

  // Store current formula value at viewer level for access when saving
  const currentFormulaValueRef = React.useRef<string>('')
  const formulaBarInputRef = React.useRef<HTMLInputElement>(null)

  // Debounced save for rapid cell edits
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | null>(null)
  const isSavingRef = React.useRef(false)
  const SAVE_DEBOUNCE_MS = 500 // Debounce saves by 500ms

  // Local data state - completely independent from app.sheets during editing
  const [localSheetData, setLocalSheetData] = useState<Record<string, unknown>[]>(
    () => app.sheets.find(s => s.id === activeSheetId)?.data || []
  )

  // IMPORTANT: Keep a ref to always have access to the LATEST localSheetData
  // This prevents stale closure issues when handlers are called rapidly (e.g., from polling)
  const localSheetDataRef = React.useRef(localSheetData)
  useEffect(() => {
    localSheetDataRef.current = localSheetData
  }, [localSheetData])

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

  // Store current user ID to avoid applying our own operations
  const currentUserIdRef = useRef<string | undefined>(undefined)
  useEffect(() => {
    try {
      const token = localStorage.getItem('business-app-ide-access-token')
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]))
        currentUserIdRef.current = payload.sub || payload.userId
      }
    } catch {}
  }, [])

  // Collaboration callbacks (stable references - no dependencies)
  const onOperationReceivedCallback = useCallback((operation: any) => {
    // Handle incoming operations from other users
    console.log('[SpreadsheetAppViewer] Received operation:', operation)
    
    // #region agent log
    const isOwnOperation = operation.userId === currentUserIdRef.current
    fetch('http://127.0.0.1:7243/ingest/9ea89aac-f844-4512-b6de-713c7440e93e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SpreadsheetAppViewer.tsx:onOperationReceived',message:'Operation received in viewer',data:{operationType:operation.operation.type,fromUserId:operation.userId,currentUserId:currentUserIdRef.current,isOwnOperation},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'G'})}).catch(()=>{});
    // #endregion
    
    // Skip if this is our own operation (we already applied it optimistically)
    if (isOwnOperation) {
      console.log('[SpreadsheetAppViewer] Skipping own operation')
      return
    }
    
    // Apply the operation to local state
    if (operation.operation.type === 'cell_update') {
      const { sheetId, rowId, column, value } = operation.operation.data as {
        sheetId: string
        rowId: string
        column: string
        value: unknown
      }
      // Update local data directly - only if this is the active sheet
      if (sheetId === activeSheetIdRef.current) {
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/9ea89aac-f844-4512-b6de-713c7440e93e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SpreadsheetAppViewer.tsx:cellUpdate:apply',message:'Applying cell update from other user',data:{rowId,column,value},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'J'})}).catch(()=>{});
        // #endregion
        setLocalSheetData(prevData => prevData.map(row => (row._id === rowId ? { ...row, [column]: value } : row)))
      }
    } else if (operation.operation.type === 'row_add') {
      const { sheetId, rowData } = operation.operation.data as {
        sheetId: string
        rowData: Record<string, unknown>
      }
      if (sheetId === activeSheetIdRef.current) {
        setLocalSheetData(prevData => {
          // Check if row already exists (prevent duplicates)
          const exists = prevData.some(row => row._id === rowData._id)
          if (exists) {
            console.log('[SpreadsheetAppViewer] Row already exists, skipping duplicate:', rowData._id)
            // #region agent log
            fetch('http://127.0.0.1:7243/ingest/9ea89aac-f844-4512-b6de-713c7440e93e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SpreadsheetAppViewer.tsx:rowAdd:duplicate',message:'Duplicate row detected',data:{rowId:rowData._id,currentRowCount:prevData.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'J'})}).catch(()=>{});
            // #endregion
            return prevData
          }
          // #region agent log
          fetch('http://127.0.0.1:7243/ingest/9ea89aac-f844-4512-b6de-713c7440e93e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SpreadsheetAppViewer.tsx:rowAdd:adding',message:'Adding row from collaboration',data:{rowId:rowData._id,currentRowCount:prevData.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'J'})}).catch(()=>{});
          // #endregion
          return [...prevData, rowData]
        })
      }
    } else if (operation.operation.type === 'row_delete') {
      const { sheetId, rowId } = operation.operation.data as {
        sheetId: string
        rowId: string
      }
      if (sheetId === activeSheetIdRef.current) {
        setLocalSheetData(prevData => prevData.filter(row => row._id !== rowId))
      }
    } else if (operation.operation.type === 'column_add') {
      const { sheetId, column } = operation.operation.data as {
        sheetId: string
        column: SpreadsheetColumn
      }
      // Trigger parent update with new column
      if (sheetId === activeSheetIdRef.current && onAppUpdateRef.current) {
        const currentSheet = app.sheets.find(s => s.id === sheetId)
        if (currentSheet) {
          const updatedSheets = app.sheets.map(sheet =>
            sheet.id === sheetId
              ? { ...sheet, columns: [...sheet.columns, column], data: localSheetDataRef.current }
              : sheet
          )
          onAppUpdateRef.current({ ...app, sheets: updatedSheets })
        }
      }
    } else if (operation.operation.type === 'column_update') {
      const { sheetId, columns } = operation.operation.data as {
        sheetId: string
        columns: SpreadsheetColumn[]
      }
      // Update columns
      if (sheetId === activeSheetIdRef.current && onAppUpdateRef.current) {
        const updatedSheets = app.sheets.map(sheet =>
          sheet.id === sheetId ? { ...sheet, columns, data: localSheetDataRef.current } : sheet
        )
        onAppUpdateRef.current({ ...app, sheets: updatedSheets })
      }
    } else if (operation.operation.type === 'column_delete') {
      const { sheetId, columnId } = operation.operation.data as {
        sheetId: string
        columnId: string
      }
      // Remove column
      if (sheetId === activeSheetIdRef.current && onAppUpdateRef.current) {
        const currentSheet = app.sheets.find(s => s.id === sheetId)
        if (currentSheet) {
          const updatedColumns = currentSheet.columns.filter(col => col.id !== columnId)
          const updatedSheets = app.sheets.map(sheet =>
            sheet.id === sheetId ? { ...sheet, columns: updatedColumns, data: localSheetDataRef.current } : sheet
          )
          onAppUpdateRef.current({ ...app, sheets: updatedSheets })
        }
      }
    }
  }, []) // No dependencies - completely stable

  const onErrorCallback = useCallback((error: Error) => {
    console.error('[SpreadsheetAppViewer] Collaboration error:', error)
  }, [])

  // Collaboration state (initialized after localSheetData to avoid race conditions)
  const {
    participants,
    isConnected: isCollaborationConnected,
    emitOperation,
    emitCursor
  } = useCollaboration({
    entityType: 'spreadsheet',
    entityId: app.id,
    enabled: true,
    onOperationReceived: onOperationReceivedCallback,
    onError: onErrorCallback
  })

  // Emit cursor position when selected cell changes
  useEffect(() => {
    if (!selectedCell) return

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/9ea89aac-f844-4512-b6de-713c7440e93e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SpreadsheetAppViewer.tsx:cursor_emit_effect',message:'Selected cell changed (cursor emit check)',data:{sheetId:activeSheetId,rowId:selectedCell.rowId,colId:selectedCell.colId,isConnected:isCollaborationConnected,isTemporaryRow:typeof selectedCell.rowId==='string'&&selectedCell.rowId.startsWith('row_')},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'R6'})}).catch(()=>{});
    // #endregion

    if (isCollaborationConnected) {
      emitCursor({
        path: [activeSheetId, selectedCell.rowId, selectedCell.colId],
        line: selectedCell.rowIndex,
        column: selectedCell.colIndex
      })
    }
  }, [selectedCell, activeSheetId, isCollaborationConnected, emitCursor])

  // Track previous sheet ID to detect actual sheet changes
  const prevSheetIdRef = React.useRef(activeSheetId)

  // Only sync from app.sheets when the sheet ID actually changes (user switches sheets)
  useEffect(() => {
    const sheetData = app.sheets.find(s => s.id === activeSheetId)?.data || []
    console.warn('[SpreadsheetAppViewer] useEffect triggered:', {
      prevId: prevSheetIdRef.current,
      currentId: activeSheetId,
      willSync: prevSheetIdRef.current !== activeSheetId,
      appSheetsRowCount: sheetData.length,
      localSheetDataRowCount: localSheetData.length
    })
    if (prevSheetIdRef.current !== activeSheetId) {
      console.warn('[SpreadsheetAppViewer] Sheet ID changed, syncing from app.sheets:', {
        prevId: prevSheetIdRef.current,
        newId: activeSheetId,
        rowCount: sheetData.length
      })
      setLocalSheetData(sheetData)
      prevSheetIdRef.current = activeSheetId
    }
  }, [activeSheetId, app.sheets])

  // Debug: Log whenever localSheetData changes
  useEffect(() => {
    console.warn('[SpreadsheetAppViewer] localSheetData CHANGED:', {
      rowCount: localSheetData.length,
      firstRowData: localSheetData[0] ? JSON.stringify(localSheetData[0]) : 'no rows'
    })
  }, [localSheetData])

  // Debug: Log whenever app prop changes
  useEffect(() => {
    const sheetData = app.sheets.find(s => s.id === activeSheetId)?.data || []
    console.warn('[SpreadsheetAppViewer] APP PROP CHANGED:', {
      appId: app.id,
      sheetsCount: app.sheets.length,
      activeSheetRowCount: sheetData.length
    })
  }, [app, activeSheetId])
  // Also keep a state copy for displaying in the formula bar (refs don't trigger re-renders)
  // null = not editing, '' = editing with empty value
  const [currentFormulaDisplay, setCurrentFormulaDisplay] = useState<string | null>(null)

  useEffect(() => {
    formulaSelectionModeRef.current = formulaSelectionMode
  }, [formulaSelectionMode])

  // When entering formula selection mode, keep focus in the formula bar so users can keep typing.
  useEffect(() => {
    if (!formulaSelectionMode) return
    // Delay to allow any cell input focus side-effects to run first (e.g. from double-click / formula buttons)
    setTimeout(() => {
      const input = formulaBarInputRef.current
      if (!input) return
      input.focus()
      const len = input.value?.length ?? 0
      input.setSelectionRange(len, len)
    }, 0)
  }, [formulaSelectionMode])

  // Clear formula selected cells when exiting formula mode
  useEffect(() => {
    if (!formulaSelectionMode) {
      setFormulaSelectedCells([])
    }
  }, [formulaSelectionMode])

  // Clear formula display when selected cell changes (unless in formula mode)
  useEffect(() => {
    if (!formulaSelectionMode) {
      currentFormulaValueRef.current = ''
      setCurrentFormulaDisplay(null) // null = not editing
    }
  }, [selectedCell?.rowId, selectedCell?.colId])

  // Debounced save function - batches rapid changes and prevents concurrent saves
  const debouncedSave = useCallback(
    (sheetId: string, data: Record<string, unknown>[]) => {
      // Clear any pending save
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }

      saveTimeoutRef.current = setTimeout(() => {
        // Don't save if already saving
        if (isSavingRef.current) {
          return
        }

        isSavingRef.current = true
        saveTimeoutRef.current = null

        // Save the data
        onDataChange?.(sheetId, data)

        // Reset saving flag after a short delay to allow the save to complete
        setTimeout(() => {
          isSavingRef.current = false
        }, 100)
      }, SAVE_DEBOUNCE_MS)
    },
    [onDataChange]
  )

  // Cleanup: cancel any pending save on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  // Get active sheet
  const activeSheet = useMemo(
    () => app.sheets.find(s => s.id === activeSheetId) || app.sheets[0],
    [app.sheets, activeSheetId]
  )

  // Get active view
  const activeView = useMemo(() => {
    if (activeViewId) {
      return activeSheet?.views.find(v => v.id === activeViewId)
    }
    return activeSheet?.views.find(v => v.isDefault) || activeSheet?.views[0]
  }, [activeSheet, activeViewId])

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
    console.log('[SpreadsheetViewer] loadSheetEntityData called', {
      hasSheet: !!activeSheet,
      hasDataSource: !!activeSheet?.entityDataSource,
      enabled: activeSheet?.entityDataSource?.enabled
    })

    if (!activeSheet?.entityDataSource?.enabled) {
      setEntityData([])
      setEntityDataError(null)
      return
    }

    setIsEntityDataLoading(true)
    setEntityDataError(null)

    try {
      console.log('[SpreadsheetViewer] Loading entity data...', activeSheet.entityDataSource)
      const result = await loadEntityData(activeSheet.entityDataSource)
      console.log('[SpreadsheetViewer] Entity data result:', result)

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

        console.log('[SpreadsheetViewer] Mapped data:', mappedData.slice(0, 2))
        setEntityData(mappedData)
      } else {
        console.log('[SpreadsheetViewer] No records returned')
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
    console.log('[SpreadsheetViewer] Entity data effect triggered', {
      activeSheetId,
      hasDataSource: !!activeSheet?.entityDataSource,
      enabled: activeSheet?.entityDataSource?.enabled,
      refreshMode: activeSheet?.entityDataSource?.refreshMode
    })

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
   * Determine which data to use - entity data or static sheet data
   * When entity data source is enabled, merge entity data with custom column data from sheet.data
   * Uses localSheetData for immediate UI updates (pending changes not yet saved)
   */
  const sourceData = useMemo(() => {
    console.warn('[SpreadsheetAppViewer] sourceData useMemo recomputing:', {
      entityEnabled: activeSheet?.entityDataSource?.enabled,
      entityDataLength: entityData.length,
      localSheetDataLength: localSheetData.length,
      firstRowKeys: localSheetData[0] ? Object.keys(localSheetData[0]) : []
    })
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

  // Filter data based on search and evaluate formulas
  const filteredData = useMemo(() => {
    if (!activeSheet) return []

    // First, recalculate all formulas
    const dataWithFormulas = recalculateAllFormulas(sourceData)

    // Then filter if search query exists
    if (!searchQuery.trim()) {
      return dataWithFormulas
    }

    const query = searchQuery.toLowerCase()
    return dataWithFormulas.filter(row =>
      Object.values(row).some(value => value && String(value).toLowerCase().includes(query))
    )
  }, [activeSheet, sourceData, searchQuery, recalculateAllFormulas])

  /**
   * Handle row add - immediately add empty row (no modal)
   */
  const handleAddRow = useCallback(async () => {
    if (!activeSheet || !app) return

    // Create row data with default values for each column
    const rowData: Record<string, unknown> = {}

    // Add default values for each column
    activeSheet.columns.forEach(col => {
      if (col.defaultValue !== undefined) {
        rowData[col.name] = col.defaultValue
      } else {
        // Set empty string for text columns, null for others
        if (col.type === 'text' || col.type === 'email' || col.type === 'url' || col.type === 'phone') {
          rowData[col.name] = ''
        } else {
          rowData[col.name] = null
        }
      }
    })

    // When collaboration is active, we still need to call REST API to get real UUID
    // Then broadcast via WebSocket so other users get the real row
    if (isCollaborationConnected && onRowAdd) {
      const savedRow = await onRowAdd(app.id, activeSheet.id, rowData)
      if (savedRow) {
        // Add to local data
        setLocalSheetData(prev => [...prev, savedRow])

        // Broadcast to other users with real UUID
        emitOperation({
          type: 'row_add',
          data: {
            sheetId: activeSheet.id,
            rowData: savedRow
          }
        })
      }
    } else if (onRowAdd) {
      // Fallback to REST API when collaboration is not connected
      const savedRow = await onRowAdd(app.id, activeSheet.id, rowData)
      if (savedRow) {
        setLocalSheetData(prev => [...prev, savedRow])
      }
    } else {
      // Fallback: update local state only (legacy behavior)
      const newRow: Record<string, unknown> = {
        _id: `row_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        _createdAt: new Date().toISOString(),
        ...rowData
      }
      setLocalSheetData(prev => [...prev, newRow])
      onDataChange?.(activeSheet.id, [...localSheetData, newRow])
    }
  }, [activeSheet, app, localSheetData, onRowAdd, onDataChange, isCollaborationConnected, emitOperation])

  /**
   * Handle adding multiple rows (from bulk collection responses)
   */
  const handleAddRows = useCallback(
    (rows: Array<{ cells: Record<string, unknown>; metadata?: Record<string, unknown> }>) => {
      console.log('[SpreadsheetAppViewer] handleAddRows ENTRY - rows:', rows.length, 'activeSheet:', !!activeSheet)

      // CRITICAL: Cancel any pending debounced saves to prevent race condition
      // where stale data overwrites the new rows we're about to add
      if (saveTimeoutRef.current) {
        console.warn('[SpreadsheetAppViewer] handleAddRows - Cancelling pending debounced save')
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }

      if (!activeSheet || rows.length === 0) {
        console.log('[SpreadsheetAppViewer] handleAddRows EARLY EXIT - no activeSheet or empty rows')
        return
      }

      console.log('[SpreadsheetAppViewer] handleAddRows called with', rows.length, 'rows')
      console.log('[SpreadsheetAppViewer] Row data:', JSON.stringify(rows, null, 2))

      // Internal metadata fields to skip (not user-visible columns)
      const internalMetadataFields = new Set([
        '_id',
        '_createdAt',
        '_updatedAt',
        '_workflow_id',
        '_recipient_id',
        '_isBulkCollectionPending',
        '_automationId'
      ])

      // Collect all unique field names from the incoming data
      const allFieldNames = new Set<string>()
      rows.forEach(rowData => {
        Object.keys(rowData.cells).forEach(key => {
          const isTracking = isTrackingColumn(key)
          const isMetadata = internalMetadataFields.has(key)
          console.log(
            `[SpreadsheetAppViewer] Checking field "${key}": isTrackingColumn=${isTracking}, isMetadata=${isMetadata}`
          )

          // Include tracking columns (like _recipient_name, _sent_at)
          // but skip internal metadata fields
          if (isTracking || !isMetadata) {
            allFieldNames.add(key)
          }
        })
      })

      // Using console.warn because console.log is stripped in production
      console.warn('[SpreadsheetAppViewer] All field names to process:', Array.from(allFieldNames))

      // Find fields that don't have corresponding columns
      const existingColumnIds = new Set(activeSheet.columns.map(c => c.id))
      const existingColumnNames = new Set(activeSheet.columns.map(c => c.name))
      const newFieldNames: string[] = []

      console.warn('[SpreadsheetAppViewer] Existing column IDs:', Array.from(existingColumnIds))
      console.warn('[SpreadsheetAppViewer] Existing column names:', Array.from(existingColumnNames))

      allFieldNames.forEach(fieldName => {
        // Check if field matches existing column by ID or name
        const existsById = existingColumnIds.has(fieldName)
        const existsByName = existingColumnNames.has(fieldName)
        console.warn(
          `[SpreadsheetAppViewer] Checking field "${fieldName}": existsById=${existsById}, existsByName=${existsByName}`
        )
        if (!existsById && !existsByName) {
          newFieldNames.push(fieldName)
        }
      })

      console.warn('[SpreadsheetAppViewer] New fields to create columns for:', newFieldNames)

      // Create new columns for unknown fields
      const newColumns: SpreadsheetColumn[] = newFieldNames.map((fieldName, index) => {
        // Check if this is a tracking column and get its definition
        const trackingCol = TRACKING_COLUMNS.find(tc => tc.name === fieldName)

        // Generate a user-friendly label
        let label: string
        let colType: SpreadsheetColumn['type'] = 'text'

        if (trackingCol) {
          // Use the tracking column's predefined label
          label = trackingCol.label
          // Set appropriate type for tracking columns
          if (trackingCol.id === 'sent_at' || trackingCol.id === 'responded_at') {
            colType = 'datetime'
          } else if (trackingCol.id === 'recipient_email') {
            colType = 'email'
          } else if (trackingCol.id === 'recipient_avatar') {
            colType = 'image'
          }
        } else if (fieldName === '__new__') {
          label = 'New Response Field'
        } else {
          label = fieldName
            .replace(/^col_\d+_\w+$/, 'Response')
            .replace(/^_/, '') // Remove leading underscore
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
        }

        return {
          id:
            fieldName.startsWith('col_') || fieldName === '__new__' || fieldName.startsWith('_')
              ? fieldName
              : `col_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 5)}`,
          name: fieldName,
          label,
          type: colType,
          isVisible: true,
          isEditable: !trackingCol, // Tracking columns are read-only
          isRequired: false,
          isUnique: false,
          isTracking: !!trackingCol,
          order: index // Will be reordered below
        }
      })

      // Update columns if needed - tracking columns first, then existing, then new non-tracking
      let updatedColumns = activeSheet.columns
      if (newColumns.length > 0 && _onAppUpdate) {
        const trackingNew = newColumns.filter(c => c.isTracking)
        const nonTrackingNew = newColumns.filter(c => !c.isTracking)
        const existingNonTracking = activeSheet.columns.filter(c => !c.isTracking)
        const existingTracking = activeSheet.columns.filter(c => c.isTracking)

        // Order: existing tracking, new tracking, existing non-tracking, new non-tracking
        updatedColumns = [...existingTracking, ...trackingNew, ...existingNonTracking, ...nonTrackingNew].map(
          (col, idx) => ({ ...col, order: idx })
        )

        console.log('[SpreadsheetAppViewer] Adding', newColumns.length, 'new columns (tracking columns first)')
      }

      // Build a map for column lookup (including new columns)
      const columnMap = new Map<string, SpreadsheetColumn>()
      updatedColumns.forEach(col => {
        columnMap.set(col.id, col)
        columnMap.set(col.name, col)
      })

      const newRows = rows.map((rowData, index) => {
        const newRow: Record<string, unknown> = {
          _id: `row_${Date.now()}_${index}_${Math.random().toString(36).substring(2, 9)}`,
          _createdAt: new Date().toISOString(),
          ...rowData.metadata
        }

        // Map cell data to column names
        for (const [key, value] of Object.entries(rowData.cells)) {
          // Check if key is a column ID and convert to column name
          const column = columnMap.get(key)
          if (column) {
            newRow[column.name] = value
          } else {
            // Store as-is if no matching column (might be a metadata field)
            newRow[key] = value
          }
        }

        return newRow
      })

      console.log(
        '[SpreadsheetAppViewer] DEBUG: New columns to add:',
        newColumns.map(c => ({ id: c.id, name: c.name, label: c.label }))
      )
      console.log('[SpreadsheetAppViewer] DEBUG: New rows built:', JSON.stringify(newRows, null, 2))

      // Update local data immediately - use ref to get LATEST state (avoid stale closures from polling)
      const currentData = localSheetDataRef.current
      const newData = [...currentData, ...newRows]
      // Keep ref in sync immediately (do not wait for effect) to avoid stale overwrites
      localSheetDataRef.current = newData
      setLocalSheetData(newData)
      console.log(
        '[SpreadsheetAppViewer] DEBUG: setLocalSheetData called with',
        newData.length,
        'total rows (was',
        currentData.length,
        ')'
      )

      // IMPORTANT: Only call ONE of onDataChange or _onAppUpdate to prevent race condition
      // When we have new columns, use _onAppUpdate which includes both columns AND data
      // Otherwise, use onDataChange for just the data update
      if (newColumns.length > 0 && _onAppUpdate) {
        // We have new columns - use _onAppUpdate which saves everything at once
        console.warn(
          '[SpreadsheetAppViewer] Adding new columns to sheet, count:',
          newColumns.length,
          'columns:',
          newColumns.map(c => c.label)
        )
        const updatedSheets = app.sheets.map(sheet =>
          sheet.id === activeSheet.id ? { ...sheet, columns: updatedColumns, data: newData } : sheet
        )
        _onAppUpdate({ ...app, sheets: updatedSheets })
        console.warn('[SpreadsheetAppViewer] _onAppUpdate called with new columns and data')
      } else if (_onAppUpdate) {
        // No new columns but we have _onAppUpdate - use it to avoid race condition
        console.warn('[SpreadsheetAppViewer] handleAddRows - No new columns - using _onAppUpdate for data only')
        console.warn('[SpreadsheetAppViewer] handleAddRows - newData length:', newData.length)
        console.warn(
          '[SpreadsheetAppViewer] handleAddRows - newData row IDs:',
          newData.map(r => r._id)
        )
        const updatedSheets = app.sheets.map(sheet =>
          sheet.id === activeSheet.id ? { ...sheet, data: newData } : sheet
        )
        console.warn(
          '[SpreadsheetAppViewer] handleAddRows - Calling _onAppUpdate with',
          updatedSheets[0]?.data?.length,
          'rows'
        )
        _onAppUpdate({ ...app, sheets: updatedSheets })
      } else {
        // Fallback to onDataChange when _onAppUpdate is not available
        console.warn('[SpreadsheetAppViewer] Fallback to onDataChange - _onAppUpdate not available')
        onDataChange?.(activeSheet.id, newData)
      }

      console.log('[SpreadsheetAppViewer] Added', newRows.length, 'rows from bulk collection')
    },
    [activeSheet, localSheetData, onDataChange, _onAppUpdate, app]
  )

  /**
   * Handle updating existing rows (when bulk collection responses come back)
   * Finds rows by _workflow_id and updates them with response data
   * Also creates columns for tracking fields if they don't exist
   */
  const handleUpdateRows = useCallback(
    (updates: Array<{ workflowId: string; cells: Record<string, unknown> }>) => {
      // CRITICAL: Cancel any pending debounced saves to prevent race condition
      // where stale data overwrites the updates we're about to make
      if (saveTimeoutRef.current) {
        console.warn('[SpreadsheetAppViewer] handleUpdateRows - Cancelling pending debounced save')
        clearTimeout(saveTimeoutRef.current)
        saveTimeoutRef.current = null
      }

      if (!activeSheet || updates.length === 0) return

      // Using console.warn because console.log is stripped in production builds
      console.warn('[SpreadsheetAppViewer] handleUpdateRows called with', updates.length, 'updates')

      // Internal metadata fields to skip (not user-visible columns)
      const internalMetadataFields = new Set([
        '_id',
        '_createdAt',
        '_updatedAt',
        '_workflow_id',
        '_recipient_id',
        '_isBulkCollectionPending',
        '_automationId'
      ])

      // Collect all field names from update cells to check for missing columns
      const allFieldNames = new Set<string>()
      updates.forEach(update => {
        Object.keys(update.cells).forEach(key => {
          const isTracking = isTrackingColumn(key)
          const isMetadata = internalMetadataFields.has(key)
          // Include tracking columns but skip internal metadata
          if (isTracking || !isMetadata) {
            allFieldNames.add(key)
          }
        })
      })

      // Find fields that don't have corresponding columns
      const existingColumnIds = new Set(activeSheet.columns.map(c => c.id))
      const existingColumnNames = new Set(activeSheet.columns.map(c => c.name))
      const newFieldNames: string[] = []

      allFieldNames.forEach(fieldName => {
        if (!existingColumnIds.has(fieldName) && !existingColumnNames.has(fieldName)) {
          newFieldNames.push(fieldName)
        }
      })

      console.warn('[SpreadsheetAppViewer] handleUpdateRows - new fields needing columns:', newFieldNames)

      // Create new columns for tracking fields
      const newColumns: SpreadsheetColumn[] = newFieldNames.map((fieldName, index) => {
        const trackingCol = TRACKING_COLUMNS.find(tc => tc.name === fieldName)

        let label: string
        let colType: SpreadsheetColumn['type'] = 'text'

        if (trackingCol) {
          label = trackingCol.label
          if (trackingCol.id === 'sent_at' || trackingCol.id === 'responded_at') {
            colType = 'datetime'
          } else if (trackingCol.id === 'recipient_email') {
            colType = 'email'
          } else if (trackingCol.id === 'recipient_avatar') {
            colType = 'image'
          }
        } else {
          label = fieldName
            .replace(/^_/, '')
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
        }

        return {
          id: fieldName,
          name: fieldName,
          label,
          type: colType,
          isVisible: true,
          isEditable: !trackingCol,
          isRequired: false,
          isUnique: false,
          isTracking: !!trackingCol,
          order: index // Will be reordered below
        }
      })

      // Build updated columns list - tracking columns first, then existing, then new non-tracking
      let updatedColumns = activeSheet.columns
      if (newColumns.length > 0) {
        const trackingNew = newColumns.filter(c => c.isTracking)
        const nonTrackingNew = newColumns.filter(c => !c.isTracking)
        const existingNonTracking = activeSheet.columns.filter(c => !c.isTracking)
        const existingTracking = activeSheet.columns.filter(c => c.isTracking)

        // Order: existing tracking, new tracking, existing non-tracking, new non-tracking
        updatedColumns = [...existingTracking, ...trackingNew, ...existingNonTracking, ...nonTrackingNew].map(
          (col, idx) => ({ ...col, order: idx })
        )

        console.warn(
          '[SpreadsheetAppViewer] handleUpdateRows - adding',
          newColumns.length,
          'new columns:',
          newColumns.map(c => c.label)
        )
      }

      // Build a map of workflowId -> cells for quick lookup
      const updateMap = new Map(updates.map(u => [u.workflowId, u.cells]))

      // Update local data - find rows with matching _workflow_id
      // IMPORTANT: Use ref to get LATEST state (avoid stale closures from polling)
      const currentData = localSheetDataRef.current
      let matchCount = 0
      const newData = currentData.map(row => {
        const workflowId = row._workflow_id as string | undefined
        if (workflowId && updateMap.has(workflowId)) {
          matchCount++
          const cellUpdates = updateMap.get(workflowId)!
          console.warn('[SpreadsheetAppViewer] MATCH! Updating row with workflowId:', workflowId)
          return {
            ...row,
            ...cellUpdates,
            _updatedAt: new Date().toISOString()
          }
        }
        return row
      })

      console.warn('[SpreadsheetAppViewer] Total matches found:', matchCount, '(from', currentData.length, 'rows)')

      // CRITICAL: Only update state and save if there were ACTUAL changes
      // This prevents race conditions where polling triggers saves with stale data
      if (matchCount === 0 && newColumns.length === 0) {
        console.warn(
          '[SpreadsheetAppViewer] handleUpdateRows - NO CHANGES, skipping save to prevent stale data overwrite'
        )
        return
      }

      // Keep ref in sync immediately (do not wait for effect) to avoid stale overwrites
      localSheetDataRef.current = newData
      setLocalSheetData(newData)

      // IMPORTANT: Only call ONE of onDataChange or _onAppUpdate to prevent race condition
      // When we have new columns, use _onAppUpdate which includes both columns AND data
      // Otherwise, prefer _onAppUpdate if available to avoid stale closure issues
      if (newColumns.length > 0 && _onAppUpdate) {
        console.warn('[SpreadsheetAppViewer] handleUpdateRows - updating app with new columns')
        const updatedSheets = app.sheets.map(sheet =>
          sheet.id === activeSheet.id ? { ...sheet, columns: updatedColumns, data: newData } : sheet
        )
        _onAppUpdate({ ...app, sheets: updatedSheets })
      } else if (_onAppUpdate && matchCount > 0) {
        // Only save if we actually updated rows - avoid overwriting with stale data
        console.warn('[SpreadsheetAppViewer] handleUpdateRows - using _onAppUpdate for data only')
        const updatedSheets = app.sheets.map(sheet =>
          sheet.id === activeSheet.id ? { ...sheet, data: newData } : sheet
        )
        _onAppUpdate({ ...app, sheets: updatedSheets })
      } else if (matchCount > 0) {
        // Fallback to onDataChange when _onAppUpdate is not available
        console.warn('[SpreadsheetAppViewer] handleUpdateRows - fallback to onDataChange')
        onDataChange?.(activeSheet.id, newData)
      }

      console.warn(
        '[SpreadsheetAppViewer] Updated rows for',
        updates.length,
        'bulk collection responses, actual updates:',
        matchCount
      )
    },
    [activeSheet, localSheetData, onDataChange, _onAppUpdate, app]
  )

  // Keep refs updated with latest handlers
  useEffect(() => {
    handleAddRowsRef.current = handleAddRows
  }, [handleAddRows])

  useEffect(() => {
    handleUpdateRowsRef.current = handleUpdateRows
  }, [handleUpdateRows])

  /**
   * Handle row update
   */
  const handleUpdateRow = useCallback(
    async (values: Record<string, unknown>) => {
      if (!activeSheet || !editingRow) return

      const newData = activeSheet.data.map(row =>
        row._id === editingRow._id ? { ...row, ...values, _updatedAt: new Date().toISOString() } : row
      )

      onDataChange?.(activeSheet.id, newData)
      setEditingRow(null)
    },
    [activeSheet, editingRow, onDataChange]
  )

  /**
   * Handle row delete
   */
  const handleDeleteRow = useCallback(
    (rowId: string) => {
      if (!activeSheet) return

      // Update local data immediately
      const newData = localSheetData.filter(row => {
        const id = row._id ?? row.id
        return id !== rowId
      })
      setLocalSheetData(newData)

      // Save to backend
      onDataChange?.(activeSheet.id, newData)
    },
    [activeSheet, localSheetData, onDataChange]
  )

  /**
   * Handle adding a new column - immediately add with default name (no modal)
   */
  const handleAddColumn = useCallback(() => {
    if (!activeSheet) return

    // Generate default column name (Column 1, Column 2, etc.)
    const existingColumnNames = activeSheet.columns.map(col => col.name.toLowerCase())
    let columnNumber = 1
    let columnName = `column_${columnNumber}`
    while (existingColumnNames.includes(columnName)) {
      columnNumber++
      columnName = `column_${columnNumber}`
    }

    const newColumn: SpreadsheetColumn = {
      id: `col_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      name: columnName,
      label: `Column ${columnNumber}`,
      type: 'text',
      isVisible: true,
      isEditable: true,
      isRequired: false,
      isUnique: false,
      width: 150,
      order: activeSheet.columns.length
    }

    // When collaboration is active, use WebSocket for persistence
    if (isCollaborationConnected) {
      // Optimistic update - add column locally
      const updatedSheets = app.sheets.map(sheet => {
        if (sheet.id === activeSheet.id) {
          return {
            ...sheet,
            data: localSheetDataRef.current,
            columns: [...sheet.columns, newColumn]
          }
        }
        return sheet
      })
      _onAppUpdate?.({ ...app, sheets: updatedSheets })

      // Emit WebSocket operation to persist and broadcast
      emitOperation({
        type: 'column_add',
        data: {
          sheetId: activeSheet.id,
          column: newColumn
        }
      })
    } else {
      // Fallback to REST API when collaboration is not connected
      const updatedSheets = app.sheets.map(sheet => {
        if (sheet.id === activeSheet.id) {
          return {
            ...sheet,
            data: localSheetDataRef.current,
            columns: [...sheet.columns, newColumn]
          }
        }
        return sheet
      })
      _onAppUpdate?.({ ...app, sheets: updatedSheets })
    }
  }, [activeSheet, app, _onAppUpdate, isCollaborationConnected, emitOperation])

  /**
   * Handle deleting a column
   */
  const handleDeleteColumn = useCallback(
    (columnId: string) => {
      if (!activeSheet) return

      // Don't allow deleting the last column
      if (activeSheet.columns.length <= 1) {
        return
      }

      // Remove column from columns array
      const updatedColumns = activeSheet.columns.filter(col => col.id !== columnId)

      // Remove column data from all rows
      const columnToDelete = activeSheet.columns.find(col => col.id === columnId)
      const updatedData = localSheetDataRef.current.map(row => {
        const newRow = { ...row }
        if (columnToDelete) {
          delete newRow[columnToDelete.name]
        }
        return newRow
      })

      // Update app
      const updatedSheets = app.sheets.map(sheet => {
        if (sheet.id === activeSheet.id) {
          return {
            ...sheet,
            columns: updatedColumns,
            data: updatedData
          }
        }
        return sheet
      })

      _onAppUpdate?.({ ...app, sheets: updatedSheets })

      // Emit WebSocket operation when collaboration is active
      if (isCollaborationConnected) {
        emitOperation({
          type: 'column_delete',
          data: {
            sheetId: activeSheet.id,
            columnId
          }
        })
      }
    },
    [activeSheet, app, _onAppUpdate, isCollaborationConnected, emitOperation]
  )

  /**
   * Convert column index to Excel column letter (0=A, 1=B, etc.)
   */
  const columnIndexToLetter = useCallback((index: number): string => {
    let result = ''
    index += 1 // Convert to 1-based
    while (index > 0) {
      index -= 1
      result = String.fromCharCode(65 + (index % 26)) + result
      index = Math.floor(index / 26)
    }
    return result
  }, [])

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
        // For range selection, add all cells in the range
        const startRow = Math.min(mode.startCell.rowIndex, rowIndex)
        const endRow = Math.max(mode.startCell.rowIndex, rowIndex)
        const startCol = Math.min(mode.startCell.colIndex, colIndex)
        const endCol = Math.max(mode.startCell.colIndex, colIndex)

        const rangeCells: Array<{ rowIndex: number; colIndex: number }> = []
        for (let r = startRow; r <= endRow; r++) {
          for (let c = startCol; c <= endCol; c++) {
            rangeCells.push({ rowIndex: r, colIndex: c })
          }
        }
        setFormulaSelectedCells(prev => [
          ...prev.filter(c => !(c.rowIndex === mode.startCell!.rowIndex && c.colIndex === mode.startCell!.colIndex)),
          ...rangeCells
        ])

        setFormulaSelectionMode({
          ...mode,
          endCell: { rowIndex, colIndex },
          isRangeSelection: true
        })
      } else {
        // Single cell selection - add to the list
        setFormulaSelectedCells(prev => [...prev, { rowIndex, colIndex }])

        setFormulaSelectionMode({
          ...mode,
          startCell: { rowIndex, colIndex },
          endCell: null,
          isRangeSelection: false
        })
      }

      // Get current formula from ref or input
      const activeCellElement = document.querySelector(
        `[data-cell-rowid="${mode.editingCell.rowId}"][data-cell-colid="${mode.editingCell.colId}"] input`
      ) as HTMLInputElement | null

      const currentFormula = activeCellElement?.value?.trim() || currentFormulaValueRef.current?.trim() || '='

      const appendRef = (formula: string, ref: string) => {
        const trimmed = formula.trim()
        if (trimmed === '' || trimmed === '=') return `${trimmed}${ref}`
        const lastChar = trimmed.slice(-1)
        if (/[+\-*/=(,]/.test(lastChar)) return `${formula}${ref}`
        return `${formula}+${ref}`
      }

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
          newFormula = appendRef(newFormula, rangeRef)
        }
      } else {
        newFormula = appendRef(newFormula, cellRef)
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
   * Uses localSheetData to accumulate rapid edits before debounced save
   */
  const handleCellChange = useCallback(
    (rowId: string, columnName: string, value: unknown) => {
      if (!activeSheet) return

      // Check if the value is a formula
      const isFormulaValue = typeof value === 'string' && value.trim().startsWith('=')

      // Check if we're using entity data source
      const isEntityDataSource = activeSheet.entityDataSource?.enabled && entityData.length > 0

      let newData: Record<string, unknown>[]

      if (isEntityDataSource) {
        // When entity data source is enabled, we save custom column data in localSheetData
        // keyed by the entity row ID
        const existingRowIndex = localSheetData.findIndex(row => row._id === rowId || row.id === rowId)

        if (existingRowIndex >= 0) {
          // Update existing row
          newData = localSheetData.map(row => {
            if (row._id === rowId || row.id === rowId) {
              const updatedRow: Record<string, unknown> = { ...row, _updatedAt: new Date().toISOString() }
              updatedRow[columnName] = value

              // Handle formulas
              if (isFormulaValue) {
                const formulas = (updatedRow._formulas as Record<string, string>) || {}
                formulas[columnName] = value as string
                updatedRow._formulas = formulas
              } else {
                const formulas = updatedRow._formulas as Record<string, string> | undefined
                if (formulas) {
                  delete formulas[columnName]
                  if (Object.keys(formulas).length === 0) {
                    delete updatedRow._formulas
                  }
                }
              }

              return updatedRow
            }
            return row
          })
        } else {
          // Create new row for custom column data (linked to entity row by _id)
          const newRow: Record<string, unknown> = {
            _id: rowId,
            _updatedAt: new Date().toISOString(),
            [columnName]: value
          }

          if (isFormulaValue) {
            newRow._formulas = { [columnName]: value as string }
          }

          newData = [...localSheetData, newRow]
        }
      } else {
        // Standard behavior when no entity data source
        newData = localSheetData.map(row => {
          if (row._id === rowId || row.id === rowId) {
            const updatedRow: Record<string, unknown> = { ...row, _updatedAt: new Date().toISOString() }

            // Store formula in _formulas object if it's a formula
            if (isFormulaValue) {
              updatedRow[columnName] = value // Store the formula string
              // Initialize _formulas if it doesn't exist
              const formulas = (updatedRow._formulas as Record<string, string>) || {}
              formulas[columnName] = value as string
              updatedRow._formulas = formulas
            } else {
              // Remove formula if user entered a regular value
              updatedRow[columnName] = value
              const formulas = updatedRow._formulas as Record<string, string> | undefined
              if (formulas) {
                delete formulas[columnName]
                // Clean up empty _formulas object
                if (Object.keys(formulas).length === 0) {
                  delete updatedRow._formulas
                } else {
                  updatedRow._formulas = formulas
                }
              }
            }

            return updatedRow
          }
          return row
        })
      }

      // Recalculate all formulas (in case this cell is referenced by others)
      newData = recalculateAllFormulas(newData)

      // Update local state immediately for responsive UI
      setLocalSheetData(newData)

      // Emit collaboration operation for real-time sync (WebSocket saves to DB)
      // Only emit if row has a valid UUID (not a temporary row_ ID)
      const isTemporaryRow = typeof rowId === 'string' && rowId.startsWith('row_')
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/9ea89aac-f844-4512-b6de-713c7440e93e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SpreadsheetAppViewer.tsx:handleCellChange:route',message:'Routing cell change',data:{sheetId:activeSheet.id,rowId,columnName,valueType:typeof value,isConnected:isCollaborationConnected,isTemporaryRow,route:(isCollaborationConnected&&!isTemporaryRow)?'ws':'rest'},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'R5'})}).catch(()=>{});
      // #endregion
      if (isCollaborationConnected && !isTemporaryRow) {
        emitOperation({
          type: 'cell_update',
          data: {
            sheetId: activeSheet.id,
            rowId,
            column: columnName,
            value
          }
        })
      } else {
        // Fallback to REST API save when collaboration is not connected
        // OR when row is temporary (not yet in database)
        debouncedSave(activeSheet.id, newData)
      }
    },
    [
      activeSheet,
      entityData,
      localSheetData,
      debouncedSave,
      recalculateAllFormulas,
      isCollaborationConnected,
      emitOperation
    ]
  )

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

          console.log('[Formula] Saving formula:', formulaValue, 'to cell:', formulaSelectionMode.editingCell)

          const column = activeSheet?.columns.find(c => c.id === formulaSelectionMode.editingCell.colId)

          if (column) {
            console.log('[Formula] Found column:', column.name)
            handleCellChange(formulaSelectionMode.editingCell.rowId, column.name, formulaValue)
          } else {
            console.warn('[Formula] Column not found for id:', formulaSelectionMode.editingCell.colId)
          }
        } else {
          console.warn('[Formula] No formula value stored')
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

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Don't handle if we're in an input or textarea (unless it's a cell input)
      const target = e.target as HTMLElement
      const isCellInput = target.closest('[data-cell-rowid]')
      if ((target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') && !isCellInput) return

      // Don't handle if a cell is currently being edited
      if (isEditingRef.current) return

      // Don't handle if formula selection mode is active
      if (formulaSelectionMode) return

      // Don't handle Delete/Backspace if target is a cell div (cell handler will handle it)
      if ((e.key === 'Delete' || e.key === 'Backspace') && target.hasAttribute('data-cell-rowid')) {
        return
      }

      const { rowIndex, colIndex, rowId, colId } = selectedCell
      // Find column by colId (more reliable than index)
      const column = activeSheet?.columns.find(c => c.id === colId)
      const canEdit = activeSheet?.settings.allowEdit && column?.isEditable && column?.type !== 'calculated'

      // Navigation function
      const navigateTo = (direction: 'up' | 'down' | 'left' | 'right') => {
        let targetRow = rowIndex
        let targetCol = colIndex

        switch (direction) {
          case 'up':
            targetRow = Math.max(0, rowIndex - 1)
            break
          case 'down':
            targetRow = rowIndex + 1
            break
          case 'left':
            targetCol = Math.max(0, colIndex - 1)
            break
          case 'right':
            targetCol = colIndex + 1
            break
        }

        const targetCell = document.querySelector(
          `[data-cell-row="${targetRow}"][data-cell-col="${targetCol}"]`
        ) as HTMLElement

        if (targetCell) {
          const targetRowId = targetCell.dataset.cellRowid
          const targetColId = targetCell.dataset.cellColid
          if (targetRowId && targetColId) {
            setSelectedCell({ rowId: targetRowId, colId: targetColId, rowIndex: targetRow, colIndex: targetCol })
          }
        }
      }

      // Arrow keys - navigate
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        navigateTo('up')
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        navigateTo('down')
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        navigateTo('left')
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        navigateTo('right')
      } else if (e.key === 'Tab') {
        e.preventDefault()
        navigateTo(e.shiftKey ? 'left' : 'right')
      } else if (e.key === 'Enter') {
        e.preventDefault()
        // Enter navigates down
        navigateTo('down')
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setSelectedCell(null)
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        // Copy
        e.preventDefault()
        const row = filteredData.find(r => (r._id ?? r.id) === rowId)
        if (row && column) {
          const valueToCopy = String(row[column.name] ?? '')
          navigator.clipboard.writeText(valueToCopy)
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        // Paste
        e.preventDefault()
        if (canEdit && column) {
          navigator.clipboard.readText().then(text => {
            handleCellChange(rowId, column.name, text)
          })
        }
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        // Clear cell
        e.preventDefault()
        if (canEdit && column) {
          handleCellChange(rowId, column.name, '')
        }
      } else if (e.key === 'F2') {
        // F2 - enter edit mode (click cell to trigger edit)
        e.preventDefault()
        const cellElement = document.querySelector(
          `[data-cell-row="${rowIndex}"][data-cell-col="${colIndex}"]`
        ) as HTMLElement
        if (cellElement) {
          cellElement.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
        }
      } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey && canEdit) {
        // Printable character - start editing with this character
        e.preventDefault()
        // Find the cell and trigger edit mode with the typed character
        const cellElement = document.querySelector(
          `[data-cell-row="${rowIndex}"][data-cell-col="${colIndex}"]`
        ) as HTMLElement
        if (cellElement) {
          // Set a data attribute to indicate we want to start with this character
          cellElement.dataset.startChar = e.key
          cellElement.dispatchEvent(new MouseEvent('dblclick', { bubbles: true }))
        }
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown)
  }, [selectedCell, activeSheet, filteredData, formulaSelectionMode, handleCellChange])

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
   * Generate table columns with inline editing support
   * When entity data source is enabled:
   * - Entity columns are read-only (from the data source)
   * - Custom spreadsheet columns are editable (user-added)
   */
  const tableColumns: ColumnDef<Record<string, unknown>>[] = useMemo(() => {
    if (!activeSheet) return []

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/9ea89aac-f844-4512-b6de-713c7440e93e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'SpreadsheetAppViewer.tsx:tableColumns:recompute',message:'Recomputing tableColumns',data:{sheetId:activeSheet.id,selectedCell:selectedCell?{rowId:selectedCell.rowId,colId:selectedCell.colId}:null,participantsCount:participants.length,participantsWithCursor:participants.filter(p=>p.cursor?.path?.length).length,isCollaborationConnected},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'R4'})}).catch(()=>{});
    // #endregion

    const cols: ColumnDef<Record<string, unknown>>[] = []

    // Add row number column (show row numbers)
    if (activeSheet.settings.showRowNumbers || (activeSheet.settings.allowAdd && _onAppUpdate)) {
      cols.push({
        id: 'row-number',
        header: () => <div className="gba:px-2 gba:py-1 gba:text-xs gba:text-muted-foreground gba:text-center">#</div>,
        cell: ({ row }: { row: Row<Record<string, unknown>> }) => (
          <div className="gba:px-2 gba:py-1 gba:text-xs gba:text-muted-foreground gba:text-center gba:select-none">
            {row.index + 1}
          </div>
        ),
        enableSorting: false,
        enableResizing: false,
        size: 50,
        minSize: 50,
        maxSize: 50
      })
    }

    // If entity data source is enabled, add entity columns first (read-only)
    if (activeSheet.entityDataSource?.enabled && activeSheet.entityDataSource.fieldMappings?.length > 0) {
      const entityFieldMappings = activeSheet.entityDataSource.fieldMappings.filter(m => m.include)

      console.log(
        '[SpreadsheetViewer] Adding entity columns:',
        entityFieldMappings.map(m => m.entityFieldLabel)
      )

      entityFieldMappings.forEach(mapping => {
        cols.push({
          id: `entity_${mapping.entityField}`,
          accessorFn: (row: Record<string, unknown>) => {
            // Try entity field first, then label
            return row[mapping.entityField] ?? row[mapping.entityFieldLabel]
          },
          header: () => (
            <div className="gba:flex gba:items-center gba:gap-1">
              <Database className="gba:w-3 gba:h-3 gba:text-info" />
              <span>{mapping.entityFieldLabel || mapping.entityField}</span>
            </div>
          ),
          cell: ({ row }: { row: Row<Record<string, unknown>> }) => {
            const value = row.original[mapping.entityField] ?? row.original[mapping.entityFieldLabel]

            // For entity data, display values directly (read-only)
            return (
              <div className="gba:px-2 gba:py-1.5 gba:bg-muted/30">
                {value === null || value === undefined ? (
                  <span className="gba:text-muted-foreground">—</span>
                ) : typeof value === 'boolean' ? (
                  value ? (
                    '✓'
                  ) : (
                    '✗'
                  )
                ) : typeof value === 'object' ? (
                  <span className="gba:text-muted-foreground gba:text-xs">{JSON.stringify(value)}</span>
                ) : (
                  String(value)
                )}
              </div>
            )
          }
        })
      })
    }

    // Add custom spreadsheet columns (editable)
    // Sort columns: tracking columns first, then regular columns (both by order)
    const visibleColumns = activeSheet.columns
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

    visibleColumns.forEach((col, idx) => {
      // IMPORTANT:
      // `colIndex` is used for Excel-like references (A1, B2, ...) and MUST NOT include the row-number column.
      // Therefore it starts at 0 for the first visible spreadsheet column.
      const colIndex = idx
      const isTrackingCol = col.isTracking || isTrackingColumn(col.name)

      cols.push({
        id: col.id,
        accessorFn: (row: Record<string, unknown>) => row[col.name],
        header: () => (
          <div
            className={`gba:flex gba:items-center gba:justify-between gba:w-full gba:group gba:px-2 gba:py-1 gba:rounded-sm ${
              isTrackingCol
                ? 'gba:bg-gradient-to-r gba:from-info/20 gba:to-info/5 gba:border-b-2 gba:border-info/40'
                : ''
            }`}
          >
            <div className="gba:flex gba:items-center gba:gap-1.5">
              {isTrackingCol && <Activity className="gba:w-3.5 gba:h-3.5 gba:text-info" />}
              {activeSheet.entityDataSource?.enabled && !isTrackingCol && (
                <Pencil className="gba:w-3 gba:h-3 gba:text-success" />
              )}
              <span
                className={
                  isTrackingCol ? 'gba:text-info gba:font-semibold gba:text-xs gba:uppercase gba:tracking-wide' : ''
                }
              >
                {col.label}
              </span>
            </div>
            {_onAppUpdate && activeSheet.columns.length > 1 && !isTrackingCol && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gba:h-5 gba:w-5 gba:p-0 gba:opacity-0 group-hover:gba:opacity-100"
                  >
                    <MoreVertical className="gba:w-3 gba:h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleDeleteColumn(col.id)} className="gba:text-destructive">
                    <Trash2 className="gba:w-4 gba:h-4 gba:mr-2" />
                    Delete Column
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        ),
        cell: ({ row }: { row: Row<Record<string, unknown>> }) => {
          const value = row.original[col.name]
          const rowId = (row.original._id ?? row.original.id ?? row.id) as string

          // Special rendering for avatar column (image type with tracking)
          if (col.type === 'image' && isTrackingCol) {
            const avatarUrl = normalizeImageSrc(value as string | undefined)
            return (
              <div
                className={`gba:px-2 gba:py-1 gba:flex gba:items-center gba:justify-center ${isTrackingCol ? 'gba:bg-muted/20' : ''}`}
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Avatar"
                    className="gba:w-8 gba:h-8 gba:rounded-full gba:object-cover gba:border gba:border-border"
                  />
                ) : (
                  <div className="gba:w-8 gba:h-8 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center">
                    <User className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                  </div>
                )}
              </div>
            )
          }

          // Tracking columns are read-only with subtle background
          if (isTrackingCol) {
            const displayValue =
              value !== undefined && value !== null && value !== ''
                ? col.type === 'datetime' && value
                  ? new Date(String(value)).toLocaleString()
                  : String(value)
                : '—'
            return <div className="gba:px-2 gba:py-1 gba:bg-muted/20 gba:text-sm">{displayValue}</div>
          }

          // Use EditableCell for inline editing like Excel
          return (
            <EditableCell
              value={value}
              column={col}
              rowId={rowId}
              rowIndex={row.index}
              colIndex={colIndex}
              onSave={handleCellChange}
              isEditable={activeSheet.settings.allowEdit && col.type !== 'calculated'}
              allRows={filteredData}
              columns={activeSheet.columns}
              onFormulaCellSelect={handleFormulaCellSelect}
              formulaSelectionMode={formulaSelectionMode}
              setFormulaSelectionMode={setFormulaSelectionMode}
              selectedCell={selectedCell}
              setSelectedCell={setSelectedCell}
              onFormulaValueChange={(value: string) => {
                currentFormulaValueRef.current = value
                setCurrentFormulaDisplay(value)
              }}
              formulaSelectedCells={formulaSelectedCells}
              onEditingStateChange={editing => {
                isEditingRef.current = editing
              }}
              participants={participants}
            />
          )
        }
      })
    })

    // Add "Add Column" button column (only if user can edit)
    if (_onAppUpdate) {
      cols.push({
        id: 'add-column',
        header: () => (
          <Button
            variant="ghost"
            size="sm"
            onClick={e => {
              e.stopPropagation()
              handleAddColumn()
            }}
            className="gba:h-8 gba:w-8 gba:p-0 gba:hover:bg-muted"
            title="Add Column"
            data-testid="add-column-header-button"
          >
            <Plus className="gba:w-4 gba:h-4" />
          </Button>
        ),
        cell: () => null, // Empty cell
        enableSorting: false,
        enableResizing: false
      })
    }

    // Add actions column
    if (activeSheet.settings.allowEdit || activeSheet.settings.allowDelete) {
      cols.push({
        id: 'actions',
        header: '',
        cell: ({ row }: { row: Row<Record<string, unknown>> }) => (
          <div className="gba:flex gba:items-center gba:gap-1">
            {activeSheet.settings.allowEdit && (
              <Button
                variant="ghost"
                size="sm"
                onClick={e => {
                  e.stopPropagation()
                  setEditingRow(row.original)
                }}
              >
                <Pencil className="gba:w-4 gba:h-4" />
              </Button>
            )}
            {activeSheet.settings.allowDelete && (
              <Button
                variant="ghost"
                size="sm"
                onClick={e => {
                  e.stopPropagation()
                  handleDeleteRow(row.original._id as string)
                }}
              >
                <Trash2 className="gba:w-4 gba:h-4 gba:text-destructive" />
              </Button>
            )}
          </div>
        )
      })
    }

    return cols
  }, [
    activeSheet,
    handleDeleteRow,
    handleCellChange,
    filteredData,
    handleFormulaCellSelect,
    formulaSelectionMode,
    selectedCell,
    setSelectedCell
  ])

  if (!activeSheet) {
    return (
      <Card className="gba:p-8 gba:text-center">
        <p className="gba:text-muted-foreground">No sheets available</p>
      </Card>
    )
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid={testId}>
      {/* Header */}
      <div className="gba:border-b gba:bg-card">
        <div className="gba:px-6 gba:py-4">
          <div className="gba:flex gba:items-center gba:justify-between">
            <div className="gba:flex gba:items-center gba:gap-4">
              {onBack && (
                <Button variant="ghost" size="sm" onClick={onBack}>
                  <ChevronLeft className="gba:w-4 gba:h-4 gba:mr-1" />
                  Back
                </Button>
              )}
              <div className="gba:flex gba:items-center gba:gap-3">
                <div className="gba:w-10 gba:h-10 gba:rounded-xl gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
                  {(() => {
                    const IconComponent = app.icon ? getIconByName(app.icon) : null
                    return IconComponent ? (
                      <IconComponent className="gba:w-5 gba:h-5 gba:text-primary" />
                    ) : (
                      <DEFAULT_APP_ICON className="gba:w-5 gba:h-5 gba:text-primary" />
                    )
                  })()}
                </div>
                <div>
                  <h1 className="gba:text-xl gba:font-semibold gba:text-foreground">{app.name}</h1>
                  {app.description && <p className="gba:text-sm gba:text-muted-foreground">{app.description}</p>}
                </div>
              </div>
            </div>

            <div className="gba:flex gba:items-center gba:gap-2">
              {/* Collaboration presence indicator */}
              {participants.length > 0 && (
                <PresenceIndicator participants={participants} maxVisible={3} size="md" showLabel={true} />
              )}

              {/* Entity data source indicator */}
              {activeSheet?.entityDataSource?.enabled && (
                <>
                  <Badge variant="info" className="gba:gap-1">
                    <Database className="gba:w-3 gba:h-3" />
                    {activeSheet.entityDataSource.entityDisplayName}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={handleRefreshEntityData} disabled={isEntityDataLoading}>
                    {isEntityDataLoading ? (
                      <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
                    ) : (
                      <RefreshCw className="gba:w-4 gba:h-4" />
                    )}
                  </Button>
                </>
              )}
              <Button
                variant={isAutomationsOpen ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsAutomationsOpen(!isAutomationsOpen)}
                data-testid={`${testId}-automations-button`}
              >
                <Workflow className="gba:w-4 gba:h-4 gba:mr-2" />
                Automations
              </Button>
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Settings className="gba:w-4 gba:h-4 gba:mr-2" />
                  Settings
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Automations Panel - Rendered via Portal to appear above platform header */}
        {isAutomationsOpen &&
          createPortal(
            <div className="gba:fixed gba:inset-0" style={{ zIndex: 999999 }}>
              {/* Backdrop overlay */}
              <div
                className="gba:absolute gba:inset-0 gba:bg-black/20 gba:backdrop-blur-sm"
                onClick={() => setIsAutomationsOpen(false)}
                style={{ zIndex: 999999 }}
              />
              {/* Drawer panel */}
              <div
                className="gba:absolute gba:top-0 gba:right-0 gba:bottom-0 gba:w-[540px] gba:bg-background gba:border-l gba:shadow-2xl gba:overflow-hidden gba:flex gba:flex-col"
                style={{ zIndex: 1000000 }}
              >
                <div className="gba:flex gba:items-center gba:justify-between gba:px-6 gba:py-4 gba:border-b gba:bg-muted/30">
                  <h2 className="gba:text-lg gba:font-semibold">Automations</h2>
                  <Button variant="ghost" size="sm" onClick={() => setIsAutomationsOpen(false)}>
                    <X className="gba:w-4 gba:h-4" />
                  </Button>
                </div>
                <div className="gba:flex-1 gba:overflow-auto gba:p-6">
                  <AutomationsHub
                    automations={automations}
                    executionHistory={executionHistory}
                    workflowLinks={workflowLinks}
                    isLoading={isAutomationsLoading}
                    onCreateAutomation={() => {
                      setEditingAutomation(null)
                      setIsAutomationWizardOpen(true)
                    }}
                    onEditAutomation={automation => {
                      setEditingAutomation(automation)
                      setIsAutomationWizardOpen(true)
                    }}
                    onDeleteAutomation={async id => {
                      await deleteAutomation(id)
                    }}
                    onToggleAutomation={toggleAutomation}
                    onDuplicateAutomation={async id => {
                      await duplicateAutomation(id)
                    }}
                    onRunAutomation={async id => {
                      // Pass all rows with their data to run automation
                      // Map sheet data to expected format: { id, cells }
                      const rows = activeSheet.data.map(row => ({
                        id: String(row._id || row.id || ''),
                        cells: row
                      }))
                      await runAutomation(id, rows)
                    }}
                    onRefresh={refreshWorkflowStatuses}
                    data-testid={`${testId}-automations-hub`}
                  />
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* Automation Wizard Dialog */}
        <AutomationWizard
          isOpen={isAutomationWizardOpen}
          onClose={() => {
            setIsAutomationWizardOpen(false)
            setEditingAutomation(null)
          }}
          columns={activeSheet.columns}
          existingAutomation={editingAutomation ?? undefined}
          accessToken={accessToken}
          onSave={async automation => {
            if (editingAutomation) {
              await updateAutomation(editingAutomation.id, automation)
            } else {
              await createAutomation(automation)
            }
            setIsAutomationWizardOpen(false)
            setEditingAutomation(null)
          }}
          spreadsheetId={app.id}
          sheetId={activeSheetId}
          data-testid={`${testId}-automation-wizard`}
        />

        {/* Sheet tabs */}
        {app.sheets.length > 1 && (
          <div className="gba:px-6 gba:border-t">
            <div className="gba:flex gba:items-center gba:gap-1 gba:py-2">
              {app.sheets.map(sheet => {
                const isActive = sheet.id === activeSheetId
                const hasEntitySource = sheet.entityDataSource?.enabled
                const dataCount = isActive && hasEntitySource ? entityData.length : sheet.data.length

                return (
                  <button
                    key={sheet.id}
                    type="button"
                    className={`gba:px-4 gba:py-2 gba:text-sm gba:rounded-lg gba:transition-colors ${
                      isActive
                        ? 'gba:bg-primary/10 gba:text-primary gba:font-medium'
                        : 'gba:text-muted-foreground gba:hover:bg-muted/50'
                    }`}
                    onClick={() => setActiveSheetId(sheet.id)}
                  >
                    {hasEntitySource ? (
                      <Database className="gba:w-4 gba:h-4 gba:inline gba:mr-2" />
                    ) : (
                      <Layers className="gba:w-4 gba:h-4 gba:inline gba:mr-2" />
                    )}
                    {sheet.name}
                    <Badge variant="outline" className="gba:ml-2 gba:text-xs">
                      {dataCount}
                    </Badge>
                  </button>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Formula Bar - Excel-like display */}
      <div className="gba:px-6 gba:py-2 gba:border-b gba:bg-muted/20" data-testid="spreadsheet-viewer-formula-bar">
        <div className="gba:flex gba:items-center gba:gap-3">
          {/* Cell reference indicator */}
          {selectedCell && (
            <div className="gba:min-w-[60px] gba:px-2 gba:py-1 gba:bg-background gba:border gba:rounded gba:text-sm gba:font-mono gba:text-center">
              {columnIndexToLetter(selectedCell.colIndex)}
              {selectedCell.rowIndex + 1}
            </div>
          )}

          {/* Formula/Value input - editable like Excel */}
          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:bg-background gba:border gba:rounded gba:px-3 gba:min-h-[36px]">
            <span className="gba:font-mono gba:text-sm gba:text-muted-foreground">fx</span>
            {selectedCell ? (
              <input
                type="text"
                ref={formulaBarInputRef}
                className="gba:flex-1 gba:font-mono gba:text-sm gba:bg-transparent gba:border-none gba:outline-none gba:text-foreground"
                placeholder="Enter value or formula (start with =)"
                data-testid="spreadsheet-viewer-formula-bar-input"
                value={(() => {
                  // If we're actively editing (not null), show the edit value (even if empty)
                  if (currentFormulaDisplay !== null) {
                    return currentFormulaDisplay
                  }
                  // Otherwise show the stored formula or value from the cell
                  const row = filteredData.find(r => (r._id ?? r.id) === selectedCell.rowId)
                  const column = activeSheet?.columns.find(c => c.id === selectedCell.colId)
                  if (row && column) {
                    const formulas = row._formulas as Record<string, string> | undefined
                    const storedFormula = formulas?.[column.name]
                    if (storedFormula) return storedFormula
                    const value = row[column.name]
                    return value !== null && value !== undefined ? String(value) : ''
                  }
                  return ''
                })()}
                onChange={e => {
                  const newValue = e.target.value
                  // Update formula display
                  currentFormulaValueRef.current = newValue
                  setCurrentFormulaDisplay(newValue)

                  // Enter formula mode if starting with =
                  if (newValue.trim().startsWith('=') && !formulaSelectionMode) {
                    setFormulaSelectionMode({
                      editingCell: { rowId: selectedCell.rowId, colId: selectedCell.colId },
                      startCell: null,
                      endCell: null,
                      isRangeSelection: false
                    })
                  } else if (!newValue.trim().startsWith('=') && formulaSelectionMode) {
                    // Exit formula mode if not a formula anymore
                    setFormulaSelectionMode(null)
                  }

                  // Keep the currently edited cell input in sync if it exists.
                  // This is important so the user can type in the formula bar while in formula selection mode.
                  const editingCell = formulaSelectionMode?.editingCell ?? {
                    rowId: selectedCell.rowId,
                    colId: selectedCell.colId
                  }
                  const activeCellElement = document.querySelector(
                    `[data-cell-rowid="${editingCell.rowId}"][data-cell-colid="${editingCell.colId}"] input`
                  ) as HTMLInputElement | null

                  if (activeCellElement && activeCellElement.value !== newValue) {
                    activeCellElement.value = newValue
                    activeCellElement.dispatchEvent(new Event('input', { bubbles: true }))
                  }
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const value = e.currentTarget.value
                    const column = activeSheet?.columns.find(c => c.id === selectedCell.colId)
                    if (column) {
                      // Auto-close parentheses for formulas
                      let finalValue = value
                      if (value.trim().startsWith('=')) {
                        const openParens = (value.match(/\(/g) || []).length
                        const closeParens = (value.match(/\)/g) || []).length
                        if (openParens > closeParens) {
                          finalValue = value + ')'.repeat(openParens - closeParens)
                        }
                      }
                      handleCellChange(selectedCell.rowId, column.name, finalValue)
                    }
                    currentFormulaValueRef.current = ''
                    setCurrentFormulaDisplay(null)
                    setFormulaSelectionMode(null)
                    // Move to next row
                    const nextRowIndex = selectedCell.rowIndex + 1
                    if (nextRowIndex < filteredData.length) {
                      const nextRow = filteredData[nextRowIndex]
                      const nextRowId = (nextRow._id ?? nextRow.id) as string
                      setSelectedCell({
                        rowId: nextRowId,
                        colId: selectedCell.colId,
                        rowIndex: nextRowIndex,
                        colIndex: selectedCell.colIndex
                      })
                    }
                  } else if (e.key === 'Escape') {
                    e.preventDefault()
                    currentFormulaValueRef.current = ''
                    setCurrentFormulaDisplay(null)
                    setFormulaSelectionMode(null)
                  }
                }}
                onFocus={() => {
                  // When we're already in formula selection mode (or actively editing),
                  // do NOT overwrite the in-progress formula/value. This input is
                  // programmatically focused while the user clicks cells to insert refs.
                  if (formulaSelectionMode || currentFormulaDisplay !== null) {
                    return
                  }

                  // When focusing the formula bar, load the current cell's formula/value for editing
                  const row = filteredData.find(r => (r._id ?? r.id) === selectedCell.rowId)
                  const column = activeSheet?.columns.find(c => c.id === selectedCell.colId)
                  if (row && column) {
                    const formulas = row._formulas as Record<string, string> | undefined
                    const storedFormula = formulas?.[column.name]
                    if (storedFormula) {
                      // Cell has a formula - load it and enter formula mode
                      currentFormulaValueRef.current = storedFormula
                      setCurrentFormulaDisplay(storedFormula)
                      setFormulaSelectionMode({
                        editingCell: { rowId: selectedCell.rowId, colId: selectedCell.colId },
                        startCell: null,
                        endCell: null,
                        isRangeSelection: false
                      })
                    } else {
                      // Cell has regular value - load it for editing (no formula mode)
                      const value = row[column.name]
                      const valueStr = value !== null && value !== undefined ? String(value) : ''
                      currentFormulaValueRef.current = valueStr
                      setCurrentFormulaDisplay(valueStr)
                    }
                  }
                }}
              />
            ) : (
              <span className="gba:flex-1 gba:font-mono gba:text-sm gba:text-muted-foreground">Select a cell</span>
            )}
          </div>

          {/* Formula functions - show when cell is selected and not in formula mode */}
          {selectedCell && !formulaSelectionMode && (
            <div className="gba:flex gba:items-center gba:gap-1">
              {[
                { name: 'SUM', desc: 'Add values', icon: '∑' },
                { name: 'AVERAGE', desc: 'Average', icon: 'x̄' },
                { name: 'COUNT', desc: 'Count', icon: '#' },
                { name: 'MIN', desc: 'Min', icon: '↓' },
                { name: 'MAX', desc: 'Max', icon: '↑' }
              ].map(fn => (
                <Button
                  key={fn.name}
                  variant="outline"
                  size="sm"
                  className="gba:h-8 gba:px-2 gba:text-xs gba:font-mono"
                  title={`${fn.name}: ${fn.desc}`}
                  onClick={() => {
                    const formula = `=${fn.name}(`

                    // Start editing directly in the formula bar (no need to focus a cell input).
                    currentFormulaValueRef.current = formula
                    setCurrentFormulaDisplay(formula)
                    setFormulaSelectionMode({
                      editingCell: { rowId: selectedCell.rowId, colId: selectedCell.colId },
                      startCell: null,
                      endCell: null,
                      isRangeSelection: false
                    })

                    requestAnimationFrame(() => {
                      const input = formulaBarInputRef.current
                      if (!input) return
                      input.focus()
                      input.setSelectionRange(formula.length, formula.length)
                    })
                  }}
                >
                  <span className="gba:mr-1">{fn.icon}</span>
                  {fn.name}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Formula mode hint */}
        {formulaSelectionMode && (
          <div className="gba:mt-2 gba:text-xs gba:text-primary gba:flex gba:items-center gba:gap-2">
            <Badge variant="info" className="gba:text-xs">
              Formula Mode
            </Badge>
            <span>Click cells to add references • Shift+Click for range • Enter to save • Escape to cancel</span>
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="gba:px-6 gba:py-2 gba:border-b gba:bg-muted/30">
        <div className="gba:flex gba:items-center gba:justify-between">
          {/* View switcher */}
          <div className="gba:flex gba:items-center gba:gap-2">
            {activeSheet.views.map(view => {
              const ViewIcon = getViewIcon(view.type)
              const isActive = view.id === (activeView?.id || activeSheet.views[0]?.id)
              return (
                <Button
                  key={view.id}
                  variant={isActive ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setActiveViewId(view.id)}
                >
                  <ViewIcon className="gba:w-4 gba:h-4 gba:mr-2" />
                  {view.name}
                </Button>
              )
            })}
          </div>

          {/* Actions */}
          <div className="gba:flex gba:items-center gba:gap-2">
            <div className="gba:relative">
              <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:-translate-y-1/2 gba:w-4 gba:h-4 gba:text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="gba:pl-10 gba:w-64"
              />
            </div>

            {_onAppUpdate && (
              <Button variant="outline" onClick={handleAddColumn}>
                <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                Add Column
              </Button>
            )}

            {activeSheet.settings.allowAdd && (
              <Button onClick={handleAddRow}>
                <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                Add Row
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="gba:w-4 gba:h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {_onAppUpdate && (
                  <DropdownMenuItem onClick={() => setIsManageColumnsDialogOpen(true)}>
                    <Columns className="gba:w-4 gba:h-4 gba:mr-2" />
                    Manage Columns
                  </DropdownMenuItem>
                )}
                {activeSheet.settings.allowExport && (
                  <DropdownMenuItem>
                    <Download className="gba:w-4 gba:h-4 gba:mr-2" />
                    Export to Excel
                  </DropdownMenuItem>
                )}
                {activeSheet.settings.allowImport && (
                  <DropdownMenuItem>
                    <Upload className="gba:w-4 gba:h-4 gba:mr-2" />
                    Import Data
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem>
                  <Filter className="gba:w-4 gba:h-4 gba:mr-2" />
                  Advanced Filters
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      {/* Entity data loading/error/success state */}
      {activeSheet?.entityDataSource?.enabled && (
        <div className="gba:px-6 gba:py-2 gba:border-b gba:bg-info/5">
          {isEntityDataLoading && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
              <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
              Loading data from {activeSheet.entityDataSource.entityDisplayName}...
            </div>
          )}
          {entityDataError && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-destructive">
              <AlertCircle className="gba:w-4 gba:h-4" />
              {entityDataError}
              <Button variant="link" size="sm" onClick={handleRefreshEntityData} className="gba:p-0 gba:h-auto">
                Retry
              </Button>
            </div>
          )}
          {!isEntityDataLoading && !entityDataError && entityData.length > 0 && (
            <div className="gba:flex gba:items-center gba:justify-between">
              <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
                <Database className="gba:w-4 gba:h-4 gba:text-info" />
                <span className="gba:text-foreground">
                  <strong>{entityData.length}</strong> records loaded from{' '}
                  <strong>{activeSheet.entityDataSource.entityDisplayName}</strong>
                </span>
                <Badge variant="info" className="gba:text-xs">
                  Live Data
                </Badge>
              </div>
              <div className="gba:flex gba:items-center gba:gap-2">
                <Button variant="outline" size="sm" onClick={handleRefreshEntityData}>
                  <RefreshCw className="gba:w-3 gba:h-3 gba:mr-1" />
                  Refresh
                </Button>
              </div>
            </div>
          )}
          {!isEntityDataLoading && !entityDataError && entityData.length === 0 && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground">
              <AlertCircle className="gba:w-4 gba:h-4" />
              No records found matching your filters
              <Button variant="link" size="sm" onClick={onEdit} className="gba:p-0 gba:h-auto">
                Edit filters
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="gba:flex-1 gba:flex gba:flex-col gba:overflow-hidden">
        {activeView?.type === 'table' ? (
          <div className="gba:flex-1 gba:flex gba:flex-col gba:overflow-hidden gba:p-6">
            <TableView
              data={filteredData}
              columns={tableColumns}
              testId={`${testId}-table`}
              onAddRow={activeSheet.settings.allowAdd ? handleAddRow : undefined}
              showAddRow={activeSheet.settings.allowAdd && !!_onAppUpdate}
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

      {/* Edit Row Dialog */}
      <Dialog open={!!editingRow} onOpenChange={() => setEditingRow(null)}>
        <DialogContent className="gba:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Row</DialogTitle>
          </DialogHeader>
          {editingRow && (
            <DynamicFormGenerator
              schema={formFields}
              initialValues={editingRow}
              onSubmit={handleUpdateRow}
              submitButtonText="Save Changes"
              showCard={false}
              accessToken={accessToken}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Manage Columns Dialog */}
      <Dialog
        open={isManageColumnsDialogOpen}
        onOpenChange={open => {
          if (open) {
            // Initialize editing columns when opening dialog
            setEditingColumns(activeSheet.columns.map(c => ({ ...c })))
          } else {
            // Reset to original columns when closing without saving
            setEditingColumns([])
          }
          setIsManageColumnsDialogOpen(open)
        }}
      >
        <DialogContent className="gba:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="gba:flex gba:items-center gba:gap-2">
              <Columns className="gba:w-5 gba:h-5" />
              Manage Columns
            </DialogTitle>
          </DialogHeader>
          <div className="gba:space-y-3 gba:max-h-[500px] gba:overflow-y-auto">
            {(() => {
              // Initialize editing columns when dialog opens
              const columnsToEdit =
                editingColumns.length > 0 ? editingColumns : activeSheet.columns.length > 0 ? activeSheet.columns : []

              if (columnsToEdit.length === 0) {
                return (
                  <p className="gba:text-muted-foreground gba:text-center gba:py-4">
                    No custom columns. Click "Add Column" to create one.
                  </p>
                )
              }

              return columnsToEdit.map(column => {
                const updateColumnField = (field: keyof SpreadsheetColumn, value: unknown) => {
                  setEditingColumns(prev =>
                    prev.length > 0
                      ? prev.map(c => (c.id === column.id ? { ...c, [field]: value } : c))
                      : activeSheet.columns.map(c => (c.id === column.id ? { ...c, [field]: value } : c))
                  )
                }

                return (
                  <Card key={column.id} className="gba:p-4">
                    <div className="gba:space-y-4">
                      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4">
                        <div className="gba:space-y-2">
                          <Label htmlFor={`column-label-${column.id}`}>Column Name</Label>
                          <Input
                            id={`column-label-${column.id}`}
                            value={column.label}
                            onChange={e => updateColumnField('label', e.target.value)}
                            placeholder="Column name"
                          />
                        </div>
                        <div className="gba:space-y-2">
                          <Label htmlFor={`column-type-${column.id}`}>Data Type</Label>
                          <Select
                            value={column.type}
                            onValueChange={(value: ColumnType) => updateColumnField('type', value)}
                          >
                            <SelectTrigger id={`column-type-${column.id}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="currency">Currency</SelectItem>
                              <SelectItem value="percentage">Percentage</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                              <SelectItem value="datetime">Date & Time</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="phone">Phone</SelectItem>
                              <SelectItem value="url">URL</SelectItem>
                              <SelectItem value="select">Single Select</SelectItem>
                              <SelectItem value="multiselect">Multi Select</SelectItem>
                              <SelectItem value="boolean">Checkbox</SelectItem>
                              <SelectItem value="calculated">Calculated</SelectItem>
                              <SelectItem value="reference">Reference</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="gba:flex gba:items-center gba:justify-between gba:pt-2 gba:border-t">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Badge variant="secondary" className="gba:text-xs">
                            {column.name}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => updateColumnField('isVisible', !column.isVisible)}
                            className="gba:text-xs"
                          >
                            {column.isVisible ? (
                              <>
                                <Eye className="gba:w-3 gba:h-3 gba:mr-1" />
                                Visible
                              </>
                            ) : (
                              <>
                                <EyeOff className="gba:w-3 gba:h-3 gba:mr-1" />
                                Hidden
                              </>
                            )}
                          </Button>
                        </div>
                        {columnsToEdit.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingColumns(prev =>
                                prev.length > 0
                                  ? prev.filter(c => c.id !== column.id)
                                  : activeSheet.columns.filter(c => c.id !== column.id)
                              )
                            }}
                            className="gba:text-destructive hover:gba:text-destructive"
                          >
                            <Trash2 className="gba:w-4 gba:h-4 gba:mr-1" />
                            Delete
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })
            })()}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEditingColumns([])
                setIsManageColumnsDialogOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsManageColumnsDialogOpen(false)
                handleAddColumn()
              }}
            >
              <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
              Add Column
            </Button>
            <Button
              onClick={() => {
                // Save all changes
                const finalColumns = editingColumns.length > 0 ? editingColumns : activeSheet.columns
                const updatedSheets = app.sheets.map(sheet =>
                  sheet.id === activeSheet.id
                    ? {
                        ...sheet,
                        // Preserve latest local data to prevent stale overwrites when column config saves race with row updates
                        data: localSheetDataRef.current,
                        columns: finalColumns
                      }
                    : sheet
                )
                _onAppUpdate?.({ ...app, sheets: updatedSheets })

                // Emit WebSocket operation when collaboration is active
                if (isCollaborationConnected) {
                  emitOperation({
                    type: 'column_update',
                    data: {
                      sheetId: activeSheet.id,
                      columns: finalColumns
                    }
                  })
                }

                setEditingColumns([])
                setIsManageColumnsDialogOpen(false)
              }}
            >
              <Save className="gba:w-4 gba:h-4 gba:mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

type ActiveEditCell = { rowId: string; colId: string } | null
type FormulaSelectionMode = {
  editingCell: { rowId: string; colId: string }
  startCell: { rowIndex: number; colIndex: number } | null
  endCell: { rowIndex: number; colIndex: number } | null
  isRangeSelection: boolean
} | null

// Global state to keep the currently edited cell stable across table re-renders/remounts.
// IMPORTANT: We intentionally keep this around (do NOT clear when starting edit),
// so a re-render doesn't make the input lose focus / exit edit mode.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
let activeEditCell: ActiveEditCell = null

/**
 * Editable Cell Component - Excel-like behavior
 * Single click = select, Double click = edit, Type when selected = replace
 */
interface EditableCellProps {
  value: unknown
  column: SpreadsheetColumn
  rowId: string
  rowIndex: number
  colIndex: number
  onSave: (rowId: string, columnName: string, value: unknown) => void
  isEditable: boolean
  allRows: Record<string, unknown>[]
  columns: SpreadsheetColumn[]
  onFormulaCellSelect?: (rowIndex: number, colIndex: number, isRangeEnd?: boolean) => void
  formulaSelectionMode: FormulaSelectionMode
  setFormulaSelectionMode: (mode: FormulaSelectionMode) => void
  selectedCell: { rowId: string; colId: string; rowIndex: number; colIndex: number } | null
  setSelectedCell: (cell: { rowId: string; colId: string; rowIndex: number; colIndex: number } | null) => void
  onFormulaValueChange?: (value: string) => void
  formulaSelectedCells: Array<{ rowIndex: number; colIndex: number }>
  onEditingStateChange?: (isEditing: boolean) => void
  participants?: import('../shared/services/CollaborationClient').DocumentParticipant[]
}

const EditableCell: React.FC<EditableCellProps> = ({
  value,
  column,
  rowId,
  rowIndex,
  colIndex,
  onSave,
  isEditable,
  allRows,
  onFormulaCellSelect,
  formulaSelectionMode,
  setFormulaSelectionMode,
  selectedCell,
  setSelectedCell,
  onFormulaValueChange,
  formulaSelectedCells,
  onEditingStateChange,
  participants = []
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [originalValue, setOriginalValue] = useState<string>('')
  const [editValue, setEditValue] = useState('')

  // Notify parent when editing state changes
  useEffect(() => {
    onEditingStateChange?.(isEditing)
  }, [isEditing, onEditingStateChange])

  // Get the row to check for stored formulas
  const currentRow = allRows.find(r => r._id === rowId || r.id === rowId)
  const formulas = currentRow?._formulas as Record<string, string> | undefined
  const storedFormula = formulas?.[column.name]
  const hasFormula = Boolean(storedFormula)

  const inputRef = React.useRef<HTMLInputElement>(null)
  const cellRef = React.useRef<HTMLDivElement>(null)
  const isCommittingRef = React.useRef(false)
  // Track if editing started from typing (vs double-click)
  const startedFromTypingRef = React.useRef(false)

  // Check if this cell is selected (but not editing)
  const isSelected = selectedCell?.rowId === rowId && selectedCell?.colId === column.id

  // Focus the cell when it becomes selected (for keyboard events)
  useEffect(() => {
    if (isSelected && !isEditing && cellRef.current) {
      // Use setTimeout to ensure DOM is updated
      setTimeout(() => {
        cellRef.current?.focus()
      }, 0)
    }
  }, [isSelected, isEditing])

  // Check if we're in formula selection mode (this is the cell being edited)
  const isInFormulaMode =
    formulaSelectionMode !== null &&
    formulaSelectionMode.editingCell.rowId === rowId &&
    formulaSelectionMode.editingCell.colId === column.id

  const canEdit = isEditable && column.isEditable

  // Focus input when editing starts
  React.useLayoutEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      // Only select all if started from double-click, not from typing
      if (startedFromTypingRef.current) {
        // Position cursor at end - use setTimeout to ensure it happens after browser's default focus behavior
        setTimeout(() => {
          if (inputRef.current) {
            const len = inputRef.current.value.length
            inputRef.current.setSelectionRange(len, len)
          }
        }, 0)
        startedFromTypingRef.current = false
      } else {
        inputRef.current.select()
      }
    }
  }, [isEditing])

  // Handle selection click (single click)
  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation()

    // If in formula selection mode, handle that instead
    if (formulaSelectionMode && !isInFormulaMode) {
      if (onFormulaCellSelect) {
        onFormulaCellSelect(rowIndex, colIndex, e.shiftKey)
      }
      return
    }

    // Select this cell
    setSelectedCell({ rowId, colId: column.id, rowIndex, colIndex })

    // Focus the cell div so it can receive keyboard events
    cellRef.current?.focus()
  }

  // Handle double click to enter edit mode
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!canEdit) return

    // Check if there's a startChar from keyboard typing or formula button
    const startChar = cellRef.current?.dataset.startChar
    if (startChar) {
      // Clear the attribute
      delete cellRef.current.dataset.startChar
      // Mark that we started from typing (not double-click)
      startedFromTypingRef.current = true
      // Start editing with the typed character/formula
      setOriginalValue(storedFormula || String(value ?? ''))
      setEditValue(startChar)
      setIsEditing(true)
      activeEditCell = { rowId, colId: column.id }

      // If it's a formula, enter formula selection mode and store the value
      if (startChar.trim().startsWith('=')) {
        if (onFormulaValueChange) {
          onFormulaValueChange(startChar)
        }
        setFormulaSelectionMode({
          editingCell: { rowId, colId: column.id },
          startCell: null,
          endCell: null,
          isRangeSelection: false
        })
      }
    } else {
      startEditing(false) // false = don't clear content
    }
  }

  // Start editing - optionally clear content (when typing while selected)
  const startEditing = (clearContent: boolean = false) => {
    if (!canEdit) return

    const initialValue = clearContent ? '' : storedFormula || String(value ?? '')
    setOriginalValue(storedFormula || String(value ?? ''))
    setEditValue(initialValue)
    setIsEditing(true)
    activeEditCell = { rowId, colId: column.id }
  }

  // Save the cell value
  const handleSave = () => {
    if (isCommittingRef.current) return
    isCommittingRef.current = true

    let convertedValue: unknown = editValue

    if (isFormula(editValue)) {
      convertedValue = editValue
    } else if (column.type === 'number' || column.type === 'currency' || column.type === 'percentage') {
      convertedValue = editValue === '' ? null : Number(editValue)
    } else if (column.type === 'boolean') {
      convertedValue = editValue.toLowerCase() === 'true' || editValue === '1'
    }

    onSave(rowId, column.name, convertedValue)
    setIsEditing(false)
    activeEditCell = null

    setTimeout(() => {
      isCommittingRef.current = false
    }, 0)
  }

  // Navigate to adjacent cell
  const navigateToCell = (direction: 'up' | 'down' | 'left' | 'right') => {
    let targetRow = rowIndex
    let targetCol = colIndex

    switch (direction) {
      case 'up':
        targetRow = Math.max(0, rowIndex - 1)
        break
      case 'down':
        targetRow = rowIndex + 1
        break
      case 'left':
        targetCol = Math.max(0, colIndex - 1)
        break
      case 'right':
        targetCol = colIndex + 1
        break
    }

    const targetCell = document.querySelector(
      `[data-cell-row="${targetRow}"][data-cell-col="${targetCol}"]`
    ) as HTMLElement

    if (targetCell) {
      const targetRowId = targetCell.dataset.cellRowid
      const targetColId = targetCell.dataset.cellColid
      if (targetRowId && targetColId) {
        setSelectedCell({ rowId: targetRowId, colId: targetColId, rowIndex: targetRow, colIndex: targetCol })
        targetCell.focus()
      }
    }
  }

  // Handle keyboard events when cell is selected (not editing)
  const handleCellKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (isEditing) return

    // Arrow keys - navigate
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      navigateToCell('up')
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      navigateToCell('down')
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault()
      navigateToCell('left')
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      navigateToCell('right')
    } else if (e.key === 'Tab') {
      e.preventDefault()
      navigateToCell(e.shiftKey ? 'left' : 'right')
    } else if (e.key === 'Enter') {
      // Enter - start editing (like F2)
      e.preventDefault()
      if (canEdit) startEditing(false)
    } else if (e.key === 'F2') {
      // F2 - edit mode
      e.preventDefault()
      if (canEdit) startEditing(false)
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      // Delete/Backspace - clear cell
      e.preventDefault()
      if (canEdit) {
        onSave(rowId, column.name, '')
      }
    } else if (e.key === 'Escape') {
      // Escape - deselect
      e.preventDefault()
      setSelectedCell(null)
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
      // Ctrl+C - copy
      e.preventDefault()
      const textToCopy = String(value ?? '')
      navigator.clipboard.writeText(textToCopy)
    } else if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
      // Ctrl+V - paste
      e.preventDefault()
      if (canEdit) {
        navigator.clipboard.readText().then(text => {
          onSave(rowId, column.name, text)
        })
      }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      // Any printable character - start editing and replace content
      if (canEdit) {
        e.preventDefault()
        // Mark that we started from typing (so cursor goes to end, not select all)
        startedFromTypingRef.current = true
        setOriginalValue(storedFormula || String(value ?? ''))
        setEditValue(e.key)
        setIsEditing(true)
        activeEditCell = { rowId, colId: column.id }
      }
    }
  }

  // Handle keyboard events when editing
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    const isFormulaInput = editValue.trim().startsWith('=')

    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
      if (isFormulaInput && formulaSelectionMode) {
        setFormulaSelectionMode(null)
      }
      handleSave()
      // Move to next row after save
      setTimeout(() => navigateToCell('down'), 0)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      setFormulaSelectionMode(null)
      setEditValue(originalValue)
      setIsEditing(false)
      activeEditCell = null
      // Keep cell selected
      cellRef.current?.focus()
    } else if (e.key === 'Tab') {
      e.preventDefault()
      e.stopPropagation()
      handleSave()
      setTimeout(() => navigateToCell(e.shiftKey ? 'left' : 'right'), 0)
    } else if (e.key === 'ArrowUp') {
      // Arrow up - save and navigate up
      e.preventDefault()
      e.stopPropagation()
      handleSave()
      setTimeout(() => navigateToCell('up'), 0)
    } else if (e.key === 'ArrowDown') {
      // Arrow down - save and navigate down
      e.preventDefault()
      e.stopPropagation()
      handleSave()
      setTimeout(() => navigateToCell('down'), 0)
    } else if (e.key === 'ArrowLeft') {
      // Only navigate if cursor is at the beginning
      const input = e.target as HTMLInputElement
      if (input.selectionStart === 0 && input.selectionEnd === 0) {
        e.preventDefault()
        e.stopPropagation()
        handleSave()
        setTimeout(() => navigateToCell('left'), 0)
      }
    } else if (e.key === 'ArrowRight') {
      // Only navigate if cursor is at the end
      const input = e.target as HTMLInputElement
      if (input.selectionStart === input.value.length) {
        e.preventDefault()
        e.stopPropagation()
        handleSave()
        setTimeout(() => navigateToCell('right'), 0)
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleBlur = (_e: React.FocusEvent<HTMLInputElement>) => {
    if (isCommittingRef.current) return

    // Don't save if in formula mode (clicking other cells)
    if (formulaSelectionMode && isInFormulaMode) {
      // Keep edit session open, but NEVER steal focus back.
      // Formula mode should be driven from the formula bar input.
      return
    }

    handleSave()
  }

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setEditValue(newValue)

    // Update the formula value at viewer level for formula mode
    if (newValue.trim().startsWith('=') && onFormulaValueChange) {
      onFormulaValueChange(newValue)
    }

    if (newValue.trim().startsWith('=') && !formulaSelectionMode) {
      setFormulaSelectionMode({
        editingCell: { rowId, colId: column.id },
        startCell: null,
        endCell: null,
        isRangeSelection: false
      })
    } else if (!newValue.trim().startsWith('=') && formulaSelectionMode && isInFormulaMode) {
      setFormulaSelectionMode(null)
    }
  }

  // Check if this cell is selected in formula mode (for highlighting)
  // Use the formulaSelectedCells array to highlight ALL selected cells
  const isSelectedInFormula =
    formulaSelectionMode !== null &&
    !isInFormulaMode &&
    formulaSelectedCells.some(cell => cell.rowIndex === rowIndex && cell.colIndex === colIndex)

  // Check if another user is editing this cell
  const collaboratorEditingCell = useMemo(() => {
    const found = participants.find(p => {
      const path = p.cursor?.path
      if (!path || path.length < 3) return false
      const [, cursorRowId, cursorColId] = path
      const matches = cursorRowId === rowId && cursorColId === column.id
      return matches
    })
    
    // #region agent log
    if (found) fetch('http://127.0.0.1:7243/ingest/9ea89aac-f844-4512-b6de-713c7440e93e',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'EditableCell:collaboratorMatch',message:'Found collaborator on this cell',data:{userId:found.userId,userName:found.userName,rowId,colId:column.id,cursorPath:found.cursor?.path,participantsCount:participants.length},timestamp:Date.now(),sessionId:'debug-session',hypothesisId:'I'})}).catch(()=>{});
    // #endregion
    
    return found
  }, [participants, rowId, column.id])

  return (
    <div
      ref={cellRef}
      tabIndex={0}
      onClick={handleSelect}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleCellKeyDown}
      className={`gba:relative gba:py-1 gba:px-1 gba:min-h-[28px] gba:rounded gba:outline-none gba:transition-all ${
        isSelected && !isEditing ? 'gba:ring-2 gba:ring-primary gba:bg-primary/5' : ''
      } ${canEdit && !isEditing && !isSelected ? 'gba:cursor-cell hover:gba:bg-accent/30' : ''} ${
        isInFormulaMode && isEditing ? 'gba:bg-primary/30 gba:ring-2 gba:ring-primary' : ''
      } ${isSelectedInFormula ? 'gba:bg-info-secondary/30 gba:ring-2 gba:ring-info' : ''}`}
      data-testid={`cell-${rowId}-${column.id}`}
      data-cell-row={rowIndex}
      data-cell-col={colIndex}
      data-cell-rowid={rowId}
      data-cell-colid={column.id}
    >
      {/* Show collaborator indicator if someone else is editing this cell */}
      {collaboratorEditingCell && !isEditing && (
        <CellCollaboratorIndicator
          userName={collaboratorEditingCell.userName}
          userColor={collaboratorEditingCell.userColor}
          isActive={true}
          showLabel={true}
        />
      )}
      {isEditing ? (
        <div className="gba:relative">
          <Input
            ref={inputRef}
            autoFocus
            value={editValue}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
            onBlur={handleBlur}
            className="gba:h-7 gba:py-0 gba:px-1 gba:text-sm gba:min-w-[60px] gba:font-mono gba:border-primary"
            data-testid={`cell-input-${rowId}-${column.id}`}
          />
          {editValue.trim().startsWith('=') && (
            <span className="gba:absolute gba:right-2 gba:top-1/2 gba:-translate-y-1/2 gba:text-xs gba:text-muted-foreground">
              fx
            </span>
          )}
        </div>
      ) : (
        <div className="gba:flex gba:items-center gba:gap-1 gba:select-none">
          {hasFormula && (
            <span className="gba:text-xs gba:text-muted-foreground gba:font-mono" title={storedFormula}>
              =
            </span>
          )}
          {formatCellValue(value, column)}
        </div>
      )}
    </div>
  )
}

/**
 * Table View Component with inline editing
 */
interface TableViewProps {
  data: Record<string, unknown>[]
  columns: ColumnDef<Record<string, unknown>>[]
  testId: string
  onCellChange?: (rowId: string, columnName: string, value: unknown) => void
  isEditable?: boolean
  onAddRow?: () => void
  showAddRow?: boolean
}

const TableView: React.FC<TableViewProps> = ({ data, columns, testId, onAddRow, showAddRow }) => {
  // Ensure all rows have a unique 'id' property for DataTable (not '_id')
  const dataWithIds = useMemo(() => {
    return data.map((row, index) => ({
      ...row,
      // DataTable requires 'id' property, not '_id'
      id: row.id ?? row._id ?? `row_${index}`
    }))
  }, [data])

  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid={testId}>
      <div className="gba:flex-1 gba:overflow-auto">
        <Card className="gba:overflow-hidden">
          <DataTable columns={columns} data={dataWithIds} />
        </Card>
      </div>
      {/* Add Row button - sticky at bottom */}
      {showAddRow && onAddRow && (
        <div className="gba:sticky gba:bottom-0 gba:z-10 gba:bg-background gba:pt-2 gba:pb-2 gba:border-t gba:flex gba:justify-start">
          <Button variant="outline" size="sm" onClick={onAddRow} className="gba:gap-2">
            <Plus className="gba:w-4 gba:h-4" />
            Add Row
          </Button>
        </div>
      )}
    </div>
  )
}

/**
 * Form View Component (Card-based records)
 */
interface FormViewProps {
  sheet: SpreadsheetSheet
  data: Record<string, unknown>[]
  onEdit: (row: Record<string, unknown>) => void
  onDelete: (rowId: string) => void
  testId: string
}

const FormView: React.FC<FormViewProps> = ({ sheet, data, onEdit, onDelete, testId }) => {
  const visibleColumns = sheet.columns.filter(c => c.isVisible)

  return (
    <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-4" data-testid={testId}>
      {data.map(row => (
        <Card key={row._id as string} className="gba:p-4">
          <div className="gba:space-y-3">
            {visibleColumns.slice(0, 5).map(col => (
              <div key={col.id}>
                <p className="gba:text-xs gba:text-muted-foreground">{col.label}</p>
                <p className="gba:text-sm gba:font-medium gba:text-foreground">{formatCellValue(row[col.name], col)}</p>
              </div>
            ))}
          </div>
          <div className="gba:flex gba:gap-2 gba:mt-4 gba:pt-4 gba:border-t">
            <Button variant="outline" size="sm" onClick={() => onEdit(row)}>
              <Pencil className="gba:w-4 gba:h-4 gba:mr-1" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => onDelete(row._id as string)}>
              <Trash2 className="gba:w-4 gba:h-4 gba:mr-1 gba:text-destructive" />
              Delete
            </Button>
          </div>
        </Card>
      ))}
    </div>
  )
}

/**
 * Dashboard View Component
 */
interface DashboardViewProps {
  sheet: SpreadsheetSheet
  data: Record<string, unknown>[]
  testId: string
}

const DashboardView: React.FC<DashboardViewProps> = ({ sheet, data, testId }) => {
  // Calculate KPIs
  const numericColumns = sheet.columns.filter(c => ['number', 'currency', 'percentage'].includes(c.type))

  const kpis = numericColumns.slice(0, 4).map(col => {
    const values = data.map(row => Number(row[col.name])).filter(v => !isNaN(v))

    const sum = values.reduce((a, b) => a + b, 0)
    const avg = values.length > 0 ? sum / values.length : 0

    return {
      label: col.label,
      value: col.type === 'currency' ? `$${sum.toLocaleString()}` : sum.toLocaleString(),
      subValue: `Avg: ${col.type === 'currency' ? '$' : ''}${avg.toFixed(2)}`,
      type: col.type
    }
  })

  return (
    <div className="gba:space-y-6" data-testid={testId}>
      {/* KPI Cards */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-4 gba:gap-4">
        {kpis.map((kpi, idx) => (
          <Card key={idx} className="gba:p-6">
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-1">{kpi.label}</p>
            <p className="gba:text-2xl gba:font-bold gba:text-foreground">{kpi.value}</p>
            <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">{kpi.subValue}</p>
          </Card>
        ))}
      </div>

      {/* Placeholder for charts */}
      <Card className="gba:p-6">
        <div className="gba:flex gba:items-center gba:justify-center gba:h-64 gba:bg-muted/20 gba:rounded-lg">
          <div className="gba:text-center">
            <BarChart3 className="gba:w-12 gba:h-12 gba:text-muted-foreground gba:mx-auto gba:mb-3" />
            <p className="gba:text-muted-foreground">Charts visualization coming soon</p>
          </div>
        </div>
      </Card>

      {/* Data summary */}
      <Card className="gba:p-6">
        <h3 className="gba:font-semibold gba:text-foreground gba:mb-4">Data Summary</h3>
        <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-4 gba:gap-4">
          <div>
            <p className="gba:text-sm gba:text-muted-foreground">Total Records</p>
            <p className="gba:text-xl gba:font-semibold">{data.length}</p>
          </div>
          <div>
            <p className="gba:text-sm gba:text-muted-foreground">Columns</p>
            <p className="gba:text-xl gba:font-semibold">{sheet.columns.length}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}

/**
 * Kanban View Component
 */
interface KanbanViewProps {
  sheet: SpreadsheetSheet
  data: Record<string, unknown>[]
  view: SheetView
  onEdit: (row: Record<string, unknown>) => void
  testId: string
}

const KanbanView: React.FC<KanbanViewProps> = ({ sheet, data, view, onEdit, testId }) => {
  if (view.config.type !== 'kanban') {
    return null
  }

  const { statusColumn, titleColumn, descriptionColumn } = view.config
  const statusCol = sheet.columns.find(c => c.name === statusColumn || c.id === statusColumn)

  if (!statusCol) {
    return (
      <Card className="gba:p-8 gba:text-center">
        <p className="gba:text-muted-foreground">Status column not found for Kanban view</p>
      </Card>
    )
  }

  // Get unique status values
  const statuses =
    statusCol.selectOptions?.map(o => o.value) ||
    [...new Set(data.map(row => String(row[statusCol.name] || '')))].filter(Boolean)

  // Group data by status
  const groupedData = statuses.reduce(
    (acc, status) => {
      acc[status] = data.filter(row => String(row[statusCol.name]) === status)
      return acc
    },
    {} as Record<string, Record<string, unknown>[]>
  )

  return (
    <div className="gba:flex gba:gap-4 gba:overflow-x-auto gba:pb-4" data-testid={testId}>
      {statuses.map(status => {
        const statusOption = statusCol.selectOptions?.find(o => o.value === status)
        const items = groupedData[status] || []

        return (
          <div key={status} className="gba:flex-shrink-0 gba:w-80 gba:bg-muted/30 gba:rounded-lg gba:p-4">
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <div
                  className="gba:w-3 gba:h-3 gba:rounded-full"
                  style={{ backgroundColor: statusOption?.color || '#888' }}
                />
                <h3 className="gba:font-medium gba:text-foreground">{statusOption?.label || status}</h3>
              </div>
              <Badge variant="secondary">{items.length}</Badge>
            </div>

            <div className="gba:space-y-3">
              {items.map(row => (
                <Card
                  key={row._id as string}
                  className="gba:p-4 gba:cursor-pointer gba:hover:shadow-md gba:transition-shadow"
                  onClick={() => onEdit(row)}
                >
                  <p className="gba:font-medium gba:text-foreground gba:mb-1">
                    {String(row[titleColumn] || 'Untitled')}
                  </p>
                  {descriptionColumn && Boolean(row[descriptionColumn]) && (
                    <p className="gba:text-sm gba:text-muted-foreground gba:line-clamp-2">
                      {String(row[descriptionColumn])}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/**
 * Map column type to form field type
 */
function mapColumnTypeToFormType(type: string): DynamicFormField['type'] {
  const mapping: Record<string, DynamicFormField['type']> = {
    text: 'TEXT',
    number: 'NUMBER',
    currency: 'NUMBER',
    percentage: 'NUMBER',
    date: 'DATE',
    datetime: 'DATETIME',
    email: 'EMAIL',
    phone: 'TEXT',
    url: 'URL',
    select: 'SELECT',
    multiselect: 'MULTISELECT',
    boolean: 'CHECKBOX',
    calculated: 'TEXT',
    reference: 'SELECT'
  }

  return mapping[type] || 'TEXT'
}

/**
 * Check if a value is a workflow status and return badge variant
 */
function getStatusBadgeVariant(value: string): 'success' | 'warning' | 'destructive' | 'info' | 'secondary' | null {
  const normalizedValue = value.toLowerCase().trim()

  // Success statuses
  if (['completed', 'submitted', 'approved', 'done', 'finished', 'success'].includes(normalizedValue)) {
    return 'success'
  }

  // Warning statuses (in progress)
  if (['sent', 'pending', 'waiting', 'in progress', 'in_progress', 'running', 'processing'].includes(normalizedValue)) {
    return 'warning'
  }

  // Error/failure statuses
  if (['failed', 'error', 'rejected', 'cancelled', 'canceled', 'timeout', 'timed_out'].includes(normalizedValue)) {
    return 'destructive'
  }

  // Info statuses
  if (['draft', 'new', 'created'].includes(normalizedValue)) {
    return 'info'
  }

  return null
}

/**
 * Format cell value for display
 */
function formatCellValue(value: unknown, column: SpreadsheetColumn, isStatusColumn?: boolean): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="gba:text-muted-foreground">—</span>
  }

  // Handle formula errors
  if (value === '#ERROR!' || (typeof value === 'string' && value.startsWith('#ERROR'))) {
    return <span className="gba:text-destructive">#ERROR!</span>
  }

  // Check if this looks like a status value and render as badge
  // Check both column.name and column.label since either might contain "status"
  const isStatusByName = column.name?.toLowerCase().includes('status') || column.label?.toLowerCase().includes('status')

  if (typeof value === 'string' && (isStatusColumn || isStatusByName)) {
    const badgeVariant = getStatusBadgeVariant(value)
    if (badgeVariant) {
      return (
        <Badge variant={badgeVariant} className="gba:font-medium">
          {value}
        </Badge>
      )
    }
  }

  switch (column.type) {
    case 'currency':
      return `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    case 'percentage':
      return `${Number(value).toFixed(1)}%`
    case 'date':
      return new Date(String(value)).toLocaleDateString()
    case 'datetime':
      return new Date(String(value)).toLocaleString()
    case 'boolean':
      return value ? '✓' : '✗'
    case 'select': {
      const option = column.selectOptions?.find(o => o.value === String(value))
      if (option) {
        return (
          <Badge variant="secondary" style={{ backgroundColor: option.color ? `${option.color}20` : undefined }}>
            {option.label}
          </Badge>
        )
      }
      return String(value)
    }
    case 'email':
      return (
        <a href={`mailto:${value}`} className="gba:text-primary gba:hover:underline">
          {String(value)}
        </a>
      )
    case 'url':
      return (
        <a
          href={String(value)}
          target="_blank"
          rel="noopener noreferrer"
          className="gba:text-primary gba:hover:underline"
        >
          {String(value)}
        </a>
      )
    default:
      return String(value)
  }
}
