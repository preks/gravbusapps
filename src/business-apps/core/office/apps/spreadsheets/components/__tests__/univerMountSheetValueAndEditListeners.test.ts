/**
 * 1e: emit serialization key resolution.
 *
 * Two consecutive emits on the same logical worksheet must serialize on the same key, even
 * when one carries an explicit `worksheetId` and the other does not. Regressing this re-opens
 * the post-flush snapshot race that drops cells under concurrent emits.
 */
import {
  clearDeferredDirtyCellsInRegion,
  EMIT_LITERAL_FALLBACK_KEY,
  isRemoteApplyGuardActive,
  markDeferredDirtyCellsFromCellMatrix,
  markDeferredDirtyCellsFromMutation,
  markDeferredDirtyCellsFromRanges,
  resolveEmitSerializationKey,
  shouldDropRemoteEchoDuringApplyGuard,
  shouldScheduleDeferredLocalCellFlush
} from '../univerMountSheetValueAndEditListeners'
import { remoteEchoKey, toEchoSignature } from '../univerGridAuthoritativeHelpers'
import { normalizeBlankLikeEchoSignature } from '../univerGridWorkbookMutationModule'

describe('resolveEmitSerializationKey', () => {
  it('uses explicit payload worksheetId when present', () => {
    const result = resolveEmitSerializationKey('sheet-1', null, null, null)
    expect(result).toEqual({ key: 'sheet-1', usedLiteralFallback: false })
  })

  it('falls back to facade worksheetId when payload is missing', () => {
    const result = resolveEmitSerializationKey(null, 'sheet-1', null, null)
    expect(result).toEqual({ key: 'sheet-1', usedLiteralFallback: false })
  })

  it('falls back to active worksheet captured at event time when facade is missing', () => {
    const result = resolveEmitSerializationKey(null, null, 'sheet-1', null)
    expect(result).toEqual({ key: 'sheet-1', usedLiteralFallback: false })
  })

  it('falls back to active worksheet at handling time when event-time capture missed', () => {
    const result = resolveEmitSerializationKey(null, null, null, 'sheet-1')
    expect(result).toEqual({ key: 'sheet-1', usedLiteralFallback: false })
  })

  it('uses the literal fallback only when every source is empty', () => {
    const result = resolveEmitSerializationKey(null, null, null, null)
    expect(result).toEqual({ key: EMIT_LITERAL_FALLBACK_KEY, usedLiteralFallback: true })
  })

  it('produces the same key when one event carries id and the next does not (same logical sheet)', () => {
    const first = resolveEmitSerializationKey(null, null, 'sheet-1', 'sheet-1')
    const second = resolveEmitSerializationKey('sheet-1', null, null, null)
    expect(first.key).toBe(second.key)
    expect(first.key).toBe('sheet-1')
  })

  it('treats empty strings as missing instead of selecting them', () => {
    const result = resolveEmitSerializationKey('', '', '', 'sheet-1')
    expect(result).toEqual({ key: 'sheet-1', usedLiteralFallback: false })
  })
})

