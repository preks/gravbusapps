import { TableRow } from '@tiptap/extension-table-row'
import { CustomTable } from './CustomTable'
import { CustomTableCell } from './CustomTableCell'
import { CustomTableHeader } from './CustomTableHeader'

export { CustomTable, CustomTable as Table, CustomTableCell as TableCell, CustomTableHeader as TableHeader, TableRow }
export {
  TABLE_ALIGNMENTS,
  TABLE_CELL_TEXT_ALIGNMENTS,
  TABLE_CELL_VERTICAL_ALIGNMENTS,
  TABLE_WIDTH_MODES,
  type CustomTableOptions,
  type SetTableLayoutOptions,
  type TableAlignment,
  type TableCellStyleAttributes,
  type TableCellTextAlignment,
  type TableCellVerticalAlignment,
  type TableWidthMode
} from './types'
