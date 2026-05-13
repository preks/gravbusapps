import { touchPendingSpreadsheetSnapshotCheckpointForSheet } from '../spreadsheetSnapshotCheckpointEnqueue'

describe('touchPendingSpreadsheetSnapshotCheckpointForSheet', () => {
  it('records a pending checkpoint per sheet', () => {
    const pending = new Map<string, { requestedAt: number }>()
    touchPendingSpreadsheetSnapshotCheckpointForSheet(pending, 's1', 100)
    touchPendingSpreadsheetSnapshotCheckpointForSheet(pending, 's2', 200)
    expect(pending.get('s1')).toEqual({ requestedAt: 100 })
    expect(pending.get('s2')).toEqual({ requestedAt: 200 })
    expect(pending.size).toBe(2)
  })

  it('coalesces repeated touches for the same sheet by updating requestedAt', () => {
    const pending = new Map<string, { requestedAt: number }>()
    touchPendingSpreadsheetSnapshotCheckpointForSheet(pending, 's1', 100)
    touchPendingSpreadsheetSnapshotCheckpointForSheet(pending, 's1', 500)
    expect(pending.get('s1')).toEqual({ requestedAt: 500 })
    expect(pending.size).toBe(1)
  })
})
