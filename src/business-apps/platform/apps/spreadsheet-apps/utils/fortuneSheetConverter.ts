/**
 * FortuneSheet Data Format Converter
 *
 * Bidirectional conversion between our spreadsheet data format and FortuneSheet format.
 * Preserves formulas, cell types, formatting, and metadata.
 */

import type { SpreadsheetSheet, SpreadsheetColumn, ColumnType } from '../types/spreadsheet'
import type {
  FortuneSheetConfig,
  FortuneSheetCell,
  FortuneSheetWorkbook,
  ConversionContext,
  CellReference
} from '../types/fortuneSheet'

/**
 * Convert Excel column letter to index (A=0, B=1, ..., Z=25, AA=26, etc.)
 */
export function excelColumnToIndex(col: string): number {
  let index = 0
  const upper = col.toUpperCase()
  for (let i = 0; i < upper.length; i++) {
    index = index * 26 + (upper.charCodeAt(i) - 64)
  }
  return index - 1
}

/**
 * Convert index to Excel column letter (0=A, 1=B, ..., 25=Z, 26=AA, etc.)
 */
export function indexToExcelColumn(index: number): string {
  let col = ''
  let num = index + 1
  while (num > 0) {
    const remainder = (num - 1) % 26
    col = String.fromCharCode(65 + remainder) + col
    num = Math.floor((num - 1) / 26)
  }
  return col
}

/**
 * Create conversion context for mapping between formats
 */
export function createConversionContext(
  columns: SpreadsheetColumn[],
  data: Record<string, unknown>[]
): ConversionContext {
  const columnIdToIndex = new Map<string, number>()
  const columnIndexToId = new Map<number, string>()
  const rowIdToIndex = new Map<string, number>()
  const rowIndexToId = new Map<number, string>()
  const excelColToIndex = new Map<string, number>()
  const indexToExcelCol = new Map<number, string>()

  // Map columns
  columns.forEach((col, index) => {
    columnIdToIndex.set(col.id, index)
    columnIndexToId.set(index, col.id)
    const excelCol = indexToExcelColumn(index)
    excelColToIndex.set(excelCol, index)
    indexToExcelCol.set(index, excelCol)
  })

  // Map rows (use _id or generate index-based ID)
  data.forEach((row, index) => {
    const rowId = (row._id as string) || `row_${index}`
    rowIdToIndex.set(rowId, index)
    rowIndexToId.set(index, rowId)
  })

  return {
    columnIdToIndex,
    columnIndexToId,
    rowIdToIndex,
    rowIndexToId,
    excelColToIndex,
    indexToExcelCol
  }
}

/**
 * Get cell value from our data format
 */
function getCellValue(row: Record<string, unknown>, column: SpreadsheetColumn): unknown {
  // Try column name first, then column id
  let value = row[column.name]
  if (value === undefined) {
    value = row[column.id]
  }
  // Try case-insensitive match
  if (value === undefined) {
    const rowKeys = Object.keys(row)
    const matchingKey = rowKeys.find(
      key => key.toLowerCase() === column.name.toLowerCase() || key.toLowerCase() === column.id.toLowerCase()
    )
    if (matchingKey) {
      value = row[matchingKey]
    }
  }

  // Handle FortuneSheet cell objects - extract raw value
  if (value && typeof value === 'object' && !Array.isArray(value) && 'v' in (value as Record<string, unknown>)) {
    return (value as Record<string, unknown>).v
  }

  // Handle any other objects by returning empty string to prevent crashes
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return ''
  }

  return value
}

/**
 * Convert our column type to FortuneSheet cell type
 */
function getFortuneSheetCellType(columnType: ColumnType): FortuneSheetCell['ct'] {
  switch (columnType) {
    case 'number':
    case 'currency':
    case 'percentage':
      return { t: 'n', fa: columnType === 'currency' ? '$#,##0.00' : columnType === 'percentage' ? '0.00%' : '0.00' }
    case 'date':
      return { t: 'd', fa: 'yyyy-MM-dd' }
    case 'datetime':
      return { t: 'd', fa: 'yyyy-MM-dd HH:mm:ss' }
    case 'boolean':
      return { t: 'b' }
    default:
      return { t: 's' } // String/text
  }
}

