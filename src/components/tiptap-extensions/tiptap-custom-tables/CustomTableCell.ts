import { mergeAttributes } from '@tiptap/core'
import { TableCell as TiptapTableCell } from '@tiptap/extension-table-cell'
import { createCustomCellAttributes } from './cellAttributes'
import { getCellStyle, normalizeCellTextAlign, normalizeCellVerticalAlign, normalizeColorValue } from './styleUtils'

export const CustomTableCell = TiptapTableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...createCustomCellAttributes()
    }
  },

  renderHTML({ HTMLAttributes }) {
    const style = getCellStyle({
      cellTextAlign: normalizeCellTextAlign(HTMLAttributes.cellTextAlign as string | null),
      cellVerticalAlign: normalizeCellVerticalAlign(HTMLAttributes.cellVerticalAlign as string | null),
      backgroundColor: normalizeColorValue(HTMLAttributes.backgroundColor as string | null),
      borderColor: normalizeColorValue(HTMLAttributes.borderColor as string | null)
    })

    return ['td', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, style ? { style } : {}), 0]
  }
})
