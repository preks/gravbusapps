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

  it('quick-retries active-sheet conflicts using the server version before full recovery', async () => {
    const { options, getActiveSheetVersionValue } = buildOptions()
    const applyOperationBatchSpy = jest
      .spyOn(SpreadsheetApiService, 'applyOperationBatch')
      .mockRejectedValueOnce(new SpreadsheetApiRequestError('Conflict', 409, { currentVersion: 12 }))
      .mockResolvedValueOnce(buildResponse(13))
    const submitBatch = createSpreadsheetMutationBatchSubmitter(options)

    await expect(
      submitBatch({
        sheetId: 'sheet-1',
        operations: [{ operationId: 'op-1', type: 'delete_rows', data: { rowIds: ['row-1'] } }],
        batchIdPrefix: 'delete_rows'
      })
    ).resolves.toEqual(buildResponse(13))

    expect(applyOperationBatchSpy).toHaveBeenNthCalledWith(
      2,
      'app-1',
      'sheet-1',
      expect.objectContaining({
        baseVersion: 12,
        batchId: 'delete_rows_cv_retry_generated'
      }),
      undefined
    )
    expect(options.rememberKnownSheetVersion).toHaveBeenCalledWith('sheet-1', 12)
    expect(options.scheduleSnapshotCheckpointFromPersistence).toHaveBeenCalled()
    expect(options.recoverFromVersionConflict).not.toHaveBeenCalled()
    expect(getActiveSheetVersionValue()).toBe(13)
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
})
