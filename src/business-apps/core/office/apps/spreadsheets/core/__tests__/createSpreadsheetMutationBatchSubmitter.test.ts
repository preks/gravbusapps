import { SpreadsheetApiRequestError, SpreadsheetApiService } from '../../services/SpreadsheetApiService'
import { createSpreadsheetMutationBatchSubmitter } from '../createSpreadsheetMutationBatchSubmitter'

const buildResponse = (newVersion: number) => ({
  sheetId: 'sheet-1',
  newVersion,
  appliedOperations: [],
  operationResults: [],
  idempotentReplay: false
})

const buildOptions = () => {
  let activeSheetVersion = 4

  return {
    options: {
      appId: 'app-1',
      createBatchId: jest.fn((prefix: string) => `${prefix}_generated`),
      getTraceContext: jest.fn(() => ({
        traceSessionId: 'trace-session-1',
        sessionId: 'browser-session-1',
        tabId: 'tab-1'
      })),
      shouldKeepalive: jest.fn(() => true),
      isActiveSheet: jest.fn((sheetId: string) => sheetId === 'sheet-1'),
      resolveBaseVersion: jest.fn(() => activeSheetVersion),
      getActiveSheetVersion: jest.fn(() => activeSheetVersion),
      refreshBaseVersionBeforeWrite: jest.fn(async (_sheetId: string, baseVersion: number) => baseVersion + 1),
      fetchSheetVersion: jest.fn(async () => 22),
      rememberRecentLocalBatchId: jest.fn(),
      rememberKnownSheetVersion: jest.fn(),
      rememberSheetVersion: jest.fn(),
      rememberLocalCommittedVersion: jest.fn(),
      setActiveSheetVersion: jest.fn((version: number) => {
        activeSheetVersion = version
      }),
      applyMutationToSession: jest.fn(),
      applyResponseRowsToLocalBaseline: jest.fn(),
      incrementConflictCount: jest.fn(),
      recoverFromVersionConflict: jest.fn(async () => true),
      scheduleSnapshotCheckpointFromPersistence: jest.fn(),
      emitTraceEvent: jest.fn()
    },
    getActiveSheetVersionValue: () => activeSheetVersion
  }
}