/**
 * Convert our data format to FortuneSheet format
 */
export function convertToFortuneSheet(
  sheet: SpreadsheetSheet,
  data: Record<string, unknown>[],
  columns: SpreadsheetColumn[]
): FortuneSheetConfig {
  // Context is created but not used in current implementation
  // It may be needed for future formula or validation conversions
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const context = createConversionContext(columns, data)
  const celldata: Array<{ r: number; c: number; v: FortuneSheetCell }> = []

  // Excel-like dimensions: many columns and rows available
  // Excel 2007+ has 16,384 columns (A-XFD) and 1,048,576 rows
  // We'll use a reasonable subset: 100 columns (A-CV) and 1000 rows
  const excelColumns = 100
  const excelRows = 1000

  // No header row - data starts from row 0 (pure Excel behavior)
  // Column letters (A, B, C, etc.) are shown by FortuneSheet's native column headers

  // Add data rows (starting from row 0, pure Excel style)
  // Only populate cells that have data in our defined columns
  data.forEach((row, rowIndex) => {
    columns.forEach((column, colIndex) => {
      const value = getCellValue(row, column)

      // Check if this is a formula
      const isFormula = column.type === 'calculated' && column.formula

      let cell: FortuneSheetCell
      if (isFormula && column.formula) {
        // Formula cell - FortuneSheet will evaluate it
        cell = {
          f: column.formula.startsWith('=') ? column.formula : `=${column.formula}`,
          ct: getFortuneSheetCellType(column.type)
        }
        celldata.push({
          r: rowIndex,
          c: colIndex,
          v: cell
        })
      } else if (value !== null && value !== undefined && value !== '') {
        // Regular value cell
        cell = {
          v: value as any,
          m: String(value ?? ''),
          ct: getFortuneSheetCellType(column.type)
        }
        celldata.push({
          r: rowIndex,
          c: colIndex,
          v: cell
        })
      }
    })
  })

  // Build column width config - set custom widths for our defined columns
  const columnlen: Record<string, number> = {}
  columns.forEach((column, index) => {
    if (column.width) {
      columnlen[String(index)] = column.width
    }
  })

  // Ensure celldata is always a valid array (never undefined/null)
  const safeCelldata = Array.isArray(celldata) ? celldata : []

  // Ensure config is always a valid object (FortuneSheet expects `{}` not null/undefined)
  const safeConfig: NonNullable<FortuneSheetConfig['config']> = {
    merge: {},
    rowlen: {},
    columnlen: {},
    rowhidden: {},
    colhidden: {},
    borderInfo: [],
    authority: {}
  }
  if (Object.keys(columnlen).length > 0) {
    safeConfig.columnlen = columnlen
  }

  // CRITICAL: Based on FortuneSheet documentation and the error we're seeing,
  // luckysheet_select_save should be an empty array [] by default.
  // However, the error "cannot read properties of undefined (reading 'luckysheet_select_save')"
  // suggests that FortuneSheet's internal context object itself is undefined, not just the property.
  // This means FortuneSheet's initialization is failing completely.
  //
  // Let's ensure we provide a minimal valid structure that FortuneSheet can initialize from.
  const luckysheetSelectSave: Array<{
    row: number[]
    column: number[]
    row_focus?: number
    column_focus?: number
  }> = [] // Empty array as per FortuneSheet docs

  const luckysheetSelectionRange: Array<{
    row: number[]
    column: number[]
  }> = [] // Empty array as per FortuneSheet docs

  // Build the complete sheet configuration object
  // All properties must be present and in the correct format for FortuneSheet to initialize properly
  // CRITICAL: Based on FortuneSheet documentation, we need to include ALL properties that might be
  // required for proper context initialization. Missing properties can cause context to be undefined.
  const sheetConfig: FortuneSheetConfig = {
    name: String(sheet.name || 'Sheet1'),
    // FortuneSheet expects `id` to identify the sheet. Keep `index` for backwards
    // compatibility with our type aliasing.
    id: String(sheet.id || 'sheet1'),
    index: String(sheet.id || 'sheet1'),
    // Sheet color (optional but may be needed for initialization)
    color: '',
    // Ensure our sheet is the active one (FortuneSheet expects exactly one `status: 1`)
    status: 1,
    order: 0,
    hide: 0,
    // Excel-like dimensions - MUST be positive integers
    row: Math.max(1, excelRows),
    column: Math.max(1, excelColumns),
    defaultRowHeight: 25, // Excel default is ~25px
    defaultColWidth: 100, // Excel default column width
    // celldata MUST be an array (can be empty)
    celldata: safeCelldata,
    // FortuneSheet expects config to be an object (not null/undefined)
    // This is critical for context initialization
    config: safeConfig,
    // FortuneSheet internal state defaults (important for stable init in prod)
    scrollLeft: 0,
    scrollTop: 0,
    // CRITICAL: These properties MUST be initialized as arrays (even if empty).
    // FortuneSheet's internal context initialization depends on these being present.
    // If they're missing or undefined, context.luckysheet_select_save will be undefined
    // and cause "cannot read properties of undefined" errors when clicking cells.
    // The getSelection() method in FortuneSheet accesses context.luckysheet_select_save
    // so this MUST be an array.
    luckysheet_select_save: luckysheetSelectSave,
    luckysheet_selection_range: luckysheetSelectionRange,
    calcChain: [],
    filter_select: {},
    filter: null,
    luckysheet_alternateformat_save: [],
    luckysheet_conditionformat_save: [],
    // Additional properties that may be required for proper initialization
    isPivotTable: false,
    pivotTable: {},
    frozen: undefined, // Don't set frozen - let FortuneSheet handle it
    chart: [],
    image: [],
    zoomRatio: 1,
    showGridLines: 1
    // No frozen rows - pure Excel behavior (users can freeze rows themselves if needed)
  }

  // Validate that all critical properties are present before returning
  if (!Array.isArray(sheetConfig.luckysheet_select_save)) {
    console.error(
      '[convertToFortuneSheet] luckysheet_select_save must be an array, got:',
      typeof sheetConfig.luckysheet_select_save
    )
    sheetConfig.luckysheet_select_save = []
  }
  if (!Array.isArray(sheetConfig.luckysheet_selection_range)) {
    console.error(
      '[convertToFortuneSheet] luckysheet_selection_range must be an array, got:',
      typeof sheetConfig.luckysheet_selection_range
    )
    sheetConfig.luckysheet_selection_range = []
  }

  // Final validation - ensure all required properties exist
  const requiredProps = [
    'name',
    'id',
    'index',
    'status',
    'row',
    'column',
    'celldata',
    'config',
    'luckysheet_select_save',
    'luckysheet_selection_range',
    'calcChain',
    'filter_select'
  ]

  const missingProps = requiredProps.filter(prop => !(prop in sheetConfig))
  if (missingProps.length > 0) {
    console.error('[convertToFortuneSheet] Missing required properties:', missingProps)
  }

  return sheetConfig
}

