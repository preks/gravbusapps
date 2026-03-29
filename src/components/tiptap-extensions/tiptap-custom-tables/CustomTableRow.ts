import { mergeAttributes } from '@tiptap/core'
import { TableRow as TiptapTableRow } from '@tiptap/extension-table-row'
import { normalizeCssLength } from './styleUtils'
import { v4 as uuid } from 'uuid'

export const CustomTableRow = TiptapTableRow.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      rowId: {
        default: () => uuid(),
        parseHTML: element => element.getAttribute('data-row-id') || element.getAttribute('rowid'),
        renderHTML: attributes => {
          const rowId = typeof attributes.rowId === 'string' ? attributes.rowId : null
          return rowId ? { 'data-row-id': rowId } : {}
        }
      },
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
    const rowId = typeof HTMLAttributes.rowId === 'string' ? HTMLAttributes.rowId : HTMLAttributes['data-row-id']
    const merged = {
      ...this.options.HTMLAttributes,
      ...HTMLAttributes,
      ...(rowId ? { 'data-row-id': rowId } : {})
    }

    // Ensure rowId exists when rendering (fallback for pasted rows without plugin pass)
    if (!merged['data-row-id']) {
      merged['data-row-id'] = uuid()
    }

    return ['tr', mergeAttributes(merged), 0]
  }
})
