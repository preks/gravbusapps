import type { Transaction } from '@tiptap/pm/state'
import { ySyncPluginKey } from '@tiptap/y-tiptap'

import { isYjsInboundSyncTransaction } from '../yjsProsemirrorSync'

function mockTr(meta: unknown): Transaction {
  return {
    getMeta: (key: unknown) => (key === ySyncPluginKey ? meta : undefined)
  } as Transaction
}

describe('isYjsInboundSyncTransaction', () => {
  it('is true when y-prosemirror applies a Yjs update (_typeChanged)', () => {
    expect(isYjsInboundSyncTransaction(mockTr({ isChangeOrigin: true, isUndoRedoOperation: false }))).toBe(true)
  })

  it('is false for snapshot render transactions', () => {
    expect(isYjsInboundSyncTransaction(mockTr({ isChangeOrigin: true, snapshot: {}, prevSnapshot: {} }))).toBe(false)
  })

  it('is false for binding-only force rerender meta', () => {
    expect(isYjsInboundSyncTransaction(mockTr({ isChangeOrigin: true, binding: {} }))).toBe(false)
  })

  it('is false when there is no y-sync meta', () => {
    expect(
      isYjsInboundSyncTransaction({
        getMeta: () => undefined
      } as Transaction)
    ).toBe(false)
  })
})