/**
 * Convert FortuneSheet format back to our data format
 */
export function convertFromFortuneSheet(
  fortuneSheet: FortuneSheetConfig,
  columns: SpreadsheetColumn[]
): Record<string, unknown>[] {
  const context = createConversionContext(columns, [])

  // Build a 2D array from celldata
  const maxRow = fortuneSheet.row || 0
  const maxCol = fortuneSheet.column || columns.length

  const grid: (FortuneSheetCell | null)[][] = Array(maxRow)
    .fill(null)
    .map(() => Array(maxCol).fill(null))

  // Populate grid from celldata
  if (fortuneSheet.celldata) {
    fortuneSheet.celldata.forEach(({ r, c, v }) => {
      if (r < maxRow && c < maxCol) {
        grid[r][c] = v
      }
    })
  } else if (fortuneSheet.data) {
    // Alternative format: data as 2D array
    fortuneSheet.data.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (r < maxRow && c < maxCol) {
          grid[r][c] = cell
        }
      })
    })
  }

  // Convert back to our format (data starts from row 0, no header row)
  const data: Record<string, unknown>[] = []

  for (let r = 0; r < maxRow; r++) {
    const row: Record<string, unknown> = {}

    // Generate or retrieve row ID
    const rowId = context.rowIndexToId.get(r) || `row_${r}`
    row._id = rowId

    columns.forEach((column, c) => {
      const cell = grid[r]?.[c]

      if (!cell) {
        row[column.id] = null
        return
      }

      // Extract value - prefer calculated result over stored value for formulas
      let value: unknown
      if (cell.f) {
        // Formula cell - use the calculated value (v) if available
        value = cell.v
      } else {
        value = cell.v
      }

      // Convert based on column type
      switch (column.type) {
        case 'number':
        case 'currency':
        case 'percentage':
          row[column.id] = typeof value === 'number' ? value : parseFloat(String(value ?? '0'))
          break
        case 'boolean':
          row[column.id] = Boolean(value)
          break
        case 'date':
        case 'datetime':
          row[column.id] = value
          break
        default:
          row[column.id] = value
      }

      // Also set by column name for compatibility
      if (column.name !== column.id) {
        row[column.name] = row[column.id]
      }
    })

    data.push(row)
  }

  return data
}

