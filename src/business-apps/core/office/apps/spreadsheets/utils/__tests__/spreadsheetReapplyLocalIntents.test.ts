import { SpreadsheetIntentJournal } from '../../core/spreadsheetIntentJournal'
import { reapplyUnresolvedLocalIntentsToRows } from '../spreadsheetReapplyLocalIntents'

describe('reapplyUnresolvedLocalIntentsToRows', () => {
  it('reapplies only staged intents validated against the reloaded version', () => {
    const journal = new SpreadsheetIntentJournal()
    journal.captureIntent({
      sheetId: 'sheet-1',
      logicalRowHandle: 'row-a',
      columnName: 'ColumnA',
      value: 'local',
      baseVersion: 8
    })
    journal.captureIntent({
      sheetId: 'sheet-1',
      logicalRowHandle: 'row-a',
      columnName: 'ColumnB',
      value: 'acked',
      baseVersion: 8
    })
    journal.markAcknowledged({
      sheetId: 'sheet-1',
      logicalRowHandle: 'row-a',
      columnName: 'ColumnB',
      appliedVersion: 9
    })

    const rows = reapplyUnresolvedLocalIntentsToRows(
      [{ _rowUuid: 'row-a', ColumnA: 'remote', ColumnB: 'keep' }],
      journal.listIntents('sheet-1'),
      { sheetId: 'sheet-1', reloadedVersion: 9 }
    )

    expect(rows[0].ColumnA).toBe('local')
    expect(rows[0].ColumnB).toBe('keep')
  })

  it('does not reapply acknowledged or rejected intents', () => {
    const journal = new SpreadsheetIntentJournal()
    journal.captureIntent({
      sheetId: 'sheet-1',
      logicalRowHandle: 'row-a',
      columnName: 'ColumnA',
      value: 'stale-local',
      baseVersion: 8
    })
    journal.captureIntent({
      sheetId: 'sheet-1',
      logicalRowHandle: 'row-a',
      columnName: 'ColumnB',
      value: 'rejected-local',
      baseVersion: 8
    })
    journal.markAcknowledged({
      sheetId: 'sheet-1',
      logicalRowHandle: 'row-a',
      columnName: 'ColumnA',
      appliedVersion: 9
    })
    journal.markRejected({
      sheetId: 'sheet-1',
      logicalRowHandle: 'row-a',
      columnName: 'ColumnB'
    })

    const rows = reapplyUnresolvedLocalIntentsToRows(
      [{ _rowUuid: 'row-a', ColumnA: 'server-a', ColumnB: 'server-b' }],
      journal.listIntents('sheet-1'),
      { sheetId: 'sheet-1', reloadedVersion: 9 }
    )

    expect(rows[0].ColumnA).toBe('server-a')
    expect(rows[0].ColumnB).toBe('server-b')
  })
})
