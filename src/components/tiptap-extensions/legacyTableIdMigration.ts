/**
 * One-time migration: copy legacy `tableId` / `rowId` attrs into UniqueID `id`
 * and clear legacy fields. Skips Yjs inbound apply transactions to avoid follow-up
 * appendTransaction churn that re-triggers table repagination during collaboration.
 */
import { Extension } from '@tiptap/core'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'

import { isYjsInboundSyncTransaction } from '@/components/tiptap-extensions/yjsProsemirrorSync'

function collectLegacyIdMigrations(doc: ProseMirrorNode): Array<{ pos: number; attrs: Record<string, unknown> }> {
  const out: Array<{ pos: number; attrs: Record<string, unknown> }> = []

  doc.descendants((node, pos) => {
    if (node.type.name === 'table') {
      const legacy = node.attrs.tableId
      const id = node.attrs.id
      if (typeof legacy === 'string' && legacy.length > 0 && (id == null || id === '')) {
        out.push({ pos, attrs: { ...node.attrs, id: legacy, tableId: null } })
      }
    }
    if (node.type.name === 'tableRow') {
      const legacy = node.attrs.rowId
      const id = node.attrs.id
      if (typeof legacy === 'string' && legacy.length > 0 && (id == null || id === '')) {
        out.push({ pos, attrs: { ...node.attrs, id: legacy, rowId: null } })
      }
    }
  })

  return out
}

export const legacyTableIdMigrationExtension = Extension.create({
  name: 'legacyTableIdMigration',
  priority: 10001,

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('legacyTableIdMigration'),
        appendTransaction(transactions, _oldState, newState) {
          if (!transactions.some(tx => tx.docChanged)) {
            return null
          }

          if (transactions.some(tx => isYjsInboundSyncTransaction(tx))) {
            return null
          }

          const ops = collectLegacyIdMigrations(newState.doc)
          if (ops.length === 0) {
            return null
          }

          ops.sort((a, b) => b.pos - a.pos)

          let tr = newState.tr
          for (const op of ops) {
            tr = tr.setNodeMarkup(op.pos, undefined, op.attrs)
          }

          return tr
        }
      })
    ]
  }
})
