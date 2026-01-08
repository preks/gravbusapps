/**
 * SpreadsheetAppViewer Component
 *
 * The main runtime viewer for generated spreadsheet apps.
 * Renders table, form, dashboard, and kanban views based on configuration.
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react'
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
  EyeOff
} from 'lucide-react'
import { DynamicFormGenerator } from '@/business-apps/ser/components/DynamicFormGenerator'
import type { DynamicFormField } from '@/business-apps/ser/types/flowTemplate'
import type {
  SpreadsheetApp,
  SpreadsheetSheet,
  SpreadsheetColumn,
  ViewType,
  SheetView,
  ColumnType
} from './types'
import { evaluateFormula, isFormula, type FormulaContext } from './utils/formulaEvaluator'
import { useEntityDataSource } from './hooks/useEntityDataSource'

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
  onAppUpdate: _onAppUpdate,
  onBack,
  onEdit,
  isEditing: _isEditing = false,
  accessToken = '',
  userId,
  'data-testid': testId = 'spreadsheet-app-viewer'
}) => {
  // State
  const [activeSheetId, setActiveSheetId] = useState(
    initialSheetId || app.sheets[0]?.id || ''
  )
  const [activeViewId, setActiveViewId] = useState<string | null>(initialViewId || null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isAddRowDialogOpen, setIsAddRowDialogOpen] = useState(false)
  const [isAddColumnDialogOpen, setIsAddColumnDialogOpen] = useState(false)
  const [isManageColumnsDialogOpen, setIsManageColumnsDialogOpen] = useState(false)
  const [newColumnName, setNewColumnName] = useState('')
  const [newColumnType, setNewColumnType] = useState<ColumnType>('text')
  const [editingRow, setEditingRow] = useState<Record<string, unknown> | null>(null)
  
  // Entity data loading
  const [entityData, setEntityData] = useState<Record<string, unknown>[]>([])
  const [isEntityDataLoading, setIsEntityDataLoading] = useState(false)
  const [entityDataError, setEntityDataError] = useState<string | null>(null)
  
  // Entity data source hook
  const { loadData: loadEntityData } = useEntityDataSource({
    accessToken,
    userId
  })
  const [formulaSelectionMode, setFormulaSelectionMode] = useState<FormulaSelectionMode>(null)
  const formulaSelectionModeRef = React.useRef<FormulaSelectionMode>(null)

  useEffect(() => {
    formulaSelectionModeRef.current = formulaSelectionMode
  }, [formulaSelectionMode])

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

      const context: FormulaContext = {
        row,
        allRows: allData,
        columns: activeSheet.columns.map(col => ({ name: col.name, id: col.id })),
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
        const cellValue = updatedRow[col.name]
        const formulas = updatedRow._formulas as Record<string, string> | undefined
        const formula = formulas?.[col.name] || cellValue
        
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
  }, [activeSheetId, activeSheet?.entityDataSource?.enabled, activeSheet?.entityDataSource?.refreshMode, loadSheetEntityData])

  /**
   * Manual refresh function
   */
  const handleRefreshEntityData = useCallback(() => {
    loadSheetEntityData()
  }, [loadSheetEntityData])

  /**
   * Determine which data to use - entity data or static sheet data
   * When entity data source is enabled, merge entity data with custom column data from sheet.data
   */
  const sourceData = useMemo(() => {
    if (activeSheet?.entityDataSource?.enabled && entityData.length > 0) {
      // Create a map of custom column data from activeSheet.data (keyed by _id)
      const customDataMap = new Map<string, Record<string, unknown>>()
      activeSheet.data.forEach(row => {
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
    return activeSheet?.data || []
  }, [activeSheet?.entityDataSource?.enabled, activeSheet?.data, entityData])

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
      Object.values(row).some(
        value => value && String(value).toLowerCase().includes(query)
      )
    )
  }, [activeSheet, sourceData, searchQuery, recalculateAllFormulas])

  /**
   * Handle row add
   */
  const handleAddRow = useCallback(
    async (values: Record<string, unknown>) => {
      if (!activeSheet) return

      const newRow = {
        _id: `row_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        _createdAt: new Date().toISOString(),
        ...values
      }

      const newData = [...activeSheet.data, newRow]
      onDataChange?.(activeSheet.id, newData)

      setIsAddRowDialogOpen(false)
    },
    [activeSheet, onDataChange]
  )

  /**
   * Handle row update
   */
  const handleUpdateRow = useCallback(
    async (values: Record<string, unknown>) => {
      if (!activeSheet || !editingRow) return

      const newData = activeSheet.data.map(row =>
        row._id === editingRow._id
          ? { ...row, ...values, _updatedAt: new Date().toISOString() }
          : row
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

      const newData = activeSheet.data.filter(row => row._id !== rowId)
      onDataChange?.(activeSheet.id, newData)
    },
    [activeSheet, onDataChange]
  )

  /**
   * Handle adding a new column
   */
  const handleAddColumn = useCallback(() => {
    if (!activeSheet || !newColumnName.trim()) return

    const newColumn: SpreadsheetColumn = {
      id: `col_${Date.now()}`,
      name: newColumnName.trim().toLowerCase().replace(/\s+/g, '_'),
      label: newColumnName.trim(),
      type: newColumnType,
      isVisible: true,
      isEditable: true,
      isRequired: false,
      isUnique: false,
      width: 150,
      order: activeSheet.columns.length
    }

    // Update app with new column
    const updatedSheets = app.sheets.map(sheet => {
      if (sheet.id === activeSheet.id) {
        return {
          ...sheet,
          columns: [...sheet.columns, newColumn]
        }
      }
      return sheet
    })

    _onAppUpdate?.({ ...app, sheets: updatedSheets })
    
    // Reset dialog
    setNewColumnName('')
    setNewColumnType('text')
    setIsAddColumnDialogOpen(false)
  }, [activeSheet, newColumnName, newColumnType, app, _onAppUpdate])

  /**
   * Handle deleting a column
   */
  const handleDeleteColumn = useCallback((columnId: string) => {
    if (!activeSheet) return

    // Don't allow deleting the last column
    if (activeSheet.columns.length <= 1) {
      return
    }

    // Remove column from columns array
    const updatedColumns = activeSheet.columns.filter(col => col.id !== columnId)
    
    // Remove column data from all rows
    const columnToDelete = activeSheet.columns.find(col => col.id === columnId)
    const updatedData = activeSheet.data.map(row => {
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
  }, [activeSheet, app, _onAppUpdate])

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

      // Update selection state FIRST (fast highlight on click)
      if (isRangeEnd && mode.startCell) {
        setFormulaSelectionMode({
          ...mode,
          endCell: { rowIndex, colIndex },
          isRangeSelection: true
        })
      } else {
        setFormulaSelectionMode({
          ...mode,
          startCell: { rowIndex, colIndex },
          endCell: null,
          isRangeSelection: false
        })
      }

      // Update the edit value in the active cell component
      const activeCellElement = document.querySelector(
        `[data-cell-rowid="${mode.editingCell.rowId}"][data-cell-colid="${mode.editingCell.colId}"] input`
      ) as HTMLInputElement | null
      
      if (!activeCellElement) return

      const currentFormula = activeCellElement.value?.trim() || '='

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

      // Apply immediately (no onDataChange here -> much faster)
      activeCellElement.value = newFormula
      activeCellElement.dispatchEvent(new Event('input', { bubbles: true }))
      requestAnimationFrame(() => {
        activeCellElement.focus()
        activeCellElement.setSelectionRange(newFormula.length, newFormula.length)
      })
    },
    [activeSheet, columnIndexToLetter, setFormulaSelectionMode]
  )

  /**
   * Handle inline cell change (Excel-like editing)
   * When entity data source is enabled, save custom column data separately in activeSheet.data
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
        // When entity data source is enabled, we save custom column data in activeSheet.data
        // keyed by the entity row ID
        const existingRowIndex = activeSheet.data.findIndex(
          row => row._id === rowId || row.id === rowId
        )
        
        if (existingRowIndex >= 0) {
          // Update existing row
          newData = activeSheet.data.map(row => {
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
          
          newData = [...activeSheet.data, newRow]
        }
      } else {
        // Standard behavior when no entity data source
        newData = activeSheet.data.map(row => {
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

      onDataChange?.(activeSheet.id, newData)
    },
    [activeSheet, entityData, onDataChange, recalculateAllFormulas]
  )

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
              ...(col.validation.required
                ? [{ type: 'required' as const, message: `${col.label} is required` }]
                : []),
              ...(col.validation.min !== undefined
                ? [{ type: 'min' as const, value: col.validation.min }]
                : []),
              ...(col.validation.max !== undefined
                ? [{ type: 'max' as const, value: col.validation.max }]
                : [])
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

    const cols: ColumnDef<Record<string, unknown>>[] = []
    let colIndexOffset = 0

    // If entity data source is enabled, add entity columns first (read-only)
    if (activeSheet.entityDataSource?.enabled && activeSheet.entityDataSource.fieldMappings?.length > 0) {
      const entityFieldMappings = activeSheet.entityDataSource.fieldMappings.filter(m => m.include)
      
      console.log('[SpreadsheetViewer] Adding entity columns:', entityFieldMappings.map(m => m.entityFieldLabel))
      
      entityFieldMappings.forEach((mapping) => {
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
                  value ? '✓' : '✗'
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
      
      colIndexOffset = entityFieldMappings.length
    }

    // Add custom spreadsheet columns (editable)
    const visibleColumns = activeSheet.columns.filter(col => col.isVisible)
    
    visibleColumns.forEach((col, idx) => {
      const colIndex = colIndexOffset + idx
      
      cols.push({
        id: col.id,
        accessorFn: (row: Record<string, unknown>) => row[col.name],
        header: () => (
          <div className="gba:flex gba:items-center gba:justify-between gba:w-full gba:group">
            <div className="gba:flex gba:items-center gba:gap-1">
              {activeSheet.entityDataSource?.enabled && (
                <Pencil className="gba:w-3 gba:h-3 gba:text-success" />
              )}
              <span>{col.label}</span>
            </div>
            {_onAppUpdate && activeSheet.columns.length > 1 && (
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
                  <DropdownMenuItem 
                    onClick={() => handleDeleteColumn(col.id)}
                    className="gba:text-destructive"
                  >
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
            />
          )
        }
      })
    })

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
  }, [activeSheet, handleDeleteRow, handleCellChange, filteredData, handleFormulaCellSelect, formulaSelectionMode])

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
                  <span className="gba:text-xl">{app.icon || '📊'}</span>
                </div>
                <div>
                  <h1 className="gba:text-xl gba:font-semibold gba:text-foreground">
                    {app.name}
                  </h1>
                  {app.description && (
                    <p className="gba:text-sm gba:text-muted-foreground">
                      {app.description}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="gba:flex gba:items-center gba:gap-2">
              {/* Entity data source indicator */}
              {activeSheet?.entityDataSource?.enabled && (
                <>
                  <Badge variant="info" className="gba:gap-1">
                    <Database className="gba:w-3 gba:h-3" />
                    {activeSheet.entityDataSource.entityDisplayName}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshEntityData}
                    disabled={isEntityDataLoading}
                  >
                    {isEntityDataLoading ? (
                      <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
                    ) : (
                      <RefreshCw className="gba:w-4 gba:h-4" />
                    )}
                  </Button>
                </>
              )}
              <Badge variant={app.status === 'promoted' ? 'success' : 'secondary'}>
                {app.status === 'promoted' ? 'Database' : 'File-based'}
              </Badge>
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Settings className="gba:w-4 gba:h-4 gba:mr-2" />
                  Edit App
                </Button>
              )}
            </div>
          </div>
        </div>

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

      {/* Toolbar */}
      <div className="gba:px-6 gba:py-3 gba:border-b gba:bg-muted/30">
        <div className="gba:flex gba:items-center gba:justify-between">
          {/* Formula hint */}
          <div className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
            <span className="gba:font-mono">fx</span>
            {formulaSelectionMode ? (() => {
              const colIndex = activeSheet.columns.findIndex(c => c.id === formulaSelectionMode!.editingCell.colId)
              const rowIndex = filteredData.findIndex((r: Record<string, unknown>) => 
                (r._id === formulaSelectionMode!.editingCell.rowId || r.id === formulaSelectionMode!.editingCell.rowId)
              )
              const colLetter = columnIndexToLetter(colIndex)
              const cellRef = `${colLetter}${rowIndex + 1}`
              
              return (
                <span className="gba:text-primary gba:font-medium">
                  Editing <code className="gba:px-1 gba:py-0.5 gba:bg-primary/20 gba:text-primary gba:rounded gba:font-mono">{cellRef}</code> • Click cells to add references • Shift+Click for range • Press Enter to finish • Esc to cancel
                </span>
              )
            })() : (
              <span>Type <code className="gba:px-1 gba:py-0.5 gba:bg-muted gba:rounded">=</code> in any cell to start a formula</span>
            )}
          </div>
          
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
              <Button variant="outline" onClick={() => setIsAddColumnDialogOpen(true)}>
                <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
                Add Column
              </Button>
            )}

            {activeSheet.settings.allowAdd && (
              <Button onClick={() => setIsAddRowDialogOpen(true)}>
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
                  <strong>{entityData.length}</strong> records loaded from <strong>{activeSheet.entityDataSource.entityDisplayName}</strong>
                </span>
                <Badge variant="info" className="gba:text-xs">Live Data</Badge>
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
      <div className="gba:flex-1 gba:overflow-auto gba:p-6">
        {activeView?.type === 'table' && (
          <TableView
            data={filteredData}
            columns={tableColumns}
            testId={`${testId}-table`}
          />
        )}

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
          <DashboardView
            sheet={activeSheet}
            data={filteredData}
            testId={`${testId}-dashboard`}
          />
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

      {/* Add Row Dialog */}
      <Dialog open={isAddRowDialogOpen} onOpenChange={setIsAddRowDialogOpen}>
        <DialogContent className="gba:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Row</DialogTitle>
          </DialogHeader>
          <DynamicFormGenerator
            schema={formFields}
            onSubmit={handleAddRow}
            submitButtonText="Add Row"
            showCard={false}
            accessToken={accessToken}
          />
        </DialogContent>
      </Dialog>

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

      {/* Add Column Dialog */}
      <Dialog open={isAddColumnDialogOpen} onOpenChange={setIsAddColumnDialogOpen}>
        <DialogContent className="gba:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Column</DialogTitle>
          </DialogHeader>
          <div className="gba:space-y-4 gba:py-4">
            <div className="gba:space-y-2">
              <Label htmlFor="column-name">Column Name</Label>
              <Input
                id="column-name"
                placeholder="Enter column name..."
                value={newColumnName}
                onChange={e => setNewColumnName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="gba:space-y-2">
              <Label htmlFor="column-type">Column Type</Label>
              <Select value={newColumnType} onValueChange={(v: ColumnType) => setNewColumnType(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="number">Number</SelectItem>
                  <SelectItem value="date">Date</SelectItem>
                  <SelectItem value="datetime">Date & Time</SelectItem>
                  <SelectItem value="boolean">Checkbox</SelectItem>
                  <SelectItem value="select">Dropdown</SelectItem>
                  <SelectItem value="currency">Currency</SelectItem>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="url">URL</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddColumnDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddColumn} disabled={!newColumnName.trim()}>
              <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
              Add Column
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Columns Dialog */}
      <Dialog open={isManageColumnsDialogOpen} onOpenChange={setIsManageColumnsDialogOpen}>
        <DialogContent className="gba:max-w-lg">
          <DialogHeader>
            <DialogTitle className="gba:flex gba:items-center gba:gap-2">
              <Columns className="gba:w-5 gba:h-5" />
              Manage Columns
            </DialogTitle>
          </DialogHeader>
          <div className="gba:space-y-2 gba:max-h-[400px] gba:overflow-y-auto">
            {activeSheet.columns.length === 0 ? (
              <p className="gba:text-muted-foreground gba:text-center gba:py-4">
                No custom columns. Click "Add Column" to create one.
              </p>
            ) : (
              activeSheet.columns.map(column => (
                <div 
                  key={column.id} 
                  className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg gba:bg-card"
                >
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <div>
                      <p className="gba:font-medium">{column.label}</p>
                      <p className="gba:text-xs gba:text-muted-foreground">
                        {column.type} • {column.name}
                      </p>
                    </div>
                  </div>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        // Toggle visibility
                        const updatedColumns = activeSheet.columns.map(c =>
                          c.id === column.id ? { ...c, isVisible: !c.isVisible } : c
                        )
                        const updatedSheets = app.sheets.map(sheet =>
                          sheet.id === activeSheet.id ? { ...sheet, columns: updatedColumns } : sheet
                        )
                        _onAppUpdate?.({ ...app, sheets: updatedSheets })
                      }}
                    >
                      {column.isVisible ? (
                        <Eye className="gba:w-4 gba:h-4 gba:text-success" />
                      ) : (
                        <EyeOff className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                      )}
                    </Button>
                    {activeSheet.columns.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteColumn(column.id)}
                        className="gba:text-destructive hover:gba:text-destructive"
                      >
                        <Trash2 className="gba:w-4 gba:h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsManageColumnsDialogOpen(false)}>
              Close
            </Button>
            <Button onClick={() => {
              setIsManageColumnsDialogOpen(false)
              setIsAddColumnDialogOpen(true)
            }}>
              <Plus className="gba:w-4 gba:h-4 gba:mr-2" />
              Add Column
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
let activeEditCell: ActiveEditCell = null

/**
 * Editable Cell Component - Click to edit like Excel
 * Supports arrow key navigation between cells
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
  setFormulaSelectionMode
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [originalValue, setOriginalValue] = useState<string>('') // Store original value for Escape
  
  // Get the row to check for stored formulas
  const currentRow = allRows.find(r => (r._id === rowId || r.id === rowId))
  const formulas = currentRow?._formulas as Record<string, string> | undefined
  const storedFormula = formulas?.[column.name]
  const hasFormula = Boolean(storedFormula)
  
  // Initialize edit value with formula if it exists, otherwise use the displayed value
  const [editValue, setEditValue] = useState(() => {
    return storedFormula || String(value ?? '')
  })
  
  const inputRef = React.useRef<HTMLInputElement>(null)
  const cellRef = React.useRef<HTMLDivElement>(null)
  const isNavigatingRef = React.useRef(false)
  const isCommittingRef = React.useRef(false)
  const shouldStartEditingRef = React.useRef(false)

  // Check if we're in formula selection mode (this is the cell being edited)
  const isInFormulaMode = formulaSelectionMode !== null && 
    formulaSelectionMode.editingCell.rowId === rowId && 
    formulaSelectionMode.editingCell.colId === column.id

  // Focus input when editing starts and keep it focused in formula mode
  React.useLayoutEffect(() => {
    if (!isEditing || !inputRef.current) return
    
    // Always focus when editing, especially in formula mode
    inputRef.current.focus()
    
    if (shouldStartEditingRef.current) {
      inputRef.current.select()
      shouldStartEditingRef.current = false
    }
    
    // In formula selection mode, ensure input stays focused
    if (isInFormulaMode && formulaSelectionMode) {
      const focusInput = () => {
        if (inputRef.current && document.activeElement !== inputRef.current) {
          inputRef.current.focus()
        }
      }
      
      // Focus after a short delay to allow cell clicks to process
      const timeoutId = setTimeout(focusInput, 50)
      return () => clearTimeout(timeoutId)
    }
  }, [isEditing, isInFormulaMode])

  // Restore edit mode after table re-renders/remounts (e.g. async save causes new table instance)
  React.useLayoutEffect(() => {
    if (!activeEditCell) return
    if (activeEditCell.rowId !== rowId || activeEditCell.colId !== column.id) return

    if (!isEditable || !column.isEditable) {
      // If the cell is no longer editable, stop tracking it.
      activeEditCell = null
      return
    }

    if (!isEditing) {
      shouldStartEditingRef.current = true
      // Use stored formula if available, otherwise use displayed value
      const currentRow = allRows.find(r => (r._id === rowId || r.id === rowId))
      const formulas = currentRow?._formulas as Record<string, string> | undefined
      const storedFormula = formulas?.[column.name]
      const initialValue = storedFormula || String(value ?? '')
      setOriginalValue(initialValue) // Store original for Escape
      setEditValue(initialValue)
      setIsEditing(true)
    }
  })

  const handleStartEdit = () => {
    if (!isEditable || !column.isEditable) return
    activeEditCell = { rowId, colId: column.id }
    shouldStartEditingRef.current = true
    // Use stored formula if available, otherwise use displayed value
    const currentRow = allRows.find(r => (r._id === rowId || r.id === rowId))
    const formulas = currentRow?._formulas as Record<string, string> | undefined
    const storedFormula = formulas?.[column.name]
    const initialValue = storedFormula || String(value ?? '')
    setOriginalValue(initialValue) // Store original for Escape
    setEditValue(initialValue)
    setIsEditing(true)
  }

  const handleSave = () => {
    if (isCommittingRef.current) return
    isCommittingRef.current = true

    // Check if it's a formula (starts with =)
    let convertedValue: unknown = editValue
    
    if (isFormula(editValue)) {
      // Keep formula as-is, it will be evaluated by the parent component
      convertedValue = editValue
    } else if (column.type === 'number' || column.type === 'currency' || column.type === 'percentage') {
      convertedValue = editValue === '' ? null : Number(editValue)
    } else if (column.type === 'boolean') {
      convertedValue = editValue.toLowerCase() === 'true' || editValue === '1'
    }

    onSave(rowId, column.name, convertedValue)
    setIsEditing(false)

    // Allow subsequent commits (blur can fire immediately after unmount)
    setTimeout(() => {
      isCommittingRef.current = false
    }, 0)
  }

  // If the user clicks anywhere else, commit and stop editing this cell.
  // This avoids the "auto-reopen" loop, while still allowing us to keep editing stable
  // across table remounts (those don't trigger pointer events).
  React.useEffect(() => {
    if (!isEditing) return

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (cellRef.current && target && cellRef.current.contains(target)) {
        return
      }

      // Don't close if we're in formula selection mode and clicking on another cell
      if (formulaSelectionMode && formulaSelectionMode.editingCell.rowId === rowId && formulaSelectionMode.editingCell.colId === column.id) {
        // Check if clicking on a cell (not outside the table)
        const clickedCell = (event.target as HTMLElement)?.closest('[data-cell-rowid]')
        if (clickedCell) {
          // Keep editing mode active, just refocus
          setTimeout(() => {
            if (inputRef.current) {
              inputRef.current.focus()
            }
          }, 0)
          return
        }
      }

      activeEditCell = null
      handleSave()
    }

    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [isEditing, rowId, column.id, formulaSelectionMode])

  /**
   * Navigate to adjacent cell using arrow keys
   */
  const navigateToCell = (direction: 'up' | 'down' | 'left' | 'right') => {
    let targetRow = rowIndex
    let targetCol = colIndex

    switch (direction) {
      case 'up':
        targetRow = rowIndex - 1
        break
      case 'down':
        targetRow = rowIndex + 1
        break
      case 'left':
        targetCol = colIndex - 1
        break
      case 'right':
        targetCol = colIndex + 1
        break
    }

    // Find the target cell by data attribute
    const targetCell = document.querySelector(
      `[data-cell-row="${targetRow}"][data-cell-col="${targetCol}"]`
    ) as HTMLElement

    if (targetCell) {
      // Set flag to prevent blur from saving (we'll save here)
      isNavigatingRef.current = true
      isCommittingRef.current = true
      
      // Keep next edited cell stable even if table re-renders/remounts
      const targetRowId = targetCell.dataset.cellRowid
      const targetColId = targetCell.dataset.cellColid
      if (targetRowId && targetColId) {
        activeEditCell = { rowId: targetRowId, colId: targetColId }
      }
      
      // Save current value
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
      
      // Reset navigation flag after a delay
      setTimeout(() => {
        isNavigatingRef.current = false
        isCommittingRef.current = false
      }, 100)
    }
  }

  // Check if this cell is selected in formula mode (for highlighting)
  const isSelectedInFormula = formulaSelectionMode !== null && 
    !(formulaSelectionMode.editingCell.rowId === rowId && formulaSelectionMode.editingCell.colId === column.id) &&
    ((formulaSelectionMode.startCell && 
      formulaSelectionMode.startCell.rowIndex === rowIndex && 
      formulaSelectionMode.startCell.colIndex === colIndex) ||
     (formulaSelectionMode.endCell && 
      formulaSelectionMode.endCell.rowIndex === rowIndex && 
      formulaSelectionMode.endCell.colIndex === colIndex) ||
     (formulaSelectionMode.isRangeSelection && 
      formulaSelectionMode.startCell && formulaSelectionMode.endCell &&
      rowIndex >= Math.min(formulaSelectionMode.startCell.rowIndex, formulaSelectionMode.endCell.rowIndex) &&
      rowIndex <= Math.max(formulaSelectionMode.startCell.rowIndex, formulaSelectionMode.endCell.rowIndex) &&
      colIndex >= Math.min(formulaSelectionMode.startCell.colIndex, formulaSelectionMode.endCell.colIndex) &&
      colIndex <= Math.max(formulaSelectionMode.startCell.colIndex, formulaSelectionMode.endCell.colIndex)))

  // Global keyboard handler for formula mode (works even when input loses focus)
  React.useEffect(() => {
    if (!isEditing || !isInFormulaMode) return

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      // Only handle if this is the active editing cell
      if (formulaSelectionMode?.editingCell.rowId !== rowId || 
          formulaSelectionMode?.editingCell.colId !== column.id) {
        return
      }

      if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        setFormulaSelectionMode(null)
        handleSave()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        setFormulaSelectionMode(null)
        // Restore original value (like Excel)
        setEditValue(originalValue)
        setIsEditing(false)
        // Clear the active edit cell
        if (activeEditCell?.rowId === rowId && activeEditCell?.colId === column.id) {
          activeEditCell = null
        }
      }
    }

    document.addEventListener('keydown', handleGlobalKeyDown, true)
    return () => document.removeEventListener('keydown', handleGlobalKeyDown, true)
  }, [isEditing, isInFormulaMode, rowId, column.id, originalValue, formulaSelectionMode, setFormulaSelectionMode])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // If in formula mode and typing, don't navigate
    const isFormulaInput = editValue.trim().startsWith('=')
    
    if (e.key === 'Enter') {
      if (isFormulaInput && formulaSelectionMode) {
        // Finish formula selection
        setFormulaSelectionMode(null)
        e.preventDefault()
        handleSave()
        return
      }
      e.preventDefault()
      // Enter moves down (like Excel) - but only if not in formula selection mode
      if (!isFormulaInput || !formulaSelectionMode) {
        navigateToCell('down')
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setFormulaSelectionMode(null)
      // Restore original value (like Excel)
      setEditValue(originalValue)
      setIsEditing(false)
      // Clear the active edit cell
      if (activeEditCell?.rowId === rowId && activeEditCell?.colId === column.id) {
        activeEditCell = null
      }
    } else if (e.key === 'Tab') {
      e.preventDefault()
      // Tab moves right, Shift+Tab moves left - but only if not in formula selection mode
      if (!isFormulaInput || !formulaSelectionMode) {
        navigateToCell(e.shiftKey ? 'left' : 'right')
      }
    } else if (e.key === 'ArrowUp') {
      if (isFormulaInput && formulaSelectionMode) {
        // In formula mode, arrows can be used for selection
        e.preventDefault()
        return
      }
      e.preventDefault()
      navigateToCell('up')
    } else if (e.key === 'ArrowDown') {
      if (isFormulaInput && formulaSelectionMode) {
        e.preventDefault()
        return
      }
      e.preventDefault()
      navigateToCell('down')
    } else if (e.key === 'ArrowLeft') {
      // Only navigate if cursor is at the start of input
      const input = inputRef.current
      if (input && input.selectionStart === 0 && input.selectionEnd === 0) {
        if (isFormulaInput && formulaSelectionMode) {
          e.preventDefault()
          return
        }
        e.preventDefault()
        navigateToCell('left')
      }
    } else if (e.key === 'ArrowRight') {
      // Only navigate if cursor is at the end of input
      const input = inputRef.current
      if (input && input.selectionStart === editValue.length && input.selectionEnd === editValue.length) {
        if (isFormulaInput && formulaSelectionMode) {
          e.preventDefault()
          return
        }
        e.preventDefault()
        navigateToCell('right')
      }
    }
  }
  
  // Handle cell click when in formula selection mode
  const handleCellClickInFormulaMode = (e: React.PointerEvent | React.MouseEvent) => {
    if (!formulaSelectionMode || isInFormulaMode) return
    
    e.stopPropagation()
    e.preventDefault()
    
    if (onFormulaCellSelect) {
      const isRangeEnd = e.shiftKey
      onFormulaCellSelect(rowIndex, colIndex, isRangeEnd)
    }
  }

  const handleBlur = () => {
    // Don't save if we're navigating to another cell (it's already saved by navigateToCell)
    if (isNavigatingRef.current) {
      return
    }
    // Don't double-save if we already committed (pointer navigation / immediate unmount blur)
    if (isCommittingRef.current) {
      return
    }
    // Don't save if we're in formula selection mode (user is clicking cells)
    if (formulaSelectionMode && formulaSelectionMode.editingCell.rowId === rowId && formulaSelectionMode.editingCell.colId === column.id) {
      // Refocus the input to keep editing active
      setTimeout(() => {
        if (inputRef.current && isEditing) {
          inputRef.current.focus()
        }
      }, 0)
      return
    }
    handleSave()
  }
  
  // Handle input change - detect when user types "=" to enter formula mode
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setEditValue(newValue)
    
    // Enter formula selection mode when user types "="
    if (newValue.trim().startsWith('=') && !formulaSelectionMode) {
      setFormulaSelectionMode({
        editingCell: { rowId, colId: column.id },
        startCell: null,
        endCell: null,
        isRangeSelection: false
      })
    } else if (!newValue.trim().startsWith('=') && formulaSelectionMode) {
      // Exit formula mode if user removes the "="
      if (formulaSelectionMode.editingCell.rowId === rowId && 
          formulaSelectionMode.editingCell.colId === column.id) {
        setFormulaSelectionMode(null)
      }
    }
  }

  const canEdit = isEditable && column.isEditable

  return (
    <div
      ref={cellRef}
      onPointerDown={
        !isEditing && formulaSelectionMode && !isInFormulaMode
          ? handleCellClickInFormulaMode
          : undefined
      }
      onClick={
        !isEditing 
          ? (formulaSelectionMode && !isInFormulaMode)
            ? undefined
            : handleStartEdit
          : undefined
      }
      onDoubleClick={!isEditing && !(formulaSelectionMode && !isInFormulaMode) ? handleStartEdit : undefined}
      className={`gba:py-1 gba:px-1 gba:min-h-[28px] gba:rounded ${
        canEdit && !isEditing
          ? 'gba:cursor-text hover:gba:bg-accent/50 gba:transition-colors'
          : ''
      } ${
        isInFormulaMode && isEditing
          ? 'gba:bg-primary/30 gba:ring-2 gba:ring-primary gba:ring-offset-1'
          : ''
      } ${
        isSelectedInFormula 
          ? 'gba:bg-info-secondary/30 gba:ring-2 gba:ring-primary/50 gba:ring-offset-1'
          : ''
      } ${
        formulaSelectionMode && !isInFormulaMode && canEdit
          ? 'gba:cursor-pointer hover:gba:bg-primary/10'
          : ''
      }`}
      title={
        isInFormulaMode && isEditing
          ? 'Editing formula - Click cells to add references'
          : canEdit && !isEditing 
            ? (formulaSelectionMode && !isInFormulaMode)
              ? 'Click to add to formula (Shift+Click for range)'
              : (hasFormula ? 'Formula: Click to edit' : 'Click to edit')
            : undefined
      }
      data-testid={`cell-${rowId}-${column.id}`}
      data-cell-row={rowIndex}
      data-cell-col={colIndex}
      data-cell-rowid={rowId}
      data-cell-colid={column.id}
    >
      {isEditing ? (
        <div className="gba:relative">
          <Input
            ref={inputRef}
            autoFocus
            value={editValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            className="gba:h-7 gba:py-0 gba:px-1 gba:text-sm gba:min-w-[60px] gba:font-mono"
            placeholder={hasFormula ? 'Enter formula (e.g., =A1+B1)' : 'Enter value'}
            data-testid={`cell-input-${rowId}-${column.id}`}
          />
          {editValue.trim().startsWith('=') && (
            <span className="gba:absolute gba:right-2 gba:top-1/2 gba:-translate-y-1/2 gba:text-xs gba:text-muted-foreground">
              fx
            </span>
          )}
        </div>
      ) : (
        <div className="gba:flex gba:items-center gba:gap-1">
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
}

const TableView: React.FC<TableViewProps> = ({
  data,
  columns,
  testId,
  onCellChange: _onCellChange,
  isEditable: _isEditable = true
}) => {
  // Ensure all rows have a unique 'id' property for DataTable (not '_id')
  const dataWithIds = useMemo(() => {
    return data.map((row, index) => ({
      ...row,
      // DataTable requires 'id' property, not '_id'
      id: row.id ?? row._id ?? `row_${index}`
    }))
  }, [data])

  return (
    <Card className="gba:overflow-hidden" data-testid={testId}>
      <DataTable
        columns={columns}
        data={dataWithIds}
      />
    </Card>
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
                <p className="gba:text-sm gba:font-medium gba:text-foreground">
                  {formatCellValue(row[col.name], col)}
                </p>
              </div>
            ))}
          </div>
          <div className="gba:flex gba:gap-2 gba:mt-4 gba:pt-4 gba:border-t">
            <Button variant="outline" size="sm" onClick={() => onEdit(row)}>
              <Pencil className="gba:w-4 gba:h-4 gba:mr-1" />
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(row._id as string)}
            >
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
  const numericColumns = sheet.columns.filter(c =>
    ['number', 'currency', 'percentage'].includes(c.type)
  )

  const kpis = numericColumns.slice(0, 4).map(col => {
    const values = data
      .map(row => Number(row[col.name]))
      .filter(v => !isNaN(v))

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
            <p className="gba:text-sm gba:text-muted-foreground gba:mb-1">
              {kpi.label}
            </p>
            <p className="gba:text-2xl gba:font-bold gba:text-foreground">
              {kpi.value}
            </p>
            <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
              {kpi.subValue}
            </p>
          </Card>
        ))}
      </div>

      {/* Placeholder for charts */}
      <Card className="gba:p-6">
        <div className="gba:flex gba:items-center gba:justify-center gba:h-64 gba:bg-muted/20 gba:rounded-lg">
          <div className="gba:text-center">
            <BarChart3 className="gba:w-12 gba:h-12 gba:text-muted-foreground gba:mx-auto gba:mb-3" />
            <p className="gba:text-muted-foreground">
              Charts visualization coming soon
            </p>
          </div>
        </div>
      </Card>

      {/* Data summary */}
      <Card className="gba:p-6">
        <h3 className="gba:font-semibold gba:text-foreground gba:mb-4">
          Data Summary
        </h3>
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
        <p className="gba:text-muted-foreground">
          Status column not found for Kanban view
        </p>
      </Card>
    )
  }

  // Get unique status values
  const statuses = statusCol.selectOptions?.map(o => o.value) ||
    [...new Set(data.map(row => String(row[statusCol.name] || '')))].filter(Boolean)

  // Group data by status
  const groupedData = statuses.reduce((acc, status) => {
    acc[status] = data.filter(row => String(row[statusCol.name]) === status)
    return acc
  }, {} as Record<string, Record<string, unknown>[]>)

  return (
    <div
      className="gba:flex gba:gap-4 gba:overflow-x-auto gba:pb-4"
      data-testid={testId}
    >
      {statuses.map(status => {
        const statusOption = statusCol.selectOptions?.find(o => o.value === status)
        const items = groupedData[status] || []

        return (
          <div
            key={status}
            className="gba:flex-shrink-0 gba:w-80 gba:bg-muted/30 gba:rounded-lg gba:p-4"
          >
            <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <div
                  className="gba:w-3 gba:h-3 gba:rounded-full"
                  style={{ backgroundColor: statusOption?.color || '#888' }}
                />
                <h3 className="gba:font-medium gba:text-foreground">
                  {statusOption?.label || status}
                </h3>
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
 * Format cell value for display
 */
function formatCellValue(value: unknown, column: SpreadsheetColumn): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="gba:text-muted-foreground">—</span>
  }

  // Handle formula errors
  if (value === '#ERROR!' || (typeof value === 'string' && value.startsWith('#ERROR'))) {
    return <span className="gba:text-destructive">#ERROR!</span>
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
          <Badge
            variant="secondary"
            style={{ backgroundColor: option.color ? `${option.color}20` : undefined }}
          >
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
