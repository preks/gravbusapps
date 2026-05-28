import { SpreadsheetIntentJournal } from '../spreadsheetIntentJournal'

describe('SpreadsheetIntentJournal', () => {
  it('keeps staged intents across identity promotion', () => {
    const journal = new SpreadsheetIntentJournal()
    journal.captureIntent({
      sheetId: 'sheet-1',
      logicalRowHandle: 'client-row-1',
      columnName: 'ColumnA',
      value: 'hello',
      baseVersion: 4
    })

    expect(journal.hasUnresolvedIntents('sheet-1')).toBe(true)

    journal.promoteLogicalRowHandle('client-row-1', 'backend-row-1')
    const [intent] = journal.listIntents('sheet-1')

    expect(intent.logicalRowHandle).toBe('backend-row-1')
    expect(intent.state).toBe('ready')
  })
})