/**
 * Convert multiple sheets to FortuneSheet workbook
 */
export function convertToFortuneSheetWorkbook(
  sheets: Array<{ sheet: SpreadsheetSheet; data: Record<string, unknown>[]; columns: SpreadsheetColumn[] }>
): FortuneSheetWorkbook {
  return {
    sheets: sheets.map(({ sheet, data, columns }) => convertToFortuneSheet(sheet, data, columns))
  }
}

/**
 * Parse cell reference from FortuneSheet operation path
 * Path format: ["data", rowIndex, colIndex, property]
 */
export function parseCellReferenceFromPath(
  path: (string | number)[],
  context: ConversionContext
): CellReference | null {
  if (path.length < 3 || path[0] !== 'data') {
    return null
  }

  const rowIndex = path[1] as number
  const columnIndex = path[2] as number

  // No header row - direct mapping
  const rowId = context.rowIndexToId.get(rowIndex)
  const columnId = context.columnIndexToId.get(columnIndex)

  if (!rowId || !columnId) {
    return null
  }

  return {
    rowIndex,
    columnIndex,
    rowId,
    columnId
  }
}

/**
 * Build FortuneSheet operation path from cell reference
 */
export function buildOperationPath(cellRef: CellReference, property: string = 'v'): (string | number)[] {
  return ['data', cellRef.rowIndex, cellRef.columnIndex, property] // Direct mapping, no header row
}

/**
 * Extract formula dependencies from cell reference
 * Converts Excel-style references (A1, B2) to our column IDs
 */
export function extractFormulaDependencies(formula: string, context: ConversionContext): string[] {
  const dependencies: string[] = []

  // Match Excel-style cell references (A1, B2, etc.)
  const cellRefRegex = /\b([A-Z]+)([0-9]+)\b/g
  let match

  while ((match = cellRefRegex.exec(formula)) !== null) {
    const colLetter = match[1]
    // rowNum is not used currently but kept for potential future row-based validation
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const rowNum = parseInt(match[2], 10)

    const colIndex = context.excelColToIndex.get(colLetter)
    const columnId = colIndex !== undefined ? context.columnIndexToId.get(colIndex) : undefined

    if (columnId) {
      dependencies.push(columnId)
    }
  }

  return dependencies
}