describe('remote apply guard defer helpers', () => {
  it('detects active remote apply guard from refs', () => {
    const isApplyingRemoteUpdateRef = { current: false }
    const collabPersistedBulkApplyDepthRef = { current: 0 }
    expect(isRemoteApplyGuardActive(isApplyingRemoteUpdateRef, collabPersistedBulkApplyDepthRef)).toBe(false)

    isApplyingRemoteUpdateRef.current = true
    expect(isRemoteApplyGuardActive(isApplyingRemoteUpdateRef, collabPersistedBulkApplyDepthRef)).toBe(true)

    isApplyingRemoteUpdateRef.current = false
    collabPersistedBulkApplyDepthRef.current = 1
    expect(isRemoteApplyGuardActive(isApplyingRemoteUpdateRef, collabPersistedBulkApplyDepthRef)).toBe(true)
  })

  it('marks deferred dirty cells from mutation ranges', () => {
    const deferredDirtyCells = new Map<string, { row: number; col: number; worksheetId: string | null }>()
    markDeferredDirtyCellsFromRanges(
      deferredDirtyCells,
      [{ startRow: 2, endRow: 3, startColumn: 4, endColumn: 5 }],
      'sheet-1',
      null
    )
    expect(Array.from(deferredDirtyCells.keys()).sort()).toEqual([
      'sheet-1:2:4',
      'sheet-1:2:5',
      'sheet-1:3:4',
      'sheet-1:3:5'
    ])
  })

  it('marks deferred dirty cells from cell matrix when ranges are empty', () => {
    const deferredDirtyCells = new Map<string, { row: number; col: number; worksheetId: string | null }>()
    markDeferredDirtyCellsFromCellMatrix(deferredDirtyCells, { 7: { 3: { v: 'hello' } } }, 'sheet-1', null)
    expect(Array.from(deferredDirtyCells.keys())).toEqual(['sheet-1:7:3'])
  })

  it('marks only sparse cell matrix entries when marking deferred dirty cells', () => {
    const deferredDirtyCells = new Map<string, { row: number; col: number; worksheetId: string | null }>()
    markDeferredDirtyCellsFromMutation(deferredDirtyCells, [], { 7: { 3: { v: 'hello' } } }, 'sheet-1', null)
    expect(Array.from(deferredDirtyCells.keys())).toEqual(['sheet-1:7:3'])
  })

  it('does not expand full mutation ranges when cell matrix is present', () => {
    const deferredDirtyCells = new Map<string, { row: number; col: number; worksheetId: string | null }>()
    markDeferredDirtyCellsFromMutation(
      deferredDirtyCells,
      [{ startRow: 0, endRow: 9, startColumn: 0, endColumn: 4 }],
      { 3: { 2: { v: 'only' } } },
      'sheet-1',
      null
    )
    expect(deferredDirtyCells.size).toBe(1)
    expect(deferredDirtyCells.has('sheet-1:3:2')).toBe(true)
  })

  it('skips remote-echo cells when marking deferred dirty cells', () => {
    const deferredDirtyCells = new Map<string, { row: number; col: number; worksheetId: string | null }>()
    const remoteEchoSuppressionRef = {
      current: new Map([
        [
          remoteEchoKey(1, 2),
          {
            expiresAt: Date.now() + 1000,
            signatures: new Set([normalizeBlankLikeEchoSignature(toEchoSignature('remote'))])
          }
        ]
      ])
    }
    markDeferredDirtyCellsFromMutation(
      deferredDirtyCells,
      [{ startRow: 1, endRow: 1, startColumn: 2, endColumn: 2 }],
      { 1: { 2: { v: 'remote' }, 3: { v: 'local' } } },
      'sheet-1',
      null,
      remoteEchoSuppressionRef
    )
    expect(Array.from(deferredDirtyCells.keys())).toEqual(['sheet-1:1:3'])
  })

  it('forces deferred flush after guard-held timeout', () => {
    const now = 100_000
    // Default 60s force-flush threshold: under the threshold we wait for the guard to clear; at
    // or beyond the threshold we force-flush as a main-thread starvation safety valve.
    expect(shouldScheduleDeferredLocalCellFlush(true, now - 59_999, now)).toBe(false)
    expect(shouldScheduleDeferredLocalCellFlush(true, now - 60_000, now)).toBe(true)
    expect(shouldScheduleDeferredLocalCellFlush(false, null, now)).toBe(true)
  })

  it('respects an explicit forceFlushMs override (used by callers/tests)', () => {
    const now = 10_000
    expect(shouldScheduleDeferredLocalCellFlush(true, now - 7_999, now, 8_000)).toBe(false)
    expect(shouldScheduleDeferredLocalCellFlush(true, now - 8_000, now, 8_000)).toBe(true)
  })

  it('clears deferred dirty cells inside a bulk-painted region and leaves outside cells intact', () => {
    const deferredDirtyCells = new Map<string, { row: number; col: number; worksheetId: string | null }>()
    deferredDirtyCells.set('sheet-1:5:2', { row: 5, col: 2, worksheetId: 'sheet-1' })
    deferredDirtyCells.set('sheet-1:5:7', { row: 5, col: 7, worksheetId: 'sheet-1' })
    deferredDirtyCells.set('sheet-1:9:2', { row: 9, col: 2, worksheetId: 'sheet-1' })
    deferredDirtyCells.set('sheet-2:5:2', { row: 5, col: 2, worksheetId: 'sheet-2' })

    const cleared = clearDeferredDirtyCellsInRegion(deferredDirtyCells, 'sheet-1', {
      minRow: 4,
      maxRow: 6,
      minCol: 0,
      maxCol: 3
    })

    expect(cleared).toBe(1)
    expect(Array.from(deferredDirtyCells.keys()).sort()).toEqual(['sheet-1:5:7', 'sheet-1:9:2', 'sheet-2:5:2'])
  })

  it('ignores empty / inverted regions when clearing deferred dirty cells', () => {
    const deferredDirtyCells = new Map<string, { row: number; col: number; worksheetId: string | null }>()
    deferredDirtyCells.set('sheet-1:5:2', { row: 5, col: 2, worksheetId: 'sheet-1' })
    expect(
      clearDeferredDirtyCellsInRegion(deferredDirtyCells, 'sheet-1', {
        minRow: 6,
        maxRow: 4,
        minCol: 0,
        maxCol: 3
      })
    ).toBe(0)
    expect(deferredDirtyCells.size).toBe(1)
  })

  it('drops remote echo mutations during apply guard', () => {
    const remoteEchoSuppressionRef = {
      current: new Map([
        [
          remoteEchoKey(1, 2),
          {
            expiresAt: Date.now() + 1000,
            signatures: new Set([normalizeBlankLikeEchoSignature(toEchoSignature('remote'))])
          }
        ]
      ])
    }
    const cellValue = { 1: { 2: { v: 'remote' } } }
    expect(shouldDropRemoteEchoDuringApplyGuard(cellValue, remoteEchoSuppressionRef)).toBe(true)
    expect(shouldDropRemoteEchoDuringApplyGuard({ 1: { 2: { v: 'local edit' } } }, remoteEchoSuppressionRef)).toBe(
      false
    )
  })
})
