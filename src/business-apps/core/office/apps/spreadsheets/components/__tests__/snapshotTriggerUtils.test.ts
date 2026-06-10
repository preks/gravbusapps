import {
  VALUE_MUTATION_SNAPSHOT_SUPPRESSION_MS,
  isClearAllRangeCommand,
  isDimensionSnapshotSideEffectCommand,
  isDimensionSnapshotUserCommand,
  isStyleOnlySheetMutationCommand,
  isUnsupportedSnapshotOnlyCollaborationCommand,
  shouldRunDimensionSnapshotForCommand,
  shouldScheduleSnapshotForMutation
} from '../snapshotTriggerUtils'

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

  it('schedules snapshots for formatting COMMANDs (type 0) such as bold', () => {
    expect(
      shouldScheduleSnapshotForMutation({
        commandType: 0,
        mutationCommandType: 2,
        commandId: 'sheet.command.set-range-bold',
        params: {},
        now: 10_000,
        lastCellValueMutationAt: 10_000
      })
    ).toBe(true)
  })

  it('does not schedule snapshots for selection COMMANDs', () => {
    expect(
      shouldScheduleSnapshotForMutation({
        commandType: 0,
        mutationCommandType: 2,
        commandId: 'sheet.command.selection-move',
        params: {},
        now: 10_000,
        lastCellValueMutationAt: 0
      })
    ).toBe(false)
  })

  it('does not run dimension snapshots for high-volume edit and selection commands', () => {
    expect(shouldRunDimensionSnapshotForCommand('sheet.mutation.set-range-values', 2)).toBe(false)
    expect(shouldRunDimensionSnapshotForCommand('sheet.operation.set-cell-edit-visible', 0)).toBe(false)
    expect(shouldRunDimensionSnapshotForCommand('sheet.operation.set-cell-edit-visible-arrow', 0)).toBe(false)
    expect(shouldRunDimensionSnapshotForCommand('sheet.mutation.move-selection', 2)).toBe(false)
    expect(shouldRunDimensionSnapshotForCommand('sheet.command.selection-move', 0)).toBe(false)
    expect(shouldRunDimensionSnapshotForCommand('sheet.command.set-value', 0)).toBe(false)
  })

  it('runs dimension snapshots for layout-affecting commands', () => {
    expect(shouldRunDimensionSnapshotForCommand('sheet.command.resize-column', 0)).toBe(true)
    expect(shouldRunDimensionSnapshotForCommand('sheet.command.set-column-width', 0)).toBe(true)
    expect(shouldRunDimensionSnapshotForCommand('sheet.command.set-row-height', 0)).toBe(true)
    expect(shouldRunDimensionSnapshotForCommand('sheet.command.delta-row-height', 0)).toBe(true)
    expect(shouldRunDimensionSnapshotForCommand('sheet.command.delta-column-width', 0)).toBe(true)
    expect(shouldRunDimensionSnapshotForCommand('sheet.command.zoom-in', 0)).toBe(true)
    expect(shouldRunDimensionSnapshotForCommand('sheet.command.set-col-auto-width', 0)).toBe(true)
    expect(shouldRunDimensionSnapshotForCommand('sheet.command.set-row-is-auto-height', 0)).toBe(true)
    expect(shouldRunDimensionSnapshotForCommand('sheet.command.insert-column-right', 0)).toBe(true)
    expect(shouldRunDimensionSnapshotForCommand('sheet.command.delete-column', 0)).toBe(true)
    expect(shouldRunDimensionSnapshotForCommand('sheet.command.insert-row-before', 0)).toBe(true)
    expect(shouldRunDimensionSnapshotForCommand('sheet.command.delete-row', 0)).toBe(true)
    expect(shouldRunDimensionSnapshotForCommand('sheet.command.set-rows-hidden', 0)).toBe(true)
    expect(shouldRunDimensionSnapshotForCommand('sheet.command.set-selected-rows-visible', 0)).toBe(true)
    expect(shouldRunDimensionSnapshotForCommand('sheet.mutation.set-col-hidden', 2)).toBe(true)
    expect(shouldRunDimensionSnapshotForCommand('sheet.command.set-selected-cols-visible', 0)).toBe(true)
  })

  it('does not run dimension snapshots for side-effect auto-height mutations', () => {
    expect(shouldRunDimensionSnapshotForCommand('sheet.mutation.set-worksheet-row-auto-height', 2)).toBe(false)
    expect(shouldRunDimensionSnapshotForCommand('sheet.mutation.set-worksheet-col-width', 2)).toBe(false)
    expect(shouldRunDimensionSnapshotForCommand('sheet.operation.mark-dirty-row-auto-height', 0)).toBe(false)
    expect(shouldRunDimensionSnapshotForCommand('sheet.operation.cancel-mark-dirty-row-auto-height', 0)).toBe(false)
  })

  it('classifies dimension commands for allowlist and denylist helpers', () => {
    expect(isDimensionSnapshotUserCommand('sheet.command.set-row-height')).toBe(true)
    expect(isDimensionSnapshotUserCommand('sheet.command.set-col-auto-width')).toBe(true)
    expect(isDimensionSnapshotUserCommand('sheet.command.zoom-in')).toBe(false)
    expect(isDimensionSnapshotSideEffectCommand('sheet.mutation.set-worksheet-row-auto-height')).toBe(true)
    expect(isDimensionSnapshotSideEffectCommand('sheet.command.set-row-height')).toBe(false)
  })

  it('classifies style-only mutation commands for batch gating', () => {
    expect(isStyleOnlySheetMutationCommand('sheet.command.set-range-bold')).toBe(true)
    expect(isStyleOnlySheetMutationCommand('sheet.command.set-range-values')).toBe(false)
  })

  it('does not mark planned feature operations as snapshot-only once they have granular collaboration ops', () => {
    expect(isUnsupportedSnapshotOnlyCollaborationCommand('sheet.command.merge-cell')).toBe(false)
    expect(isUnsupportedSnapshotOnlyCollaborationCommand('sheet.command.freeze')).toBe(false)
    expect(isUnsupportedSnapshotOnlyCollaborationCommand('sheet.command.protect-range')).toBe(false)
    expect(isUnsupportedSnapshotOnlyCollaborationCommand('sheet.command.set-range-bold')).toBe(false)
  })

  describe('isClearAllRangeCommand', () => {
    it('matches Univer ClearSelectionAllCommand', () => {
      expect(isClearAllRangeCommand('sheet.command.clear-selection-all')).toBe(true)
    })

    it('matches case-insensitive variants', () => {
      expect(isClearAllRangeCommand('sheet.command.CLEAR-SELECTION-ALL')).toBe(true)
    })

    it('does not match clear-content (values only)', () => {
      expect(isClearAllRangeCommand('sheet.command.clear-selection-content')).toBe(false)
    })

    it('does not match clear-format (style only)', () => {
      expect(isClearAllRangeCommand('sheet.command.clear-selection-format')).toBe(false)
    })

    it('does not match unrelated commands', () => {
      expect(isClearAllRangeCommand('sheet.command.set-range-values')).toBe(false)
      expect(isClearAllRangeCommand('sheet.command.set-range-bold')).toBe(false)
      expect(isClearAllRangeCommand('')).toBe(false)
    })
  })
})
