import {
  didAuthoritativeCellPersistenceSettle,
  shouldMarkDirtyForSnapshotLifecycle
} from '../spreadsheetPersistenceSemantics'

describe('spreadsheetPersistenceSemantics', () => {
  it('does not keep the sheet dirty for cell-origin snapshot scheduling', () => {
    expect(
      shouldMarkDirtyForSnapshotLifecycle({
        phase: 'checkpoint_scheduled',
        origin: 'cell'
      })
    ).toBe(false)

    expect(
      shouldMarkDirtyForSnapshotLifecycle({
        phase: 'checkpoint_settled',
        ok: false,
        origin: 'cell'
      })
    ).toBe(false)
  })

  it('keeps workbook-origin snapshot changes dirty until checkpoint success', () => {
    expect(
      shouldMarkDirtyForSnapshotLifecycle({
        phase: 'checkpoint_scheduled',
        origin: 'workbook'
      })
    ).toBe(true)

    expect(
      shouldMarkDirtyForSnapshotLifecycle({
        phase: 'checkpoint_settled',
        ok: false,
        origin: 'workbook'
      })
    ).toBe(true)
  })

  it('treats authoritative cell persistence as settled once the queue and debounce timer are clear', () => {
    expect(
      didAuthoritativeCellPersistenceSettle({
        hasPendingCellPersistence: false,
        hasPendingCellPersistTimer: false
      })
    ).toBe(true)

    expect(
      didAuthoritativeCellPersistenceSettle({
        hasPendingCellPersistence: true,
        hasPendingCellPersistTimer: false
      })
    ).toBe(false)

    expect(
      didAuthoritativeCellPersistenceSettle({
        hasPendingCellPersistence: false,
        hasPendingCellPersistTimer: true
      })
    ).toBe(false)
  })
})
