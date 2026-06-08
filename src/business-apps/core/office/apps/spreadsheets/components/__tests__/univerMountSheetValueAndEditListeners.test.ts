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
  shouldSkipDeferredDirtyCellQueueDuringRemoteApplyGuard,
  shouldSuppressGuardedColumnStructuralFormulaFollowUp,
  shouldSuppressGuardedMoveCellFormulaFollowUp,
  shouldTreatGuardedMutationAsLocalUserEdit,
  shouldSuppressGuardedRowMoveFormulaFollowUp,
  shouldDropRemoteEchoDuringApplyGuard,
  shouldScheduleDeferredLocalCellFlush,
  type DeferredDirtyCell
} from '../univerMountSheetValueAndEditListeners'
import {
  isRowDeleteDerivedFormulaFollowUpCollab,
  isRowInsertDerivedFormulaFollowUpCollab,
  isRowMoveDerivedFormulaFollowUpCollab,
  shouldDropStandaloneDeleteRowFormulaFollowUpBatch,
  shouldDropStandaloneInsertRowFormulaFollowUpBatch,
  shouldDropStandaloneMoveRowFormulaFollowUpBatch
} from '../../utils/spreadsheetCutPasteMove'
import { remoteEchoKey, toEchoSignature } from '../univerGridAuthoritativeHelpers'
import { MERGE_WORKSHEET_MUTATION_ID, UNMERGE_WORKSHEET_MUTATION_ID } from '../univerGridMergeCommandIds'
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

  it('treats only non-bulk guarded mutations as deferred local-user edits', () => {
    expect(
      shouldTreatGuardedMutationAsLocalUserEdit({
        isApplyingRemoteUpdate: false,
        currentBulkApplyOperationType: null
      })
    ).toBe(true)
    expect(
      shouldTreatGuardedMutationAsLocalUserEdit({
        isApplyingRemoteUpdate: true,
        currentBulkApplyOperationType: null
      })
    ).toBe(false)
    expect(
      shouldTreatGuardedMutationAsLocalUserEdit({
        isApplyingRemoteUpdate: false,
        currentBulkApplyOperationType: 'authoritative_reapply'
      })
    ).toBe(false)
  })

  it('suppresses guarded row-move formula follow-ups only while a remote row move is applying', () => {
    expect(
      shouldSuppressGuardedRowMoveFormulaFollowUp({
        currentBulkApplyOperationType: 'move_row_slots',
        suppressUntilMs: Date.now() + 500,
        commandId: 'sheet.mutation.set-range-values',
        payloadCellValue: {
          12: { 6: { f: '=SUM(G1:G5)' } }
        },
        ranges: [{ startRow: 12, endRow: 12, startColumn: 6, endColumn: 6 }],
        worksheetId: 'sheet-1',
        recentMove: {
          sheetId: 'sheet-1',
          followUpRanges: [
            {
              startRow: 12,
              endRow: Number.MAX_SAFE_INTEGER,
              startColumn: 0,
              endColumn: Number.MAX_SAFE_INTEGER
            }
          ]
        }
      })
    ).toBe(true)

    expect(
      shouldSuppressGuardedRowMoveFormulaFollowUp({
        currentBulkApplyOperationType: 'authoritative_reapply',
        suppressUntilMs: Date.now() + 500,
        commandId: 'sheet.mutation.set-range-values',
        payloadCellValue: {
          12: { 6: { f: '=SUM(G1:G5)' } }
        },
        ranges: [{ startRow: 12, endRow: 12, startColumn: 6, endColumn: 6 }],
        worksheetId: 'sheet-1',
        recentMove: {
          sheetId: 'sheet-1',
          followUpRanges: [
            {
              startRow: 12,
              endRow: Number.MAX_SAFE_INTEGER,
              startColumn: 0,
              endColumn: Number.MAX_SAFE_INTEGER
            }
          ]
        }
      })
    ).toBe(false)
  })

  it('suppresses guarded move-cell formula follow-ups only while a remote move_cell_range is applying', () => {
    expect(
      shouldSuppressGuardedMoveCellFormulaFollowUp({
        currentBulkApplyOperationType: 'move_cell_range',
        suppressUntilMs: Date.now() + 500,
        commandId: 'sheet.mutation.set-range-values',
        payloadCellValue: {
          13: { 8: { f: '=SUM(H1:H5)' } },
          14: { 8: { f: '=SUM(H2:H6)' } }
        },
        ranges: [{ startRow: 13, endRow: 14, startColumn: 8, endColumn: 8 }],
        worksheetId: 'sheet-1',
        recentMove: {
          sheetId: 'sheet-1',
          fromRange: { startRow: 13, endRow: 13, startColumn: 6, endColumn: 6 },
          toRange: { startRow: 16, endRow: 16, startColumn: 6, endColumn: 6 }
        }
      })
    ).toBe(true)

    expect(
      shouldSuppressGuardedMoveCellFormulaFollowUp({
        currentBulkApplyOperationType: 'move_cell_range',
        suppressUntilMs: Date.now() + 500,
        commandId: 'sheet.mutation.set-range-values',
        payloadCellValue: {
          13: { 8: { f: '=SUM(H1:H5)' } }
        },
        ranges: [{ startRow: 13, endRow: 13, startColumn: 8, endColumn: 8 }],
        worksheetId: 'sheet-1',
        recentMove: {
          sheetId: 'sheet-1',
          fromRange: { startRow: 13, endRow: 13, startColumn: 6, endColumn: 6 },
          toRange: { startRow: 16, endRow: 16, startColumn: 6, endColumn: 6 }
        }
      })
    ).toBe(false)

    expect(
      shouldSuppressGuardedMoveCellFormulaFollowUp({
        currentBulkApplyOperationType: 'column_add',
        suppressUntilMs: Date.now() + 500,
        commandId: 'sheet.mutation.set-range-values',
        payloadCellValue: {
          13: { 8: { f: '=SUM(H1:H5)' } }
        },
        ranges: [{ startRow: 13, endRow: 13, startColumn: 8, endColumn: 8 }],
        worksheetId: 'sheet-1',
        recentMove: {
          sheetId: 'sheet-1',
          fromRange: { startRow: 13, endRow: 13, startColumn: 6, endColumn: 6 },
          toRange: { startRow: 16, endRow: 16, startColumn: 6, endColumn: 6 }
        }
      })
    ).toBe(false)
  })

  it('suppresses guarded column structural formula follow-ups only for the matching remote column operation', () => {
    expect(
      shouldSuppressGuardedColumnStructuralFormulaFollowUp({
        currentBulkApplyOperationType: 'column_add',
        commandId: 'sheet.mutation.set-range-values',
        payloadCellValue: {
          0: { 2: { f: '=SUM(C1:C5)' } },
          1: { 2: { f: '=SUM(C2:C6)' } }
        },
        ranges: [{ startRow: 0, endRow: 1, startColumn: 2, endColumn: 2 }],
        worksheetId: 'sheet-1',
        columnInsertSuppressUntilMs: Date.now() + 500,
        recentInsert: {
          sheetId: 'sheet-1',
          followUpRanges: [
            {
              startRow: 0,
              endRow: Number.MAX_SAFE_INTEGER,
              startColumn: 2,
              endColumn: 3
            }
          ]
        },
        columnDeleteSuppressUntilMs: 0,
        recentDelete: null,
        columnMoveSuppressUntilMs: 0,
        recentMove: null
      })
    ).toBe(true)

    expect(
      shouldSuppressGuardedColumnStructuralFormulaFollowUp({
        currentBulkApplyOperationType: 'column_add',
        commandId: 'sheet.mutation.set-range-values',
        payloadCellValue: {
          0: { 2: { f: '=SUM(C1:C5)' } }
        },
        ranges: [{ startRow: 0, endRow: 0, startColumn: 2, endColumn: 2 }],
        worksheetId: 'sheet-1',
        columnInsertSuppressUntilMs: Date.now() + 500,
        recentInsert: {
          sheetId: 'sheet-1',
          followUpRanges: [
            {
              startRow: 0,
              endRow: Number.MAX_SAFE_INTEGER,
              startColumn: 2,
              endColumn: 3
            }
          ]
        },
        columnDeleteSuppressUntilMs: 0,
        recentDelete: null,
        columnMoveSuppressUntilMs: 0,
        recentMove: null
      })
    ).toBe(false)

    expect(
      shouldSuppressGuardedColumnStructuralFormulaFollowUp({
        currentBulkApplyOperationType: 'columns_reorder',
        commandId: 'sheet.mutation.set-range-values',
        payloadCellValue: {
          0: { 2: { f: '=SUM(C1:C5)' } },
          1: { 2: { f: '=SUM(C2:C6)' } }
        },
        ranges: [{ startRow: 0, endRow: 1, startColumn: 2, endColumn: 2 }],
        worksheetId: 'sheet-1',
        columnInsertSuppressUntilMs: Date.now() + 500,
        recentInsert: {
          sheetId: 'sheet-1',
          followUpRanges: [
            {
              startRow: 0,
              endRow: Number.MAX_SAFE_INTEGER,
              startColumn: 2,
              endColumn: 3
            }
          ]
        },
        columnDeleteSuppressUntilMs: 0,
        recentDelete: null,
        columnMoveSuppressUntilMs: Date.now() + 500,
        recentMove: {
          sheetId: 'sheet-1',
          followUpRanges: [
            {
              startRow: 0,
              endRow: Number.MAX_SAFE_INTEGER,
              startColumn: 2,
              endColumn: Number.MAX_SAFE_INTEGER
            }
          ]
        }
      })
    ).toBe(true)
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

  it('preserves local_user deferred cells inside a bulk-painted region', () => {
    const deferredDirtyCells = new Map<string, DeferredDirtyCell>()
    deferredDirtyCells.set('sheet-1:5:2', {
      row: 5,
      col: 2,
      worksheetId: 'sheet-1',
      origin: 'local_user',
      deferredPayload: { 5: { 2: { v: 'local' } } }
    })
    deferredDirtyCells.set('sheet-1:5:3', { row: 5, col: 3, worksheetId: 'sheet-1' })

    const cleared = clearDeferredDirtyCellsInRegion(deferredDirtyCells, 'sheet-1', {
      minRow: 4,
      maxRow: 6,
      minCol: 0,
      maxCol: 5
    })

    expect(cleared).toBe(1)
    expect(deferredDirtyCells.has('sheet-1:5:2')).toBe(true)
    expect(deferredDirtyCells.has('sheet-1:5:3')).toBe(false)
  })

  it('tags local_user origin when marking deferred cells from guarded mutations', () => {
    const deferredDirtyCells = new Map<
      string,
      { row: number; col: number; worksheetId: string | null; origin?: string; commandId?: string }
    >()
    markDeferredDirtyCellsFromMutation(deferredDirtyCells, [], { 174: { 3: { v: '2' } } }, 'sheet-1', null, undefined, {
      origin: 'local_user',
      commandId: 'sheet.mutation.set-range-values'
    })
    const entry = deferredDirtyCells.get('sheet-1:174:3')
    expect(entry?.origin).toBe('local_user')
    expect(entry?.commandId).toBe('sheet.mutation.set-range-values')
    expect(entry?.deferredPayload).toEqual({ 174: { 3: { v: '2' } } })
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

  it('skips deferred dirty-cell queueing for guarded merge mutations', () => {
    expect(shouldSkipDeferredDirtyCellQueueDuringRemoteApplyGuard(MERGE_WORKSHEET_MUTATION_ID)).toBe(true)
    expect(shouldSkipDeferredDirtyCellQueueDuringRemoteApplyGuard(UNMERGE_WORKSHEET_MUTATION_ID)).toBe(true)
    expect(shouldSkipDeferredDirtyCellQueueDuringRemoteApplyGuard('sheet.mutation.set-range-values')).toBe(false)
  })

  it('treats formula-only row-insert follow-up payloads inside the insert window as suppressible', () => {
    expect(
      isRowInsertDerivedFormulaFollowUpCollab({
        suppressUntilMs: Date.now() + 500,
        commandId: 'sheet.mutation.set-range-values',
        payloadCellValue: {
          2: { 6: { f: null, si: null } },
          3: { 6: { f: '=SUM(A1:A23)' } }
        },
        ranges: [{ startRow: 2, endRow: 3, startColumn: 6, endColumn: 6 }],
        worksheetId: 'sheet-1',
        recentInsert: {
          sheetId: 'sheet-1',
          followUpRanges: [
            {
              startRow: 2,
              endRow: 3,
              startColumn: 0,
              endColumn: Number.MAX_SAFE_INTEGER
            }
          ]
        }
      })
    ).toBe(true)
  })

  it('does not suppress a plain user value edit during the row-insert follow-up window', () => {
    expect(
      isRowInsertDerivedFormulaFollowUpCollab({
        suppressUntilMs: Date.now() + 500,
        commandId: 'sheet.mutation.set-range-values',
        payloadCellValue: {
          2: { 6: { v: 'typed right after insert' } }
        },
        ranges: [{ startRow: 2, endRow: 2, startColumn: 6, endColumn: 6 }],
        worksheetId: 'sheet-1',
        recentInsert: {
          sheetId: 'sheet-1',
          followUpRanges: [
            {
              startRow: 2,
              endRow: 3,
              startColumn: 0,
              endColumn: Number.MAX_SAFE_INTEGER
            }
          ]
        }
      })
    ).toBe(false)

    expect(
      shouldSuppressGuardedColumnStructuralFormulaFollowUp({
        currentBulkApplyOperationType: 'column_delete',
        commandId: 'sheet.mutation.set-range-values',
        payloadCellValue: {
          17: { 9: { f: '=SUM(J8:J9)' } }
        },
        ranges: [{ startRow: 17, endRow: 17, startColumn: 9, endColumn: 9 }],
        worksheetId: 'sheet-1',
        columnInsertSuppressUntilMs: 0,
        recentInsert: null,
        columnDeleteSuppressUntilMs: Date.now() + 500,
        recentDelete: {
          sheetId: 'sheet-1',
          followUpRanges: [
            {
              startRow: 0,
              endRow: Number.MAX_SAFE_INTEGER,
              startColumn: 9,
              endColumn: Number.MAX_SAFE_INTEGER
            }
          ]
        },
        columnMoveSuppressUntilMs: 0,
        recentMove: null
      })
    ).toBe(true)
  })

  it('drops standalone formula-only set_range batches covered by the recent row-insert window', () => {
    expect(
      shouldDropStandaloneInsertRowFormulaFollowUpBatch({
        suppressUntilMs: Date.now() + 500,
        targetSheetId: 'sheet-1',
        recentInsert: {
          sheetId: 'sheet-1',
          followUpRanges: [
            {
              startRow: 2,
              endRow: 3,
              startColumn: 0,
              endColumn: Number.MAX_SAFE_INTEGER
            }
          ]
        },
        operations: [
          {
            type: 'set_range',
            data: {
              cells: [
                {
                  rowId: 'backend-row-1',
                  columnName: 'column_g',
                  value: { f: '=SUM(A1:A23)' },
                  row: 3,
                  col: 6,
                  cellRef: 'G4'
                }
              ]
            }
          }
        ]
      })
    ).toBe(true)
  })

  it('treats formula-only row-delete follow-up payloads inside the delete window as suppressible', () => {
    expect(
      isRowDeleteDerivedFormulaFollowUpCollab({
        suppressUntilMs: Date.now() + 500,
        commandId: 'sheet.mutation.set-range-values',
        payloadCellValue: {
          4: { 0: { f: '=SUM(A1:A4)' } }
        },
        ranges: [{ startRow: 4, endRow: 4, startColumn: 0, endColumn: 0 }],
        worksheetId: 'sheet-1',
        recentDelete: {
          sheetId: 'sheet-1',
          followUpRanges: [
            {
              startRow: 4,
              endRow: Number.MAX_SAFE_INTEGER,
              startColumn: 0,
              endColumn: Number.MAX_SAFE_INTEGER
            }
          ]
        }
      })
    ).toBe(true)
  })

  it('treats formula-only row-move follow-up payloads inside the move window as suppressible', () => {
    expect(
      isRowMoveDerivedFormulaFollowUpCollab({
        suppressUntilMs: Date.now() + 500,
        commandId: 'sheet.mutation.set-range-values',
        payloadCellValue: {
          6: { 0: { f: '=SUM(A1:A4)' } }
        },
        ranges: [{ startRow: 6, endRow: 6, startColumn: 0, endColumn: 0 }],
        worksheetId: 'sheet-1',
        recentMove: {
          sheetId: 'sheet-1',
          followUpRanges: [
            {
              startRow: 2,
              endRow: Number.MAX_SAFE_INTEGER,
              startColumn: 0,
              endColumn: Number.MAX_SAFE_INTEGER
            }
          ]
        }
      })
    ).toBe(true)
  })

  it('drops standalone formula-only delete follow-up batches covered by the recent row-delete window', () => {
    expect(
      shouldDropStandaloneDeleteRowFormulaFollowUpBatch({
        suppressUntilMs: Date.now() + 500,
        targetSheetId: 'sheet-1',
        recentDelete: {
          sheetId: 'sheet-1',
          followUpRanges: [
            {
              startRow: 4,
              endRow: Number.MAX_SAFE_INTEGER,
              startColumn: 0,
              endColumn: Number.MAX_SAFE_INTEGER
            }
          ]
        },
        operations: [
          {
            type: 'set_range',
            data: {
              cells: [{ rowId: 'backend-row-1', columnName: 'column_a', value: { f: '=A1' }, row: 4, col: 0 }]
            }
          }
        ]
      })
    ).toBe(true)
  })

  it('drops standalone formula-only move follow-up batches covered by the recent row-move window', () => {
    expect(
      shouldDropStandaloneMoveRowFormulaFollowUpBatch({
        suppressUntilMs: Date.now() + 500,
        targetSheetId: 'sheet-1',
        recentMove: {
          sheetId: 'sheet-1',
          followUpRanges: [
            {
              startRow: 2,
              endRow: Number.MAX_SAFE_INTEGER,
              startColumn: 0,
              endColumn: Number.MAX_SAFE_INTEGER
            }
          ]
        },
        operations: [
          {
            type: 'set_range',
            data: {
              cells: [{ rowId: 'backend-row-1', columnName: 'column_a', value: { f: '=A1' }, row: 6, col: 0 }]
            }
          }
        ]
      })
    ).toBe(true)
  })
})
