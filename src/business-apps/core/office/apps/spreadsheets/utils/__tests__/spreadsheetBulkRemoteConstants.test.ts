import {
  SPREADSHEET_BULK_BACKLOG_CELL_THRESHOLD,
  SPREADSHEET_BULK_BACKLOG_OPERATION_TYPES,
  SPREADSHEET_BULK_RAF_BUDGET_MS,
  SPREADSHEET_BULK_RAF_BUDGET_MS_CATCHUP,
  isBacklogBulkApply
} from '../spreadsheetBulkRemoteConstants'

describe('spreadsheetBulkRemoteConstants', () => {
  it('catch-up RAF budget is strictly larger than the live budget so backlogs drain faster', () => {
    expect(SPREADSHEET_BULK_RAF_BUDGET_MS_CATCHUP).toBeGreaterThan(SPREADSHEET_BULK_RAF_BUDGET_MS)
  })

  it('backlog operation types are limited to one-shot drain sources', () => {
    expect(Array.from(SPREADSHEET_BULK_BACKLOG_OPERATION_TYPES).sort()).toEqual(
      ['add_rows_replay', 'authoritative_reapply', 'catch_up_materialized'].sort()
    )
  })

  describe('isBacklogBulkApply', () => {
    it('returns false when operationType is missing', () => {
      expect(isBacklogBulkApply(undefined, 10_000)).toBe(false)
    })

    it('returns false for live collab cell ops regardless of cell count', () => {
      expect(isBacklogBulkApply('cell_delta', 10_000)).toBe(false)
      expect(isBacklogBulkApply('set_cell', 10_000)).toBe(false)
    })

    it('returns false for backlog ops below the cell threshold (small bulks stay on live budget)', () => {
      expect(isBacklogBulkApply('authoritative_reapply', SPREADSHEET_BULK_BACKLOG_CELL_THRESHOLD - 1)).toBe(false)
    })

    it('returns true at the threshold for known backlog operation types', () => {
      expect(isBacklogBulkApply('authoritative_reapply', SPREADSHEET_BULK_BACKLOG_CELL_THRESHOLD)).toBe(true)
      expect(isBacklogBulkApply('catch_up_materialized', SPREADSHEET_BULK_BACKLOG_CELL_THRESHOLD + 500)).toBe(true)
      expect(isBacklogBulkApply('add_rows_replay', 5_000)).toBe(true)
    })
  })
})
