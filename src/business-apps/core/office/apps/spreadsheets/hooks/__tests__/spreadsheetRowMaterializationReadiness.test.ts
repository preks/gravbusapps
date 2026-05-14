import { createSpreadsheetRowMaterializationReadiness } from '../spreadsheetRowMaterializationReadiness'

describe('spreadsheetRowMaterializationReadiness', () => {
  it('awaits an in-flight temp row and resolves it before session merge', async () => {
    const readiness = createSpreadsheetRowMaterializationReadiness()
    let resolvePending: ((backendRowId: string) => void) | undefined
    const pendingPromise = new Promise<string>(resolve => {
      resolvePending = resolve
    })

    readiness.registerPending('sheet-1', 'client_row_1', pendingPromise)

    const awaiting = readiness.awaitTemporaryRowsReadyForSubmit({
      sheetId: 'sheet-1',
      clientRowIds: ['client_row_1'],
      getLatestSnapshotRows: () => null,
      materializeRowsFromSnapshot: jest.fn(async () => undefined)
    })

    readiness.resolve('sheet-1', 'client_row_1', 'backend-row-1')
    resolvePending?.('backend-row-1')

    await expect(awaiting).resolves.toEqual({
      resolved: new Map([['client_row_1', 'backend-row-1']]),
      unresolved: []
    })
  })

  it('blocks when a temp row id cannot be found in the latest snapshot', async () => {
    const readiness = createSpreadsheetRowMaterializationReadiness()
    const materializeRowsFromSnapshot = jest.fn(async () => undefined)

    const result = await readiness.awaitTemporaryRowsReadyForSubmit({
      sheetId: 'sheet-1',
      clientRowIds: ['client_row_1'],
      getLatestSnapshotRows: () => null,
      materializeRowsFromSnapshot
    })

    expect(materializeRowsFromSnapshot).not.toHaveBeenCalled()
    expect(result).toEqual({
      resolved: new Map(),
      unresolved: [
        {
          clientRowId: 'client_row_1',
          status: 'not_found_in_latest_snapshot',
          reason: 'Temporary row id was not found in the latest authoritative snapshot'
        }
      ]
    })
  })

  it('supports batched row-create responses for multiple temp rows', async () => {
    const readiness = createSpreadsheetRowMaterializationReadiness()
    const materializeRowsFromSnapshot = jest.fn(
      async ({
        sheetId,
        clientRowIds,
        rows
      }: {
        sheetId: string
        clientRowIds: string[]
        rows: Array<Record<string, unknown>>
      }) => {
        expect(sheetId).toBe('sheet-1')
        expect(clientRowIds).toEqual(['client_row_1', 'client_row_2'])
        expect(rows).toEqual([
          expect.objectContaining({ _id: 'client_row_1', _gridRowIndex: 4 }),
          expect.objectContaining({ _id: 'client_row_2', _gridRowIndex: 5 })
        ])

        const batchPromise = Promise.resolve(
          new Map([
            ['client_row_1', 'backend-row-1'],
            ['client_row_2', 'backend-row-2']
          ])
        )
        readiness.registerPendingBatch(sheetId, clientRowIds, batchPromise)
        readiness.resolveMany(sheetId, await batchPromise)
      }
    )

    const result = await readiness.awaitTemporaryRowsReadyForSubmit({
      sheetId: 'sheet-1',
      clientRowIds: ['client_row_1', 'client_row_2'],
      getLatestSnapshotRows: () => [
        { _id: 'client_row_1', _gridRowIndex: 4, ColumnA: 'a' },
        { _id: 'client_row_2', _gridRowIndex: 5, ColumnA: 'b' }
      ],
      materializeRowsFromSnapshot
    })

    expect(materializeRowsFromSnapshot).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      resolved: new Map([
        ['client_row_1', 'backend-row-1'],
        ['client_row_2', 'backend-row-2']
      ]),
      unresolved: []
    })
  })
})
