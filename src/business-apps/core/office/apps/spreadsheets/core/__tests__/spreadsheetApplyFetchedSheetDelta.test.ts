import { applyFetchedSheetDeltaToSpreadsheetSession } from '../spreadsheetApplyFetchedSheetDelta'
import { createSpreadsheetSession } from '../createSpreadsheetSession'
import { SpreadsheetSessionMutationSources } from '../SpreadsheetSession'

describe('applyFetchedSheetDeltaToSpreadsheetSession', () => {
  it('applies delta changes and returns sorted rows', () => {
    const sheet = {
      id: 'sheet-1',
      name: 'S',
      columns: [{ id: 'col-1', name: 'Name', type: 'text', label: 'Name' }],
      data: [{ _id: 'row-1', Name: 'Alice' }]
    } as never

    const session = createSpreadsheetSession({
      appId: 'app-1',
      activeSheetId: 'sheet-1',
      sheets: [{ sheet }]
    })

    const next = applyFetchedSheetDeltaToSpreadsheetSession({
      spreadsheetSession: session,
      sheetId: 'sheet-1',
      changes: [
        {
          operationType: 'set_cell',
          payload: { rowId: 'row-1', columnName: 'Name', value: 'Bob' }
        }
      ],
      columns: sheet.columns,
      source: SpreadsheetSessionMutationSources.RemoteApply,
      version: 9,
      baseRows: [{ _id: 'row-1', Name: 'Alice' }],
      targetSheet: sheet
    })

    expect(next).toEqual([{ _id: 'row-1', Name: 'Bob' }])
    expect(session.getSheetState('sheet-1')).toMatchObject({ version: 9 })
  })
})
