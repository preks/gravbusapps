import {
  getRecentLocalSnapshotMutation,
  isSnapshotMutatingOperationType,
  markRecentLocalSnapshotMutation,
  shouldSkipActiveSheetSnapshotHydration,
  shouldDeferHydrationForRecentLocalSnapshotMutation
} from '../spreadsheetRecentLocalSnapshotMutation'

describe('spreadsheetRecentLocalSnapshotMutation', () => {
  it('classifies snapshot-mutating operation types', () => {
    expect(isSnapshotMutatingOperationType('set_style')).toBe(true)
    expect(isSnapshotMutatingOperationType('column_update')).toBe(true)
    expect(isSnapshotMutatingOperationType('set_col_width')).toBe(true)
    expect(isSnapshotMutatingOperationType('set_cell')).toBe(false)
  })

  it('tracks recent local snapshot mutations until they expire', () => {
    const state = new Map()
    markRecentLocalSnapshotMutation(state, 'sheet-1', 'set_style', 1_000, 1_000)

    const activeEntry = getRecentLocalSnapshotMutation(state, 'sheet-1', 1_500)
    expect(activeEntry).not.toBeNull()
    expect(activeEntry?.sources.has('set_style')).toBe(true)

    expect(getRecentLocalSnapshotMutation(state, 'sheet-1', 2_001)).toBeNull()
  })

  it('defers focus hydration only for the active sheet while the guard is active', () => {
    const state = new Map()
    markRecentLocalSnapshotMutation(state, 'sheet-1', 'dimension', 5_000, 2_000)

    expect(
      shouldDeferHydrationForRecentLocalSnapshotMutation({
        state,
        targetSheetId: 'sheet-1',
        activeSheetId: 'sheet-1',
        reason: 'focus',
        now: 2_100
      })
    ).toBe(true)

    expect(
      shouldDeferHydrationForRecentLocalSnapshotMutation({
        state,
        targetSheetId: 'sheet-1',
        activeSheetId: 'sheet-1',
        reason: 'sheet_switch',
        now: 2_100
      })
    ).toBe(false)

    expect(
      shouldDeferHydrationForRecentLocalSnapshotMutation({
        state,
        targetSheetId: 'sheet-2',
        activeSheetId: 'sheet-1',
        reason: 'focus',
        now: 2_100
      })
    ).toBe(false)
  })

  it('skips focus hydration for active sheet when only snapshot drift remains', () => {
    expect(
      shouldSkipActiveSheetSnapshotHydration({
        reason: 'focus',
        isActiveTargetSheet: true,
        localOperationVersion: 10,
        serverOperationVersion: 10,
        localSheetSnapshotVersion: 4,
        serverSheetSnapshotVersion: 5
      })
    ).toBe(true)

    expect(
      shouldSkipActiveSheetSnapshotHydration({
        reason: 'focus',
        isActiveTargetSheet: true,
        localOperationVersion: 9,
        serverOperationVersion: 10,
        localSheetSnapshotVersion: 4,
        serverSheetSnapshotVersion: 5
      })
    ).toBe(false)

    expect(
      shouldSkipActiveSheetSnapshotHydration({
        reason: 'sheet_switch',
        isActiveTargetSheet: true,
        localOperationVersion: 10,
        serverOperationVersion: 10,
        localSheetSnapshotVersion: 4,
        serverSheetSnapshotVersion: 5
      })
    ).toBe(false)
  })
})
