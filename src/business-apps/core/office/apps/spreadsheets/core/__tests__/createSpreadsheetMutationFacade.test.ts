import { createSpreadsheetMutationFacade } from '../createSpreadsheetMutationFacade'
import { SpreadsheetApiRequestError, SpreadsheetApiService } from '../../services/SpreadsheetApiService'
import * as spreadsheetSnapshotSaveWithRetry from '../spreadsheetSnapshotSaveWithRetry'

describe('createSpreadsheetMutationFacade', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('routes sheet metadata updates through the provided sheet callbacks', async () => {
    const onSheetUpdate = jest.fn().mockResolvedValue({
      id: 'sheet-1',
      name: 'Renamed',
      viewType: 'table',
      columns: [],
      views: [],
      data: [],
      settings: {}
    })

    const facade = createSpreadsheetMutationFacade({
      appId: 'app-1',
      submitBatch: jest.fn(),
      onSheetUpdate
    })

    await expect(facade.renameSheet('sheet-1', 'Renamed')).resolves.toMatchObject({
      id: 'sheet-1',
      name: 'Renamed'
    })
    expect(onSheetUpdate).toHaveBeenCalledWith('app-1', 'sheet-1', { name: 'Renamed' })
  })

  it('routes single-row creation through the provided row callback', async () => {
    const onRowAdd = jest.fn().mockResolvedValue({
      _id: 'row-1',
      Name: 'Alice'
    })

    const facade = createSpreadsheetMutationFacade({
      appId: 'app-1',
      submitBatch: jest.fn(),
      onRowAdd
    })

    await expect(facade.createRow('sheet-1', { Name: 'Alice' })).resolves.toMatchObject({
      _id: 'row-1',
      Name: 'Alice'
    })
    expect(onRowAdd).toHaveBeenCalledWith('app-1', 'sheet-1', { Name: 'Alice' })
  })

  it('routes single-row updates through the provided row callback', async () => {
    const onRowUpdate = jest.fn().mockResolvedValue({
      _id: 'row-1',
      Name: 'Alice Updated'
    })

    const facade = createSpreadsheetMutationFacade({
      appId: 'app-1',
      submitBatch: jest.fn(),
      onRowUpdate
    })

    await expect(facade.updateRow('sheet-1', 'row-1', { Name: 'Alice Updated' })).resolves.toMatchObject({
      _id: 'row-1',
      Name: 'Alice Updated'
    })
    expect(onRowUpdate).toHaveBeenCalledWith('app-1', 'sheet-1', 'row-1', {
      Name: 'Alice Updated'
    })
  })

  it('keeps bulk row creation fallback semantics behind the facade', async () => {
    jest
      .spyOn(SpreadsheetApiService, 'bulkAddRows')
      .mockRejectedValue(new SpreadsheetApiRequestError('missing bulk endpoint', 404))
    const addRowSpy = jest
      .spyOn(SpreadsheetApiService, 'addRow')
      .mockResolvedValueOnce({ _id: 'row-1', Name: 'Alice' })
      .mockResolvedValueOnce({ _id: 'row-2', Name: 'Bob' })

    const facade = createSpreadsheetMutationFacade({
      appId: 'app-1',
      submitBatch: jest.fn()
    })

    await expect(facade.createRows('sheet-1', [{ Name: 'Alice' }, { Name: 'Bob' }])).resolves.toEqual([
      { _id: 'row-1', Name: 'Alice' },
      { _id: 'row-2', Name: 'Bob' }
    ])
    expect(addRowSpy).toHaveBeenNthCalledWith(1, 'app-1', 'sheet-1', { Name: 'Alice' })
    expect(addRowSpy).toHaveBeenNthCalledWith(2, 'app-1', 'sheet-1', { Name: 'Bob' })
  })

  it('builds batch requests for setRange through the shared submitBatch seam', async () => {
    const submitBatch = jest.fn().mockResolvedValue({ newVersion: 7 })

    const facade = createSpreadsheetMutationFacade({
      appId: 'app-1',
      submitBatch
    })

    await facade.setRange('sheet-1', [{ rowId: 'row-1', columnName: 'ColumnA', value: 'value' }])

    expect(submitBatch).toHaveBeenCalledWith({
      sheetId: 'sheet-1',
      operations: [
        expect.objectContaining({
          type: 'set_range',
          data: {
            cells: [{ rowId: 'row-1', columnName: 'ColumnA', value: 'value' }]
          }
        })
      ],
      batchIdPrefix: 'set_range',
      traceMeta: { operationType: 'set_range' }
    })
  })

  it('falls back to the row delete API for single-row deletes', async () => {
    const deleteRowSpy = jest.spyOn(SpreadsheetApiService, 'deleteRow').mockResolvedValue(true)

    const facade = createSpreadsheetMutationFacade({
      appId: 'app-1',
      submitBatch: jest.fn()
    })

    await expect(facade.deleteRow('sheet-1', 'row-1')).resolves.toBe(true)
    expect(deleteRowSpy).toHaveBeenCalledWith('app-1', 'sheet-1', 'row-1')
  })

  it('delegates fetchSheetChangesSince and requestStructuralResync to injected collaborators', async () => {
    const fetchSheetChangesSince = jest.fn().mockResolvedValue({
      currentVersion: 3,
      requiresSnapshot: false,
      changes: []
    })
    const requestStructuralResync = jest.fn()

    const facade = createSpreadsheetMutationFacade({
      appId: 'app-1',
      submitBatch: jest.fn(),
      fetchSheetChangesSince,
      requestStructuralResync
    })

    await expect(facade.fetchSheetChangesSince('sheet-1', 2)).resolves.toEqual({
      currentVersion: 3,
      requiresSnapshot: false,
      changes: []
    })
    facade.requestStructuralResync('sheet-1', { immediate: true })

    expect(fetchSheetChangesSince).toHaveBeenCalledWith('sheet-1', 2)
    expect(requestStructuralResync).toHaveBeenCalledWith('sheet-1', { immediate: true })
  })

  it('routes workbook snapshot saves through saveSpreadsheetSnapshotWithRetry with facade appId', async () => {
    const saveSpy = jest.spyOn(spreadsheetSnapshotSaveWithRetry, 'saveSpreadsheetSnapshotWithRetry').mockResolvedValue({
      savedSnapshot: {},
      cacheResult: { stored: true, reason: null }
    })
    const workbookSnapshotVersionRef = { current: 1 }
    const snapshotSaveMetricsRef = {
      current: { attempts: 0, conflicts: 0, failures: 0, fallbackLoads: 0 }
    }

    const facade = createSpreadsheetMutationFacade({
      appId: 'app-1',
      submitBatch: jest.fn()
    })

    await facade.saveWorkbookSnapshotWithRetry({
      activeSheetId: 'sheet-1',
      baseSnapshot: {},
      workbookSnapshotVersionRef,
      snapshotSaveMetricsRef,
      recoverFromVersionConflict: jest.fn().mockResolvedValue(false),
      spreadsheetGridRef: { current: null },
      maxSnapshotRetries: 3
    })

    expect(saveSpy).toHaveBeenCalledWith(
      expect.objectContaining({ appId: 'app-1', activeSheetId: 'sheet-1', maxSnapshotRetries: 3 })
    )
    saveSpy.mockRestore()
  })

  it('submits moveCellRange as a single move_cell_range batch op with fromRange/toRange', async () => {
    const submitBatch = jest.fn().mockResolvedValue({
      sheetId: 'sheet-1',
      newVersion: 7,
      appliedOperations: [],
      operationResults: []
    })
    const facade = createSpreadsheetMutationFacade({
      appId: 'app-1',
      submitBatch
    })

    await facade.moveCellRange(
      'sheet-1',
      { startRow: 1, endRow: 2, startColumn: 3, endColumn: 4 },
      { startRow: 5, endRow: 6, startColumn: 7, endColumn: 8 }
    )

    expect(submitBatch).toHaveBeenCalledTimes(1)
    const request = submitBatch.mock.calls[0][0]
    expect(request.sheetId).toBe('sheet-1')
    expect(request.batchIdPrefix).toBe('move_cell_range')
    expect(request.operations).toHaveLength(1)
    expect(request.operations[0]).toMatchObject({
      type: 'move_cell_range',
      data: {
        sheetId: 'sheet-1',
        fromRange: { startRow: 1, endRow: 2, startColumn: 3, endColumn: 4 },
        toRange: { startRow: 5, endRow: 6, startColumn: 7, endColumn: 8 }
      }
    })
    expect(typeof request.operations[0].operationId).toBe('string')
    expect(request.operations[0].operationId).toMatch(/^move_cell_range/)
  })

  it('routes updateAppMetadata through SpreadsheetApiService.updateApp', async () => {
    const updateSpy = jest.spyOn(SpreadsheetApiService, 'updateApp').mockResolvedValue({ id: 'app-1' } as never)
    const facade = createSpreadsheetMutationFacade({
      appId: 'app-1',
      submitBatch: jest.fn()
    })

    await facade.updateAppMetadata({ settings: { excel_collection_copy: true } })

    expect(updateSpy).toHaveBeenCalledWith('app-1', { settings: { excel_collection_copy: true } })
    updateSpy.mockRestore()
  })
})
