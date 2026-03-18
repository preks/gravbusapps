import type { TableOptions as TiptapTableOptions } from '@tiptap/extension-table'

export const TABLE_ALIGNMENTS = ['left', 'center', 'right'] as const
export const TABLE_WIDTH_MODES = ['manual', 'auto-fit-window', 'auto-fit-content'] as const
export const TABLE_CELL_TEXT_ALIGNMENTS = ['left', 'center', 'right', 'justify'] as const
export const TABLE_CELL_VERTICAL_ALIGNMENTS = ['top', 'middle', 'bottom'] as const

export type TableAlignment = (typeof TABLE_ALIGNMENTS)[number]
export type TableWidthMode = (typeof TABLE_WIDTH_MODES)[number]
export type TableCellTextAlignment = (typeof TABLE_CELL_TEXT_ALIGNMENTS)[number]
export type TableCellVerticalAlignment = (typeof TABLE_CELL_VERTICAL_ALIGNMENTS)[number]

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

export interface TableCellStyleAttributes {
  cellTextAlign?: TableCellTextAlignment | null
  cellVerticalAlign?: TableCellVerticalAlignment | null
  backgroundColor?: string | null
  borderColor?: string | null
}
