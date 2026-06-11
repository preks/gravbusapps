import { deltaChangesIncludeManagerReplayOps, sheetDeltaRequiresFullSnapshot } from '../spreadsheetCollaborationSync'

describe('sheetDeltaRequiresFullSnapshot', () => {
  it('returns true when server requires full snapshot', () => {
    expect(
      sheetDeltaRequiresFullSnapshot(1, {
        currentVersion: 2,
        changes: [{ operationType: 'set_cell', appliedVersion: 2, payload: {} }],
        requiresSnapshot: true
      })
    ).toBe(true)
  })

  it('returns false when current version did not advance', () => {
    expect(
      sheetDeltaRequiresFullSnapshot(5, {
        currentVersion: 5,
        changes: [],
        requiresSnapshot: false
      })
    ).toBe(false)
  })

  it('returns true when change list is empty but version advanced', () => {
    expect(
      sheetDeltaRequiresFullSnapshot(1, {
        currentVersion: 3,
        changes: [],
        requiresSnapshot: false
      })
    ).toBe(true)
  })

  it('returns false for a single version-only advance with no replay changes', () => {
    expect(
      sheetDeltaRequiresFullSnapshot(1, {
        currentVersion: 2,
        changes: [],
        requiresSnapshot: false
      })
    ).toBe(false)
  })

  it('returns true when min applied version leaves a gap after sinceVersion', () => {
    expect(
      sheetDeltaRequiresFullSnapshot(1, {
        currentVersion: 5,
        changes: [
          { operationType: 'set_cell', appliedVersion: 3, payload: {} },
          { operationType: 'set_cell', appliedVersion: 4, payload: {} }
        ],
        requiresSnapshot: false
      })
    ).toBe(true)
  })

  it('returns false for contiguous replay from sinceVersion+1', () => {
    expect(
      sheetDeltaRequiresFullSnapshot(1, {
        currentVersion: 2,
        changes: [{ operationType: 'set_cell', appliedVersion: 2, payload: {} }],
        requiresSnapshot: false
      })
    ).toBe(false)
  })

  it('recognizes feature operation deltas as manager replay operations', () => {
    expect(
      deltaChangesIncludeManagerReplayOps([
        {
          operationType: 'protect_ranges_update',
          appliedVersion: 2,
          payload: { sheetId: 'sheet-1' }
        }
      ])
    ).toBe(true)
  })
})
