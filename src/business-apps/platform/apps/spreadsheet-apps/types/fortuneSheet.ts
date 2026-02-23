/**
 * FortuneSheet Type Definitions
 *
 * TypeScript interfaces for FortuneSheet data structures and integration.
 */

/**
 * FortuneSheet cell data structure
 */
export interface FortuneSheetCell {
  /** Cell value */
  v?: string | number | boolean
  /** Cell text (for display) */
  m?: string
  /** Cell type: text, number, boolean, etc */
  ct?: {
    fa?: string // Format attribute
    t?: 'n' | 's' | 'b' | 'd' | 'g' // Number, string, boolean, date, general
  }
  /** Formula */
  f?: string
  /** Style */
  s?: number
  /** Font weight */
  bl?: 0 | 1 // Bold
  /** Italic */
  it?: 0 | 1
  /** Font family */
  ff?: string
  /** Font size */
  fs?: number
  /** Font color */
  fc?: string
  /** Background color */
  bg?: string
  /** Horizontal alignment */
  ht?: 0 | 1 | 2 // left, center, right
  /** Vertical alignment */
  vt?: 0 | 1 | 2 // top, middle, bottom
  /** Text wrap */
  tb?: 0 | 1 | 2
  /** Merge cell info */
  mc?: {
    r: number // Row
    c: number // Column
    rs: number // Row span
    cs: number // Column span
  }
}

/**
 * FortuneSheet configuration (single sheet)
 */
export interface FortuneSheetConfig {
  /** Sheet name */
  name: string
  /** Sheet id (FortuneSheet primary key) */
  id?: string
  /** Sheet index */
  index: string
  /** Sheet status (0=normal, 1=hidden) */
  status?: 0 | 1
  /** Sheet order */
  order?: number
  /** Whether worksheet is hidden */
  hide?: 0 | 1
  /** Row count */
  row?: number
  /** Column count */
  column?: number
  /** Default row height */
  defaultRowHeight?: number
  /** Default column width */
  defaultColWidth?: number
  /** Cell data (row-indexed array) */
  celldata?: Array<{
    r: number // Row index
    c: number // Column index
    v: FortuneSheetCell // Cell value
  }>
  /** Alternative: data as 2D array */
  data?: Array<Array<FortuneSheetCell | null>>
  /** Config: frozen rows/columns */
  frozen?: {
    type?: 'row' | 'column' | 'both' | 'range' | 'rangeRow' | 'rangeColumn'
    range?: {
      row_focus?: number
      column_focus?: number
    }
  }
  /** Column widths */
  config?: {
    columnlen?: Record<string, number>
    rowlen?: Record<string, number>
    merge?: Record<string, { r: number; c: number; rs: number; cs: number }>
    rowhidden?: Record<string, number>
    colhidden?: Record<string, number>
    borderInfo?: any[]
    authority?: Record<string, unknown>
  }
  /** Calculate chain for formula dependencies */
  calcChain?: Array<{
    r: number
    c: number
    id: string
  }>

  // --- FortuneSheet internal state (important for initialization) ---
  /** Horizontal scroll position */
  scrollLeft?: number
  /** Vertical scroll position */
  scrollTop?: number
  /** Selected area (defaults to []) */
  luckysheet_select_save?: Array<{
    row: number[]
    column: number[]
    row_focus?: number
    column_focus?: number
  }>
  /** Selection range (defaults to []) */
  luckysheet_selection_range?: Array<{
    row: number[]
    column: number[]
  }>
  /** Filter range (defaults to {}) */
  filter_select?: { row: number[]; column: number[] } | Record<string, unknown>
  /** Filter configuration (defaults to null) */
  filter?: unknown | null
  /** Alternate colors (defaults to []) */
  luckysheet_alternateformat_save?: unknown[]
  /** Conditional format (defaults to []) */
  luckysheet_conditionformat_save?: unknown[]
  /** Images (avatars, inserted images) - see FortuneSheet sheet.image docs */
  images?: Array<{
    id: string
    src: string
    left: number
    top: number
    width: number
    height: number
    originWidth?: number
    originHeight?: number
  }>
}

/**
 * FortuneSheet workbook (multiple sheets)
 */
export interface FortuneSheetWorkbook {
  /** All sheets in the workbook */
  sheets: FortuneSheetConfig[]
}

/**
 * FortuneSheet operation structure (emitted via onOp)
 */
export interface FortuneSheetOp {
  /** Operation type */
  op: 'add' | 'remove' | 'replace' | 'insertRowCol' | 'deleteRowCol' | 'addSheet' | 'deleteSheet'
  /** Sheet ID */
  id?: string
  /** Path to the value being modified */
  path: (string | number)[]
  /** New value */
  value?: any
  /** Additional operation data */
  data?: {
    type?: 'row' | 'column'
    index?: number
    count?: number
    direction?: 'lefttop' | 'rightbottom'
    start?: number
    end?: number
  }
}

/**
 * Cell reference in our system
 */
export interface CellReference {
  rowIndex: number
  columnIndex: number
  rowId: string
  columnId: string
}

/**
 * Conversion context for mapping between formats
 */
export interface ConversionContext {
  /** Column ID to index mapping */
  columnIdToIndex: Map<string, number>
  /** Column index to ID mapping */
  columnIndexToId: Map<number, string>
  /** Column ID to name mapping (row data is keyed by column name) */
  columnIdToName: Map<string, string>
  /** Row ID to index mapping */
  rowIdToIndex: Map<string, number>
  /** Row index to ID mapping */
  rowIndexToId: Map<number, string>
  /** Excel column letter to index */
  excelColToIndex: Map<string, number>
  /** Index to Excel column letter */
  indexToExcelCol: Map<number, string>
}
