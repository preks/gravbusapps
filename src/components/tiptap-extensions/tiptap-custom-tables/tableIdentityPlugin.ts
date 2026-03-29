import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import type { EditorState, Transaction } from '@tiptap/pm/state'

type GenerateIdFn = () => string

interface TableIdentityPluginOptions {
  tableNodeName: string
  rowNodeName: string
  generateId: GenerateIdFn
}

const TABLE_ID_KEY = 'tableId'
const ROW_ID_KEY = 'rowId'

function getAttr(node: ProseMirrorNode, key: string): string | null {
  const value = node.attrs[key]
  return typeof value === 'string' && value.trim().length > 0 ? value : null
}

function ensureTableIdentity(state: EditorState, tr: Transaction, opts: TableIdentityPluginOptions) {
  let modified = false
  const rowIdsByTableId = new Map<string, Set<string>>()

  state.doc.descendants((node, pos) => {
    if (node.type.name !== opts.tableNodeName) return true

    const currentTableId = getAttr(node, TABLE_ID_KEY)
    const tableId = currentTableId ?? opts.generateId()
    if (tableId !== currentTableId) {
      tr.setNodeMarkup(pos, undefined, { ...node.attrs, [TABLE_ID_KEY]: tableId })
      modified = true
    }

    const rowBucket = rowIdsByTableId.get(tableId) ?? new Set<string>()
    rowIdsByTableId.set(tableId, rowBucket)

    const rowIds = new Set<string>()
    node.forEach((child, childOffset) => {
      if (child.type.name !== opts.rowNodeName) return

      const childPos = pos + 1 + childOffset
      let rowId = getAttr(child, ROW_ID_KEY)
      if (!rowId || rowIds.has(rowId) || rowBucket.has(rowId)) {
        rowId = opts.generateId()
      }
      rowIds.add(rowId)
      rowBucket.add(rowId)

      if (rowId !== getAttr(child, ROW_ID_KEY)) {
        tr.setNodeMarkup(childPos, undefined, { ...child.attrs, [ROW_ID_KEY]: rowId }, child.marks)
        modified = true
      }
    })

    return false
  })

  return modified ? tr : null
}

export function createTableIdentityPlugin(options: TableIdentityPluginOptions) {
  const key = new PluginKey('custom-table-identity')

  return new Plugin({
    key,
    view(editorView) {
      const applyIdentity = () => {
        const tr = ensureTableIdentity(editorView.state, editorView.state.tr, options)
        if (tr && tr.docChanged) {
          editorView.dispatch(tr)
        }
      }

      applyIdentity()

      return {
        update: applyIdentity
      }
    },
    appendTransaction(_transactions, oldState, newState) {
      if (oldState.doc === newState.doc) return null
      const tr = newState.tr
      return ensureTableIdentity(newState, tr, options)
    }
  })
}
