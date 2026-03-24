import { mergeAttributes } from '@tiptap/core'
import { TableRow as TiptapTableRow } from '@tiptap/extension-table-row'
import { normalizeCssLength } from './styleUtils'

export const CustomTableRow = TiptapTableRow.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      rowHeight: {
        default: null,
        parseHTML: element =>
          normalizeCssLength(element.getAttribute('data-row-height')) ??
          (element instanceof HTMLElement ? normalizeCssLength(element.style.height) : null),
        renderHTML: attributes => {
          const rowHeight = normalizeCssLength(attributes.rowHeight)
          if (!rowHeight) return {}

          return {
            'data-row-height': rowHeight,
            style: `height: ${rowHeight}`
          }
        }
      }
    }
  },

  renderHTML({ HTMLAttributes }) {
    return ['tr', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  }
})
