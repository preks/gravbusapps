/**
 * TipTap UniqueID with legacy HTML parsing for tables:
 * reads `data-table-id` / `data-row-id` when `data-id` is absent (pre-migration exports).
 */
import type { JSONContent } from '@tiptap/core'
import { generateUniqueIds } from '@tiptap/extension-unique-id'
import UniqueID from '@tiptap/extension-unique-id'

const LEGACY_TABLE_ID_ATTR = 'data-table-id'

/** Block and table nodes that receive stable `id` (→ `data-id` in HTML). */
export const DOCUMENT_UNIQUE_ID_TYPES = [
  'paragraph',
  'heading',
  'blockquote',
  'table',
  'bulletList',
  'orderedList',
  'listItem',
  'taskList',
  'taskItem',
  'codeBlock',
  'horizontalRule',
  'pageBreak',
  'documentTableOfContents',
  'signature'
] as const

export const DocumentUniqueID = UniqueID.extend({
  addGlobalAttributes() {
    const attributeName = this.options.attributeName as string
    const dataKey = `data-${attributeName}`

    return [
      {
        types: this.options.types,
        attributes: {
          [attributeName]: {
            default: null,
            parseHTML: element => {
              const direct = element.getAttribute(dataKey)
              if (direct) {
                return direct
              }
              if (element.tagName === 'TABLE') {
                return element.getAttribute(LEGACY_TABLE_ID_ATTR)
              }
              return null
            },
            renderHTML: attributes => {
              if (!attributes[attributeName]) {
                return {}
              }
              return {
                [dataKey]: attributes[attributeName] as string
              }
            }
          }
        }
      }
    ]
  }
}).configure({
  types: [...DOCUMENT_UNIQUE_ID_TYPES],
  attributeName: 'id'
})

/** Server-side or pipeline: ensure `id` on configured node types (same rules as the editor extension). */
export function migrateDocumentJsonWithUniqueIds(doc: JSONContent): JSONContent {
  return generateUniqueIds(doc, [DocumentUniqueID]) as JSONContent
}