describe('createSpreadsheetMutationBatchSubmitter', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('submits a batch and updates active-sheet bookkeeping through injected callbacks', async () => {
    const { options, getActiveSheetVersionValue } = buildOptions()
    const applyOperationBatchSpy = jest
      .spyOn(SpreadsheetApiService, 'applyOperationBatch')
      .mockResolvedValue(buildResponse(7))
    const submitBatch = createSpreadsheetMutationBatchSubmitter(options)

    await expect(
      submitBatch({
        sheetId: 'sheet-1',
        operations: [{ operationId: 'op-1', type: 'set_range', data: { cells: [] } }],
        batchIdPrefix: 'set_range',
        traceMeta: { operationType: 'set_range' }
      })
    ).resolves.toEqual(buildResponse(7))

    expect(applyOperationBatchSpy).toHaveBeenCalledWith(
      'app-1',
      'sheet-1',
      expect.objectContaining({
        baseVersion: 5,
        batchId: 'set_range_generated',
        traceId: 'set_range_generated'
      }),
      { keepalive: true }
    )
    expect(options.rememberRecentLocalBatchId).toHaveBeenCalledWith('set_range_generated', 'tab-1')
    expect(options.rememberKnownSheetVersion).toHaveBeenCalledWith('sheet-1', 7)
    expect(options.rememberSheetVersion).toHaveBeenCalledWith('sheet-1', 7)
    expect(options.rememberLocalCommittedVersion).toHaveBeenCalledWith(7)
    expect(options.applyMutationToSession).toHaveBeenCalledWith(
      'sheet-1',
      [{ operationId: 'op-1', type: 'set_range', data: { cells: [] } }],
      buildResponse(7)
    )
    expect(options.applyResponseRowsToLocalBaseline).toHaveBeenCalledWith(
      'sheet-1',
      [{ operationId: 'op-1', type: 'set_range', data: { cells: [] } }],
      buildResponse(7)
    )
    expect(getActiveSheetVersionValue()).toBe(7)
  })

  it('surfaces a 409 structural_conflict without any quick-retry or recoverFromVersionConflict (Tier 1 cutover)', async () => {
    const { options } = buildOptions()
    const applyOperationBatchSpy = jest.spyOn(SpreadsheetApiService, 'applyOperationBatch').mockRejectedValue(
      new SpreadsheetApiRequestError('Concurrent structural change detected', 409, {
        reason: 'structural_conflict',
        currentVersion: 12
      })
    )
    const submitBatch = createSpreadsheetMutationBatchSubmitter(options)

    await expect(
      submitBatch({
        sheetId: 'sheet-1',
        operations: [{ operationId: 'op-1', type: 'delete_rows', data: { rowIds: ['row-1'] } }],
        batchIdPrefix: 'delete_rows'
      })
    ).rejects.toThrow('Concurrent structural change detected')

    // Single wire attempt — no quick-retry, no full-retry-after-restore.
    expect(applyOperationBatchSpy).toHaveBeenCalledTimes(1)
    expect(options.recoverFromVersionConflict).not.toHaveBeenCalled()
    expect(options.scheduleSnapshotCheckpointFromPersistence).not.toHaveBeenCalled()
    // But the server version IS remembered so the caller can refetch from a
    // known-good baseline.
    expect(options.rememberKnownSheetVersion).toHaveBeenCalledWith('sheet-1', 12)
    expect(options.setActiveSheetVersion).toHaveBeenCalledWith(12)
  })

  it('surfaces a 409 version_too_stale without any retry (Tier 1 cutover)', async () => {
    const { options } = buildOptions()
    const applyOperationBatchSpy = jest.spyOn(SpreadsheetApiService, 'applyOperationBatch').mockRejectedValue(
      new SpreadsheetApiRequestError('Client baseVersion is too far behind current version', 409, {
        reason: 'version_too_stale',
        currentVersion: 20000,
        expectedVersion: 1
      })
    )
    const submitBatch = createSpreadsheetMutationBatchSubmitter(options)

    await expect(
      submitBatch({
        sheetId: 'sheet-1',
        operations: [{ operationId: 'op-1', type: 'set_cell', data: { rowId: 'r', columnName: 'A', value: 'x' } }],
        batchIdPrefix: 'set_cell'
      })
    ).rejects.toThrow('Client baseVersion is too far behind current version')

    expect(applyOperationBatchSpy).toHaveBeenCalledTimes(1)
    expect(options.recoverFromVersionConflict).not.toHaveBeenCalled()
  })

  it('applies normalizeTargetSheetId before calling applyOperationBatch', async () => {
    let activeSheetVersion = 2
    const options = {
      appId: 'app-1',
      createBatchId: jest.fn((prefix: string) => `${prefix}_generated`),
      getTraceContext: jest.fn(() => ({})),
      shouldKeepalive: jest.fn(() => false),
      normalizeTargetSheetId: (id: string) => (id === 'temp-sheet' ? 'persisted-sheet' : id),
      isActiveSheet: (sheetId: string) => sheetId === 'persisted-sheet',
      resolveBaseVersion: jest.fn(() => activeSheetVersion),
      getActiveSheetVersion: jest.fn(() => activeSheetVersion),
      refreshBaseVersionBeforeWrite: jest.fn(async (_sheetId: string, baseVersion: number) => baseVersion),
      fetchSheetVersion: jest.fn(async () => 22),
      rememberRecentLocalBatchId: jest.fn(),
      rememberKnownSheetVersion: jest.fn(),
      rememberSheetVersion: jest.fn(),
      rememberLocalCommittedVersion: jest.fn(),
      setActiveSheetVersion: jest.fn((version: number) => {
        activeSheetVersion = version
      }),
      applyMutationToSession: jest.fn(),
      applyResponseRowsToLocalBaseline: jest.fn(),
      incrementConflictCount: jest.fn(),
      recoverFromVersionConflict: jest.fn(async () => true),
      scheduleSnapshotCheckpointFromPersistence: jest.fn(),
      emitTraceEvent: jest.fn()
    }
    const applyOperationBatchSpy = jest.spyOn(SpreadsheetApiService, 'applyOperationBatch').mockResolvedValue({
      sheetId: 'persisted-sheet',
      newVersion: 3,
      appliedOperations: [],
      operationResults: [],
      idempotentReplay: false
    })
    const submitBatch = createSpreadsheetMutationBatchSubmitter(options)

    await submitBatch({
      sheetId: 'temp-sheet',
      operations: [{ operationId: 'op-1', type: 'set_range', data: { cells: [] } }],
      batchIdPrefix: 'set_range'
    })

    expect(applyOperationBatchSpy).toHaveBeenCalledWith(
      'app-1',
      'persisted-sheet',
      expect.objectContaining({ batchId: 'set_range_generated' }),
      undefined
    )
    expect(options.applyMutationToSession).toHaveBeenCalledWith(
      'persisted-sheet',
      expect.any(Array),
      expect.any(Object)
    )
  })

  it('normalizes temporary client row ids into typed row refs before submit', async () => {
    const { options } = buildOptions()
    const applyOperationBatchSpy = jest
      .spyOn(SpreadsheetApiService, 'applyOperationBatch')
      .mockResolvedValue(buildResponse(7))
    const submitBatch = createSpreadsheetMutationBatchSubmitter(options)

    // The pre-submit row-id gate blocks `rowRef.clientHandle` payloads that lack a
    // same-batch `add_rows` materializing that client row id (otherwise the BE
    // rejects with `unknown_client_row_handle` and the cell value is lost). The
    // realistic production flow groups them; mirror that here so we can still
    // assert the `rowId` → `rowRef.clientHandle` normalization.
    await expect(
      submitBatch({
        sheetId: 'sheet-1',
        operations: [
          {
            operationId: 'add-rows-1',
            type: 'add_rows',
            data: { rows: [{ _clientRowId: 'client_row_1', _gridRowIndex: 1, ColumnA: 'draft' }] }
          },
          {
            operationId: 'op-1',
            type: 'set_range',
            data: { cells: [{ rowId: 'client_row_1', columnName: 'ColumnA', value: 'draft' }] }
          }
        ],
        batchIdPrefix: 'set_range'
      })
    ).resolves.toEqual(buildResponse(7))

    expect(applyOperationBatchSpy).toHaveBeenCalledWith(
      'app-1',
      'sheet-1',
      expect.objectContaining({
        operations: [
          {
            operationId: 'add-rows-1',
            type: 'add_rows',
            data: { rows: [{ _clientRowId: 'client_row_1', _gridRowIndex: 1, ColumnA: 'draft' }] }
          },
          {
            operationId: 'op-1',
            type: 'set_range',
            data: {
              cells: [
                {
                  rowRef: {
                    kind: 'clientHandle',
                    clientRowId: 'client_row_1'
                  },
                  rowId: undefined,
                  columnName: 'ColumnA',
                  value: 'draft'
                }
              ]
            }
          }
        ]
      }),
      { keepalive: true }
    )
    expect(options.emitTraceEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        stage: 'http_batch_pre_submit_row_id_check',
        payload: expect.objectContaining({
          hasTemporaryRowIdsInKnownFields: false,
          temporaryRowIdMatches: [],
          submittedRowIds: [
            expect.objectContaining({
              submittedRowId: 'client_row_1',
              submittedRowIdIsBackendUuid: false,
              containsTemporaryClientRowId: false
            })
          ]
        })
      })
    )
  })

  it('retries retryable unknown client row handle failures once', async () => {
    const { options } = buildOptions()
    const applyOperationBatchSpy = jest
      .spyOn(SpreadsheetApiService, 'applyOperationBatch')
      .mockRejectedValueOnce(
        new SpreadsheetApiRequestError('Unknown handle', 400, {
          code: 'unknown_client_row_handle',
          retryable: true
        })
      )
      .mockResolvedValueOnce(buildResponse(9))
    const submitBatch = createSpreadsheetMutationBatchSubmitter(options)

    // Pair `set_cell` with a same-batch `add_rows` so the clientHandle passes the
    // pre-submit row-id gate; the retry-on-unknown-handle behavior under test is
    // unrelated to that gate.
    await expect(
      submitBatch({
        sheetId: 'sheet-1',
        operations: [
          {
            operationId: 'add-rows-1',
            type: 'add_rows',
            data: { rows: [{ _clientRowId: 'client_row_1', _gridRowIndex: 1, ColumnA: 'draft' }] }
          },
          {
            operationId: 'op-1',
            type: 'set_cell',
            data: {
              rowRef: { kind: 'clientHandle', clientRowId: 'client_row_1' },
              columnName: 'ColumnA',
              value: 'draft'
            }
          }
        ],
        batchIdPrefix: 'set_cell'
      })
    ).resolves.toEqual(buildResponse(9))

    expect(applyOperationBatchSpy).toHaveBeenCalledTimes(2)
    expect(applyOperationBatchSpy).toHaveBeenNthCalledWith(
      2,
      'app-1',
      'sheet-1',
      expect.objectContaining({
        batchId: 'set_cell_retry_wait_generated'
      }),
      { keepalive: true }
    )
  })

  it('does not retry explicitly non-retryable 409 batch conflicts such as row_position_conflict', async () => {
    const { options } = buildOptions()
    const applyOperationBatchSpy = jest.spyOn(SpreadsheetApiService, 'applyOperationBatch').mockRejectedValue(
      new SpreadsheetApiRequestError('Cannot materialize row at occupied grid position 7', 409, {
        message: 'Cannot materialize row at occupied grid position 7',
        code: 'row_position_conflict',
        requestedGridRowIndex: 7,
        retryable: false
      })
    )
    const submitBatch = createSpreadsheetMutationBatchSubmitter(options)

    await expect(
      submitBatch({
        sheetId: 'sheet-1',
        operations: [
          {
            operationId: 'op-1',
            type: 'add_rows',
            data: {
              rows: [{ _clientRowId: 'client-row-7', _gridRowIndex: 7 }]
            }
          }
        ],
        batchIdPrefix: 'add_rows'
      })
    ).rejects.toThrow('Cannot materialize row at occupied grid position 7')

    expect(applyOperationBatchSpy).toHaveBeenCalledTimes(1)
    expect(options.recoverFromVersionConflict).not.toHaveBeenCalled()
  })

  it('does not convert UUID-like unresolved row ids into client handles', async () => {
    const { options } = buildOptions()
    const applyOperationBatchSpy = jest
      .spyOn(SpreadsheetApiService, 'applyOperationBatch')
      .mockResolvedValue(buildResponse(10))
    const submitBatch = createSpreadsheetMutationBatchSubmitter(options)

    await expect(
      submitBatch({
        sheetId: 'sheet-1',
        operations: [
          {
            operationId: 'op-1',
            type: 'set_range',
            data: {
              cells: [
                {
                  rowId: '5492aca5-56e8-405d-85f6-58d932e4c478',
                  columnName: 'ColumnA',
                  value: 'draft'
                }
              ]
            }
          }
        ],
        batchIdPrefix: 'set_range'
      })
    ).resolves.toEqual(buildResponse(10))

    expect(applyOperationBatchSpy).toHaveBeenCalledWith(
      'app-1',
      'sheet-1',
      expect.objectContaining({
        operations: [
          {
            operationId: 'op-1',
            type: 'set_range',
            data: {
              cells: [
                {
                  rowId: '5492aca5-56e8-405d-85f6-58d932e4c478',
                  columnName: 'ColumnA',
                  value: 'draft'
                }
              ]
            }
          }
        ]
      }),
      { keepalive: true }
    )
  })
})
