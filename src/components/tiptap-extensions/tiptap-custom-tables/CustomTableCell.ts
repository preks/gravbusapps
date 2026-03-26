import { mergeAttributes } from '@tiptap/core'
import { TableCell as TiptapTableCell } from '@tiptap/extension-table-cell'
import { createCustomCellAttributes } from './cellAttributes'
import { getCellStyle, getNormalizedCellStyleAttributes } from './styleUtils'

export const CustomTableCell = TiptapTableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...createCustomCellAttributes()
    }
  },

  renderHTML({ node, HTMLAttributes }) {
    const style = getCellStyle(getNormalizedCellStyleAttributes(node.attrs))

    return ['td', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, style ? { style } : {}), 0]
  }
})
