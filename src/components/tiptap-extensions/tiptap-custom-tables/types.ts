import type { TableOptions as TiptapTableOptions } from '@tiptap/extension-table'

export const TABLE_ALIGNMENTS = ['left', 'center', 'right'] as const
export const TABLE_WIDTH_MODES = ['manual', 'auto-fit-window', 'auto-fit-content'] as const
export const TABLE_CELL_TEXT_ALIGNMENTS = ['left', 'center', 'right', 'justify'] as const
export const TABLE_CELL_VERTICAL_ALIGNMENTS = ['top', 'middle', 'bottom'] as const
export const TABLE_BORDER_STYLES = ['none', 'solid', 'dashed', 'dotted', 'double'] as const
export const TABLE_THEMES = ['blue', 'teal', 'green', 'orange', 'purple', 'gray'] as const

export type TableAlignment = (typeof TABLE_ALIGNMENTS)[number]
export type TableWidthMode = (typeof TABLE_WIDTH_MODES)[number]
export type TableCellTextAlignment = (typeof TABLE_CELL_TEXT_ALIGNMENTS)[number]
export type TableCellVerticalAlignment = (typeof TABLE_CELL_VERTICAL_ALIGNMENTS)[number]
export type TableBorderStyle = (typeof TABLE_BORDER_STYLES)[number]
export type TableTheme = (typeof TABLE_THEMES)[number]

export interface CustomTableOptions extends TiptapTableOptions {
  defaultTableWidth: string
  defaultTableAlign: TableAlignment
  defaultTableWidthMode: TableWidthMode
}

export interface SetTableLayoutOptions {
  width?: string
  align?: TableAlignment
  mode?: TableWidthMode
}

export interface SetTableStyleOptions {
  theme?: TableTheme
  styleHeaderRow?: boolean
  styleFirstColumn?: boolean
  styleLastColumn?: boolean
  styleBandedRows?: boolean
  styleBandedColumns?: boolean
  tableBackgroundColor?: string | null
  tableBorderStyle?: TableBorderStyle | null
  tableBorderWidth?: string | null
  tableBorderColor?: string | null
  tableBorderRadius?: string | null
}

export interface TableSurfaceStyleAttributes {
  tableBackgroundColor?: string | null
  tableBorderStyle?: TableBorderStyle | null
  tableBorderWidth?: string | null
  tableBorderColor?: string | null
  tableBorderRadius?: string | null
}

export interface TableBorderSideAttributes {
  borderTopStyle?: TableBorderStyle | null
  borderTopWidth?: string | null
  borderTopColor?: string | null
  borderRightStyle?: TableBorderStyle | null
  borderRightWidth?: string | null
  borderRightColor?: string | null
  borderBottomStyle?: TableBorderStyle | null
  borderBottomWidth?: string | null
  borderBottomColor?: string | null
  borderLeftStyle?: TableBorderStyle | null
  borderLeftWidth?: string | null
  borderLeftColor?: string | null
}

export interface TableCellStyleAttributes extends TableBorderSideAttributes {
  cellTextAlign?: TableCellTextAlignment | null
  cellVerticalAlign?: TableCellVerticalAlignment | null
  backgroundColor?: string | null
  borderColor?: string | null
}
