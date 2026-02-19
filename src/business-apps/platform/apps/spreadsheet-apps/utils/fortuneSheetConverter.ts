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
import { normalizeImageSrc } from './normalizeImageSrc'

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

  // Map rows (prefer stable UI id; fall back to backend UUID/id)
  data.forEach((row, index) => {
    const rowId = String(row._id ?? row._rowUuid ?? row.id ?? `row_${index}`)
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

  // Handle FortuneSheet cell objects - preserve full object when it contains a formula
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const valueObject = value as Record<string, unknown>
    if ('f' in valueObject) {
      return value
    }
    if ('v' in valueObject) {
      const hasFormattingMetadata = ['bg', 'fc', 'bl', 'it', 'vt', 'ht', 'tb', 'ff', 'fs', 'cl', 'ul', 'strike'].some(
        key => key in valueObject
      )

      if (hasFormattingMetadata) {
        return value
      }

      return valueObject.v
    }
  }

  // Handle any other objects by returning empty string to prevent crashes
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return ''
  }

  return value
}

function isFortuneSheetCellValue(value: unknown): value is FortuneSheetCell {
  return !!value && typeof value === 'object' && !Array.isArray(value) && ('f' in value || 'v' in value)
}

/**
 * Format ISO date/datetime string to human-readable display format
 */
function formatDateTimeForDisplay(value: unknown, isDateOnly: boolean): string {
  if (value === null || value === undefined) return ''
  const str = String(value).trim()
  if (!str) return ''
  try {
    const d = new Date(str)
    if (Number.isNaN(d.getTime())) return str
    if (isDateOnly) {
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    }
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  } catch {
    return str
  }
}

/**
 * Badge-like colors for status cells (aligned with design system semantics)
 * Completed/success=green, Sent/info=blue, Pending/warning=amber, Failed/destructive=red
 */
function getStatusBadgeStyle(value: unknown): { bg?: string; fc?: string } | null {
  if (value === null || value === undefined) return null
  const str = String(value).toLowerCase().trim()
  if (!str) return null
  const statusStyles: Record<string, { bg: string; fc: string }> = {
    completed: { bg: '#dcfce7', fc: '#166534' },
    done: { bg: '#dcfce7', fc: '#166534' },
    sent: { bg: '#dbeafe', fc: '#1e40af' },
    pending: { bg: '#fef3c7', fc: '#92400e' },
    running: { bg: '#dbeafe', fc: '#1e40af' },
    failed: { bg: '#fee2e2', fc: '#991b1b' },
    cancelled: { bg: '#f3f4f6', fc: '#4b5563' }
  }
  const exact = statusStyles[str]
  if (exact) return exact
  // Partial match for custom statuses like "ready for sales"
  if (str.includes('ready') || str.includes('ready for')) return { bg: '#dcfce7', fc: '#166534' }
  if (str.includes('pending') || str.includes('waiting')) return { bg: '#fef3c7', fc: '#92400e' }
  return null
}

/**
 * Convert our column type to FortuneSheet cell type
 */
function getFortuneSheetCellType(columnType: ColumnType): FortuneSheetCell['ct'] {
  switch (columnType) {
    case 'number':
    case 'currency':
    case 'percentage':
      return { t: 'n', fa: columnType === 'currency' ? '€#,##0.00' : columnType === 'percentage' ? '0.00%' : '0.00' }
    case 'date':
      return { t: 'd', fa: 'yyyy-MM-dd' }
    case 'datetime':
      return { t: 'd', fa: 'yyyy-MM-dd HH:mm:ss' }
    case 'boolean':
      return { t: 'b' }
    case 'image':
      return { t: 's' } // Stored as string; avatar drawn via afterRenderCell hook
    default:
      return { t: 's' } // String/text
  }
}

/**
 * Number of rows reserved for the header in FortuneSheet.
 * Row 0 contains column labels; data starts at row 1.
 */
