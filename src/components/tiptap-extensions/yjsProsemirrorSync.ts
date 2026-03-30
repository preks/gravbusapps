import type { Transaction } from '@tiptap/pm/state'
import { ySyncPluginKey } from '@tiptap/y-tiptap'

type YSyncMeta = {
  isChangeOrigin?: boolean
  isUndoRedoOperation?: boolean
  snapshot?: unknown
  prevSnapshot?: unknown
  binding?: unknown
} | null

/**
 * True when the transaction was dispatched by y-prosemirror while applying a Yjs
 * update from the CRDT (remote peers or cross-tab sync). Local typing does not use this shape.
 *
 * @see y-tiptap ProsemirrorBinding._typeChanged — dispatches with isChangeOrigin + isUndoRedoOperation.
 */
export function isYjsInboundSyncTransaction(tr: Transaction): boolean {
  const m = tr.getMeta(ySyncPluginKey) as YSyncMeta
  if (m == null || typeof m !== 'object') {
    return false
  }

  return (
    m.isChangeOrigin === true && m.snapshot === undefined && m.prevSnapshot === undefined && 'isUndoRedoOperation' in m
  )
}
