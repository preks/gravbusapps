import { mergeAttributes } from '@tiptap/core'
import { TableRow as TiptapTableRow } from '@tiptap/extension-table-row'
import { v4 as uuid } from 'uuid'
import { normalizeCssLength } from './styleUtils'

export const CustomTableRow = TiptapTableRow.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      id: {
        default: () => uuid(),
        parseHTML: element =>
          element.getAttribute('data-id') || element.getAttribute('data-row-id') || element.getAttribute('rowid'),
        renderHTML: attributes => {
          const id = typeof attributes.id === 'string' ? attributes.id : null
          return id ? { 'data-id': id, 'data-row-id': id } : {}
        }
      },
      /** @deprecated Yjs/legacy only; identity is `id`. Cleared after migration. */
      rowId: {
        default: null,
        parseHTML: element => element.getAttribute('data-row-id') || element.getAttribute('rowid'),
        renderHTML: () => ({})
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
    const id =
      (typeof HTMLAttributes.id === 'string' && HTMLAttributes.id) ||
      (typeof HTMLAttributes['data-id'] === 'string' && HTMLAttributes['data-id']) ||
      null
    const merged = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)
    if (id) {
      merged['data-row-id'] = id
    }

    return ['tr', mergeAttributes(merged), 0]
  }
})
