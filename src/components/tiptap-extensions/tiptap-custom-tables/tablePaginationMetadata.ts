import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { isYjsInboundSyncTransaction } from '@/components/tiptap-extensions/yjsProsemirrorSync'
import { createPaginationChainId, getTableId } from './tablePaginationIdentity'
import { getSerializedTableRowGroups } from './tablePaginationUtils'

const tablePaginationMetadataKey = new PluginKey('custom-table-pagination-metadata')

function normalizePaginationRowGroups(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function normalizePaginationChainId(value: unknown) {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

function getNextPaginationRowGroups(table: ProseMirrorNode) {
  return getSerializedTableRowGroups(table)
}

export function createTablePaginationMetadataPlugin(tableNodeName: string) {
  return new Plugin({
    key: tablePaginationMetadataKey,
    appendTransaction(transactions, _oldState, newState) {
      if (!transactions.some(transaction => transaction.docChanged)) {
        return null
      }

      if (transactions.some(transaction => isYjsInboundSyncTransaction(transaction))) {
        return null
      }

      const tr = newState.tr
      let modified = false

      newState.doc.descendants((node, pos) => {
        if (node.type.name !== tableNodeName) {
          return true
        }

        const currentValue = normalizePaginationRowGroups(node.attrs.paginationRowGroups)
        const nextValue = getNextPaginationRowGroups(node)
        const currentChainId = normalizePaginationChainId(node.attrs.paginationChainId)
        const tableId = getTableId(node)
        const nextChainId = currentChainId ?? tableId ?? createPaginationChainId()

        if (currentValue !== nextValue || currentChainId !== nextChainId) {
          tr.setNodeMarkup(pos, undefined, {
            ...node.attrs,
            paginationChainId: nextChainId,
            paginationRowGroups: nextValue
          })
          modified = true
        }

        return false
      })

      return modified ? tr : null
    }
  })
}
