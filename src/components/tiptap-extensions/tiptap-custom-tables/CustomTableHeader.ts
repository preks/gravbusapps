import { mergeAttributes } from '@tiptap/core'
import { TableHeader as TiptapTableHeader } from '@tiptap/extension-table-header'
import { createCustomCellAttributes } from './cellAttributes'
import { getCellStyle, normalizeCellTextAlign, normalizeCellVerticalAlign, normalizeColorValue } from './styleUtils'

export const CustomTableHeader = TiptapTableHeader.extend({
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

    return ['th', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, style ? { style } : {}), 0]
  }
})