export const HEADER_ROW_OFFSET = 1

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

  // Add header row at row 0 with column labels (bold, gray background)
  columns.forEach((column, colIndex) => {
    const headerCell: FortuneSheetCell = {
      v: column.label || column.name,
      m: column.label || column.name,
      ct: { t: 's' },
      bl: 1, // bold
      bg: '#f0f0f0' // light gray background
    }
    celldata.push({ r: 0, c: colIndex, v: headerCell })
  })

  // Add data rows (starting from row HEADER_ROW_OFFSET)
  // Only populate cells that have data in our defined columns
  data.forEach((row, rowIndex) => {
    columns.forEach((column, colIndex) => {
      const value = getCellValue(row, column)

      // Check if this is a formula
      const isFormula = column.type === 'calculated' && column.formula

      let cell: FortuneSheetCell
      if (isFortuneSheetCellValue(value)) {
        cell = { ...value, tb: value.tb ?? 2 }
        celldata.push({
          r: rowIndex + HEADER_ROW_OFFSET,
          c: colIndex,
          v: cell
        })
      } else if (isFormula && column.formula) {
        // Formula cell - FortuneSheet will evaluate it
        cell = {
          f: column.formula.startsWith('=') ? column.formula : `=${column.formula}`,
          ct: getFortuneSheetCellType(column.type),
          tb: 2
        }
        celldata.push({
          r: rowIndex + HEADER_ROW_OFFSET,
          c: colIndex,
          v: cell
        })
      } else if (value !== null && value !== undefined && value !== '') {
        // URL columns: use HYPERLINK formula so FortuneSheet renders as clickable link
        const isUrlColumn = column.type === 'url' || column.name === '_copy_link'
        if (isUrlColumn) {
          const url = String(value).trim()
          if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/'))) {
            const linkText = column.name === '_copy_link' ? 'View Response' : url
            // Store as plain value with display text - FortuneSheet HYPERLINK doesn't render clickable.
            // We rely on FortuneSheetGrid's click handler to open the URL.
            cell = {
              v: url,
              m: linkText,
              ct: { t: 's' },
              tb: 2
            }
            celldata.push({
              r: rowIndex + HEADER_ROW_OFFSET,
              c: colIndex,
              v: cell
            })
            return
          }
        }

        // Regular value cell - for image type, use empty m so URL isn't shown (avatar drawn via images array)
        const isDateOnly = column.type === 'date'
        const isDateTime = column.type === 'datetime'
        let displayValue: string
        if (column.type === 'image') {
          displayValue = ''
        } else if (column.name === '_responded_at' && isDateTime) {
          // Avoid duplicate date display when responded_at equals sent_at
          const sentAt = row[columns.find(c => c.name === '_sent_at')?.name ?? '_sent_at']
          const valStr = value ? String(value).trim() : ''
          const sentStr = sentAt ? String(sentAt).trim() : ''
          if (valStr && sentStr && valStr === sentStr) {
            displayValue = '—'
          } else {
            displayValue = formatDateTimeForDisplay(value, isDateOnly)
          }
        } else if (isDateTime || isDateOnly) {
          displayValue = formatDateTimeForDisplay(value, isDateOnly)
        } else {
          displayValue = String(value ?? '')
        }
        // Use tb: 0 (no wrap) for short-content columns to prevent row height auto-expansion
        const isTrackingCol =
          column.name?.startsWith('_') ||
          column.type === 'image' ||
          column.type === 'date' ||
          column.type === 'datetime' ||
          column.type === 'url'
        const textWrap = isTrackingCol ? 0 : 2
        cell = {
          v: value as any,
          m: displayValue,
          ct: getFortuneSheetCellType(column.type),
          tb: textWrap
        }
        // Center-align avatar/image cells for consistent layout
        if (column.type === 'image') {
          cell.ht = 1
          cell.vt = 1
        }
        // Right-align date/datetime columns (spreadsheet convention)
        if (column.type === 'date' || column.type === 'datetime') {
          cell.ht = 2
        }
        // Badge-like styling for workflow status and columns named/labeled as status
        const isStatusCol =
          column.type === 'workflow_status' ||
          column.name === '_workflow_status' ||
          /status/i.test(column.name) ||
          (column.label && /status/i.test(column.label))
        if (isStatusCol) {
          const statusStyle = getStatusBadgeStyle(value)
          if (statusStyle) {
            cell.bg = statusStyle.bg
            cell.fc = statusStyle.fc
            cell.ht = 1 // center horizontal
            cell.vt = 1 // center vertical
            cell.bl = 1 // bold for badge emphasis
            cell.tb = 0 // no wrap - keep badge on one line
          }
        }
        celldata.push({
          r: rowIndex + HEADER_ROW_OFFSET,
          c: colIndex,
          v: cell
        })
      }
    })
  })

  // Build column width config - set custom widths for our defined columns
  // Image/avatar columns need min width so avatars center with proper spacing
  const MIN_AVATAR_COL_WIDTH = 64
  const DEFAULT_STATUS_COL_WIDTH = 56
  const LEGACY_DEFAULT_COL_WIDTH = 100
  const columnlen: Record<string, number> = {}
  columns.forEach((column, index) => {
    const isStatusCol =
      column.type === 'workflow_status' ||
      column.name === '_workflow_status' ||
      /status/i.test(column.name) ||
      (column.label && /status/i.test(column.label))
    const hasLegacyDefaultWidth = isStatusCol && column.width === LEGACY_DEFAULT_COL_WIDTH
    const baseWidth =
      column.width === undefined || column.width === null || hasLegacyDefaultWidth
        ? isStatusCol
          ? DEFAULT_STATUS_COL_WIDTH
          : LEGACY_DEFAULT_COL_WIDTH
        : column.width
    const width = column.type === 'image' ? Math.max(MIN_AVATAR_COL_WIDTH, baseWidth) : baseWidth
    columnlen[String(index)] = width
  })

  // Build images array for avatar cells (FortuneSheet native image support per docs)
  // Image coordinates use cell-area space (visibledatacolumn/visibledatarow) - no row/col header offsets
  const AVATAR_SIZE = 24
  const defaultColWidth = 100
  const defaultRowHeight = 19 // Match FortuneSheet default for consistency
  /** Compact height for data rows - fits avatars (24px) and single-line text without excessive padding */
  const DATA_ROW_HEIGHT = 30

  const images: Array<{
    id: string
    src: string
    left: number
    top: number
    width: number
    height: number
    originWidth?: number
    originHeight?: number
  }> = []

  data.forEach((row, rowIndex) => {
    let cumulativeLeft = 0
    columns.forEach((column, colIndex) => {
      const colWidth = columnlen[String(colIndex)] ?? defaultColWidth
      if (column.type === 'image') {
        const value = getCellValue(row, column)
        const rawSrc = value !== null && value !== undefined && value !== '' ? String(value) : null
        const src = rawSrc ? normalizeImageSrc(rawSrc) : null
        // Only add image if src looks valid (URL or base64); skip plain text like 'sdfdf' to avoid broken icons
        const isValidSrc =
          src &&
          (src.startsWith('data:') || src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/'))
        if (isValidSrc) {
          const fsRow = rowIndex + HEADER_ROW_OFFSET
          const cellTop = defaultRowHeight + rowIndex * DATA_ROW_HEIGHT
          const cellLeft = cumulativeLeft
          const top = cellTop + (DATA_ROW_HEIGHT - AVATAR_SIZE) / 2
          const left = cellLeft + (colWidth - AVATAR_SIZE) / 2
          images.push({
            id: `avatar_${fsRow}_${colIndex}_${rowIndex}`,
            src,
            left,
            top,
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
            originWidth: AVATAR_SIZE,
            originHeight: AVATAR_SIZE
          })
        }
      }
      cumulativeLeft += colWidth
    })
  })

  // Ensure celldata is always a valid array (never undefined/null)
  const safeCelldata = Array.isArray(celldata) ? celldata : []

  // Set consistent row heights for header and data rows (prevents FortuneSheet auto-expansion)
  const rowlen: Record<string, number> = {
    '0': 28 // Header row - compact single-line height
  }
  data.forEach((_, rowIndex) => {
    rowlen[String(rowIndex + HEADER_ROW_OFFSET)] = DATA_ROW_HEIGHT
  })

  // Ensure config is always a valid object (FortuneSheet expects `{}` not null/undefined)
  const safeConfig: NonNullable<FortuneSheetConfig['config']> = {
    merge: {},
    rowlen: Object.keys(rowlen).length > 0 ? rowlen : {},
    columnlen: {},
    rowhidden: sheet.settings?.fortuneSheetFilterState?.rowhidden ?? {},
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
  const defaultSelection: {
    row: number[]
    column: number[]
    row_focus: number
    column_focus: number
  } = {
    // Prevent "A1:NaN" on first render by providing a concrete initial selection.
    // FortuneSheet can emit invalid range text when selection arrays are empty.
    row: [0, 0],
    column: [0, 0],
    row_focus: 0,
    column_focus: 0
  }

  const luckysheetSelectSave: Array<{
    row: number[]
    column: number[]
    row_focus?: number
    column_focus?: number
  }> = [defaultSelection]

  const luckysheetSelectionRange: Array<{
    row: number[]
    column: number[]
  }> = [{ row: [0, 0], column: [0, 0] }]

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
    defaultRowHeight: defaultRowHeight, // 19px - FortuneSheet default, prevents oversized rows
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
    filter_select: sheet.settings?.fortuneSheetFilterState?.filter_select ?? {},
    filter: sheet.settings?.fortuneSheetFilterState?.filter ?? null,
    luckysheet_alternateformat_save: [],
    luckysheet_conditionformat_save: [],
    // Additional properties that may be required for proper initialization
    isPivotTable: false,
    pivotTable: {},
    // Freeze the header row so column names stay visible when scrolling
    frozen: { type: 'row', range: { row_focus: 0, column_focus: 0 } },
    chart: [],
    // Luckysheet docs use "image", FortuneSheet code uses "images" - set both for compatibility
    image: images.length > 0 ? images : [],
    images: images.length > 0 ? images : undefined,
    zoomRatio: 1,
    showGridLines: 1
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

  // Convert back to our format (data starts from row HEADER_ROW_OFFSET, row 0 is the header)
  const data: Record<string, unknown>[] = []

  for (let r = HEADER_ROW_OFFSET; r < maxRow; r++) {
    const row: Record<string, unknown> = {}

    // Map FortuneSheet row index back to data index (subtract header offset)
    const dataIndex = r - HEADER_ROW_OFFSET
    // Generate or retrieve row ID
    const rowId = context.rowIndexToId.get(dataIndex) || `row_${dataIndex}`
    row._id = rowId

    columns.forEach((column, c) => {
      const cell = grid[r]?.[c]

      if (!cell) {
        row[column.id] = null
        return
      }

      // Extract value - preserve formulas as full cell objects
      let value: unknown
      if (cell.f) {
        value = {
          v: cell.v,
          f: cell.f,
          m: cell.m,
          ct: cell.ct
        }
      } else {
        value = cell.v
      }

      // Formula cell objects must be preserved as-is regardless of column type
      // so that formulas survive round-trip serialisation.
      if (cell.f) {
        row[column.id] = value
      } else {
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

  const fortuneSheetRowIndex = path[1] as number
  const columnIndex = path[2] as number

  // Account for the header row offset: FortuneSheet row 0 is the header,
  // data rows start at HEADER_ROW_OFFSET
  const dataRowIndex = fortuneSheetRowIndex - HEADER_ROW_OFFSET
  if (dataRowIndex < 0) {
    return null // This is the header row, not a data row
  }

  const rowId = context.rowIndexToId.get(dataRowIndex)
  const columnId = context.columnIndexToId.get(columnIndex)

  if (!rowId || !columnId) {
    return null
  }

  return {
    rowIndex: dataRowIndex,
    columnIndex,
    rowId,
    columnId
  }
}

/**
 * Build FortuneSheet operation path from cell reference
 */
export function buildOperationPath(cellRef: CellReference, property: string = 'v'): (string | number)[] {
  // Add header row offset: data row index 0 maps to FortuneSheet row HEADER_ROW_OFFSET
  return ['data', cellRef.rowIndex + HEADER_ROW_OFFSET, cellRef.columnIndex, property]
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
