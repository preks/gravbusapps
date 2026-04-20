import { mergeAttributes } from '@tiptap/core'
import { TableHeader as TiptapTableHeader } from '@tiptap/extension-table-header'
import { createCustomCellAttributes } from './cellAttributes'
import { getCellStyle, getNormalizedCellStyleAttributes } from './styleUtils'

export const CustomTableHeader = TiptapTableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      ...createCustomCellAttributes()
    }
  },

  renderHTML({ node, HTMLAttributes }) {
    const style = getCellStyle(getNormalizedCellStyleAttributes(node.attrs))

    return ['th', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, style ? { style } : {}), 0]
  }
})
