/**
 * Ensures each table row has a unique `id` within its table (paste/split edge cases).
 * Table-level ids come from TipTap UniqueID; rows are excluded from that extension.
 */
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorState, Transaction } from '@tiptap/pm/state'
import { v4 as uuid } from 'uuid'

import { isYjsInboundSyncTransaction } from '@/components/tiptap-extensions/yjsProsemirrorSync'

function ensureUniqueRowIds(state: EditorState, tr: Transaction, rowNodeName: string): boolean {
  let modified = false
  const seenByTable = new Map<string, Set<string>>()

  state.doc.descendants((node, pos) => {
    if (node.type.name !== 'table') {
      return true
    }

    const tableKey = typeof node.attrs.id === 'string' && node.attrs.id.length > 0 ? node.attrs.id : `table:${pos}`
    const bucket = seenByTable.get(tableKey) ?? new Set<string>()
    seenByTable.set(tableKey, bucket)

    const rowIdsInPass = new Set<string>()

    node.forEach((child, offset) => {
      if (child.type.name !== rowNodeName) {
        return
      }

      const childPos = pos + 1 + offset
      let childId = typeof child.attrs.id === 'string' ? child.attrs.id : null

      if (!childId || rowIdsInPass.has(childId) || bucket.has(childId)) {
        childId = uuid()
      }

      rowIdsInPass.add(childId)
      bucket.add(childId)

      if (childId !== child.attrs.id) {
        tr.setNodeMarkup(childPos, undefined, { ...child.attrs, id: childId }, child.marks)
        modified = true
      }
    })

    return false
  })

  return modified
}

export function createTableRowIdentityPlugin(rowNodeName: string) {
  return new Plugin({
    key: new PluginKey('custom-table-row-identity'),
    appendTransaction(transactions, _oldState, newState) {
      if (!transactions.some(tx => tx.docChanged)) {
        return null
      }

      if (transactions.some(tx => isYjsInboundSyncTransaction(tx))) {
        return null
      }

      const tr = newState.tr
      const changed = ensureUniqueRowIds(newState, tr, rowNodeName)
      return changed ? tr : null
    }
  })
}
