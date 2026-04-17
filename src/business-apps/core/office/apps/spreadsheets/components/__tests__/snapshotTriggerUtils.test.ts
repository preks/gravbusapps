import { VALUE_MUTATION_SNAPSHOT_SUPPRESSION_MS, shouldScheduleSnapshotForMutation } from '../snapshotTriggerUtils'

describe('snapshotTriggerUtils', () => {
  it('does not schedule snapshots for mutations carrying cell values', () => {
    expect(
      shouldScheduleSnapshotForMutation({
        commandType: 2,
        mutationCommandType: 2,
        commandId: 'sheet.command.set-range-values',
        params: { cellValue: { 0: { 0: { v: 'Edited' } } } },
        now: 10_000,
        lastCellValueMutationAt: 0
      })
    ).toBe(false)
  })

  it('does not schedule snapshots right after a cell value mutation', () => {
    expect(
      shouldScheduleSnapshotForMutation({
        commandType: 2,
        mutationCommandType: 2,
        commandId: 'sheet.command.set-range-values',
        params: {},
        now: 10_000,
        lastCellValueMutationAt: 10_000 - VALUE_MUTATION_SNAPSHOT_SUPPRESSION_MS + 1
      })
    ).toBe(false)
  })

  it('still schedules snapshots for non-value workbook mutations', () => {
    expect(
      shouldScheduleSnapshotForMutation({
        commandType: 2,
        mutationCommandType: 2,
        commandId: 'sheet.command.set-range-bold',
        params: {},
        now: 10_000,
        lastCellValueMutationAt: 0
      })
    ).toBe(true)
  })

  it('does not schedule snapshots for recognized value-mutation commands even if they fire first', () => {
    expect(
      shouldScheduleSnapshotForMutation({
        commandType: 2,
        mutationCommandType: 2,
        commandId: 'sheet.command.set-range-values',
        params: {},
        now: 10_000,
        lastCellValueMutationAt: 0
      })
    ).toBe(false)
  })

  it('does not schedule snapshots for unknown mutation commands by default', () => {
    expect(
      shouldScheduleSnapshotForMutation({
        commandType: 2,
        mutationCommandType: 2,
        commandId: 'sheet.command.unknown-mutation',
        params: {},
        now: 10_000,
        lastCellValueMutationAt: 0
      })
    ).toBe(false)
  })
})
