import { SpreadsheetIntentJournal } from '../spreadsheetIntentJournal'
import { releaseSpreadsheetMutationOwnershipFromResponse } from '../spreadsheetMutationOwnershipRelease'
import { SpreadsheetVersionCausalOwnershipRegistry } from '../spreadsheetVersionCausalOwnership'
import type { SpreadsheetBatchOperation } from '../../services/SpreadsheetApiService'

describe('releaseSpreadsheetMutationOwnershipFromResponse', () => {
  it('acknowledges accepted cells and promotes row mappings', () => {
    const journal = new SpreadsheetIntentJournal()
    const ownership = new SpreadsheetVersionCausalOwnershipRegistry()
    journal.captureIntent({
      sheetId: 'sheet-1',
      logicalRowHandle: 'client_row_1',
      columnName: 'ColumnA',
      value: 'local',
      baseVersion: 4
    })
    ownership.registerIntent({
      sheetId: 'sheet-1',
      logicalRowHandle: 'client_row_1',
      columnName: 'ColumnA',
      baseVersion: 4
    })

    const operations = [
      {
        operationId: 'op-1',
        type: 'set_cell',
        data: { rowId: 'backend-row-1', columnName: 'ColumnA', value: 'local' }
      }
    ] as unknown as SpreadsheetBatchOperation[]

    releaseSpreadsheetMutationOwnershipFromResponse({
      sheetId: 'sheet-1',
      operations,
      response: {
        newVersion: 5,
        results: [{ operationId: 'op-1', status: 'accepted' }],
        rowMappings: [{ clientRowId: 'client_row_1', rowUuid: 'backend-row-1', gridRowIndex: 2 }]
      },
      intentJournal: journal,
      versionCausalOwnership: ownership
    })

    expect(journal.listIntents('sheet-1')[0].state).toBe('acknowledged')
    expect(journal.listIntents('sheet-1')[0].logicalRowHandle).toBe('backend-row-1')
    expect(
      ownership.shouldSuppressRemotePaint({
        sheetId: 'sheet-1',
        rowId: 'backend-row-1',
        columnName: 'ColumnA',
        remoteAppliedVersion: 5
      })
    ).toBe(false)
  })

  it('acknowledges each cleared cell inside set_range operations', () => {
    const ownership = new SpreadsheetVersionCausalOwnershipRegistry()
    ownership.registerIntent({
      sheetId: 'sheet-1',
      logicalRowHandle: 'row-1',
      columnName: 'ColumnA',
      baseVersion: 3
    })
    ownership.registerIntent({
      sheetId: 'sheet-1',
      logicalRowHandle: 'row-2',
      columnName: 'ColumnB',
      baseVersion: 3
    })

    releaseSpreadsheetMutationOwnershipFromResponse({
      sheetId: 'sheet-1',
      operations: [
        {
          operationId: 'op-range',
          type: 'set_range',
          data: {
            cells: [
              { rowId: 'row-1', columnName: 'ColumnA', value: null },
              { rowId: 'row-2', columnName: 'ColumnB', value: null },
              { rowId: 'row-3', columnName: 'ColumnC', value: 'keep' }
            ]
          }
        }
      ] as unknown as SpreadsheetBatchOperation[],
      response: {
        newVersion: 4,
        results: [{ operationId: 'op-range', status: 'accepted' }]
      },
      versionCausalOwnership: ownership
    })

    expect(
      ownership.shouldSuppressRemotePaint({
        sheetId: 'sheet-1',
        rowId: 'row-1',
        columnName: 'ColumnA',
        remoteAppliedVersion: 4
      })
    ).toBe(false)
    expect(
      ownership.shouldSuppressRemotePaint({
        sheetId: 'sheet-1',
        rowId: 'row-2',
        columnName: 'ColumnB',
        remoteAppliedVersion: 4
      })
    ).toBe(false)
  })

  it('rejects conflict cells so server paint is not ownership-blocked', () => {
    const ownership = new SpreadsheetVersionCausalOwnershipRegistry()
    ownership.registerIntent({
      sheetId: 'sheet-1',
      logicalRowHandle: 'row-1',
      columnName: 'ColumnA',
      baseVersion: 3
    })
    ownership.markSubmitted('sheet-1', 'row-1', 'ColumnA')

    releaseSpreadsheetMutationOwnershipFromResponse({
      sheetId: 'sheet-1',
      operations: [
        {
          operationId: 'op-lose',
          type: 'set_cell',
          data: { rowId: 'row-1', columnName: 'ColumnA', value: 'local' }
        }
      ] as unknown as SpreadsheetBatchOperation[],
      response: {
        newVersion: 4,
        results: [
          {
            operationId: 'op-lose',
            status: 'rejected_conflict',
            serverState: [{ rowId: 'row-1', columnName: 'ColumnA', field: 'value', value: 'server' }]
          }
        ]
      },
      versionCausalOwnership: ownership
    })

    expect(
      ownership.shouldSuppressRemotePaint({
        sheetId: 'sheet-1',
        rowId: 'row-1',
        columnName: 'ColumnA',
        remoteAppliedVersion: 4
      })
    ).toBe(false)
  })
})
