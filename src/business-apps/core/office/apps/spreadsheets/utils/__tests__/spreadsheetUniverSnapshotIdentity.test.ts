import { remapBatchOperationsWithUiToBackendRowMap } from '../spreadsheetBatchOperationRowRemap'
import { buildUiToBackendRowIdMap } from '../spreadsheetRowIdentity'
import { detectTemporaryRowIdsInKnownRowIdFields } from '../spreadsheetUnifiedBatchSubmitUtils'
import { patchLatestUniverSnapshotRowBackendIdentities } from '../spreadsheetUniverSnapshotIdentity'

const isUuid = (value: string): boolean => value.startsWith('backend-')

describe('patchLatestUniverSnapshotRowBackendIdentities', () => {
  it('patches latest Univer rows with backend identity by client row id', () => {
    const latestRows = [{ _id: 'client-row-1', _gridRowIndex: 4, ColumnA: 'value 1' }]
    const authoritativeRows = [
      { _id: 'client-row-1', _clientRowId: 'client-row-1', _rowUuid: 'backend-row-1', _gridRowIndex: 4 }
    ]

    expect(
      patchLatestUniverSnapshotRowBackendIdentities({
        latestRows,
        authoritativeRows,
        persistedIdByClientRowId: new Map([['client-row-1', 'backend-row-1']]),
        isUuid
      })
    ).toEqual([
      {
        _id: 'backend-row-1',
        _clientRowId: 'client-row-1',
        _rowUuid: 'backend-row-1',
        _gridRowIndex: 4,
        ColumnA: 'value 1'
      }
    ])
  })

  it('falls back to visual index only for rows without a client identity', () => {
    const latestRows = [{ _gridRowIndex: 9, ColumnA: 'value 9' }]
    const authoritativeRows = [
      { _id: 'client-row-9', _clientRowId: 'client-row-9', _rowUuid: 'backend-row-9', _gridRowIndex: 9 }
    ]

    expect(
      patchLatestUniverSnapshotRowBackendIdentities({
        latestRows,
        authoritativeRows,
        persistedIdByClientRowId: new Map([['client-row-9', 'backend-row-9']]),
        isUuid
      })
    ).toEqual([
      {
        _id: 'backend-row-9',
        _clientRowId: 'client-row-9',
        _rowUuid: 'backend-row-9',
        _gridRowIndex: 9,
        ColumnA: 'value 9'
      }
    ])
  })

  it('enables unified batch remap to remove temporary row ids from set_range payloads', () => {
    const patchedRows = patchLatestUniverSnapshotRowBackendIdentities({
      latestRows: [{ _id: 'client-row-5', _gridRowIndex: 5, ColumnA: 'value 5' }],
      authoritativeRows: [
        { _id: 'client-row-5', _clientRowId: 'client-row-5', _rowUuid: 'backend-row-5', _gridRowIndex: 5 }
      ],
      persistedIdByClientRowId: new Map([['client-row-5', 'backend-row-5']]),
      isUuid
    })

    const uiToBackend = buildUiToBackendRowIdMap(patchedRows, isUuid)
    const remapResult = remapBatchOperationsWithUiToBackendRowMap(
      [
        {
          operationId: 'set-range-1',
          type: 'set_range',
          data: {
            cells: [{ rowId: 'client-row-5', columnName: 'ColumnA', value: 'edited' }]
          }
        }
      ],
      uiToBackend
    )

    expect((remapResult.operations[0]?.data as { cells: Array<{ rowId: string }> }).cells[0]?.rowId).toBe(
      'backend-row-5'
    )
    expect(detectTemporaryRowIdsInKnownRowIdFields(remapResult.operations)).toEqual([])
  })

  it('treats client rowRef handles as temporary identities until remapped', () => {
    expect(
      detectTemporaryRowIdsInKnownRowIdFields([
        {
          operationId: 'set-range-1',
          type: 'set_range',
          data: {
            cells: [
              { rowRef: { kind: 'clientHandle', clientRowId: 'client_row_5' }, columnName: 'ColumnA', value: 'x' }
            ]
          }
        }
      ] as any)
    ).toEqual([
      expect.objectContaining({
        fieldPath: 'data.cells[0].rowRef',
        rowId: 'client_row_5',
        referenceKind: 'rowRef'
      })
    ])
  })
})
