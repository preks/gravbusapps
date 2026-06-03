import { SpreadsheetApiRequestError, SpreadsheetApiService } from '../../services/SpreadsheetApiService'
import { writeUniverSnapshotCache } from '../../utils/univerSnapshotCache'
import { saveSpreadsheetSnapshotWithRetry } from '../spreadsheetSnapshotSaveWithRetry'

jest.mock('../../utils/univerAdapter', () => ({
  stripWorkbookSnapshotValuesPreservingFormatting: jest.fn((snapshot: unknown) => snapshot)
}))

jest.mock('../../utils/univerSnapshotCache', () => ({
  writeUniverSnapshotCache: jest.fn(() => ({ stored: true, reason: null as string | null }))
}))

const mockWriteUniverSnapshotCache = jest.mocked(writeUniverSnapshotCache)

describe('saveSpreadsheetSnapshotWithRetry', () => {
  afterEach(() => {
    jest.restoreAllMocks()
    jest.clearAllMocks()
  })

  it('saves a snapshot on the first attempt and writes it to cache', async () => {
    jest.spyOn(SpreadsheetApiService, 'saveUniverSnapshot').mockResolvedValue({ version: 4 } as never)

    const workbookSnapshotVersionRef = { current: 2 }
    const result = await saveSpreadsheetSnapshotWithRetry({
      appId: 'app-1',
      activeSheetId: 'sheet-1',
      baseSnapshot: { sheets: { 'sheet-1': { id: 'sheet-1' } } },
      workbookSnapshotVersionRef,
      workbookSnapshotCoversVersionsRef: { current: { 'sheet-1': 2 } },
      snapshotSaveMetricsRef: { current: { attempts: 1, conflicts: 0, failures: 0, fallbackLoads: 0 } },
      recoverFromVersionConflict: jest.fn().mockResolvedValue(true),
      spreadsheetGridRef: { current: null },
      maxSnapshotRetries: 3
    })

    expect(SpreadsheetApiService.saveUniverSnapshot).toHaveBeenCalledWith(
      'app-1',
      {
        version: 2,
        snapshot: {
          sheets: { 'sheet-1': { id: 'sheet-1' } },
          __meta: { coversVersions: { 'sheet-1': 2 } }
        }
      },
      undefined
    )
    expect(workbookSnapshotVersionRef.current).toBe(4)
    expect(result.cacheResult).toEqual({ stored: true, reason: null })
    expect(mockWriteUniverSnapshotCache).toHaveBeenCalledWith('app-1', 4, {
      sheets: { 'sheet-1': { id: 'sheet-1' } },
      __meta: { coversVersions: { 'sheet-1': 2 } }
    })
  })

  it('merges the local target worksheet into the refreshed remote snapshot after a 409', async () => {
    jest
      .spyOn(SpreadsheetApiService, 'saveUniverSnapshot')
      .mockRejectedValueOnce(new SpreadsheetApiRequestError('conflict', 409, { currentVersion: 5 }))
      .mockResolvedValueOnce({ version: 7 } as never)
    jest.spyOn(SpreadsheetApiService, 'getUniverSnapshot').mockResolvedValue({
      version: 6,
      snapshot: {
        sheets: { remote: { id: 'remote' } },
        styles: { remoteStyle: true }
      },
      coversVersions: { remote: 3, 'sheet-1': 6 }
    } as never)

    const workbookSnapshotVersionRef = { current: 1 }
    const workbookSnapshotCoversVersionsRef = { current: { 'sheet-1': 4 } }
    const snapshotSaveMetricsRef = { current: { attempts: 1, conflicts: 0, failures: 0, fallbackLoads: 0 } }
    const baseSnapshot = {
      sheets: { 'sheet-1': { id: 'sheet-1', cellData: { 0: { 0: { v: 'local' } } } } },
      styles: { localStyle: true }
    }

    await saveSpreadsheetSnapshotWithRetry({
      appId: 'app-1',
      activeSheetId: 'sheet-1',
      baseSnapshot,
      workbookSnapshotVersionRef,
      workbookSnapshotCoversVersionsRef,
      snapshotSaveMetricsRef,
      recoverFromVersionConflict: jest.fn().mockResolvedValue(true),
      spreadsheetGridRef: { current: null },
      maxSnapshotRetries: 3
    })

    expect(snapshotSaveMetricsRef.current.conflicts).toBe(1)
    expect(SpreadsheetApiService.saveUniverSnapshot).toHaveBeenCalledTimes(2)
    expect(SpreadsheetApiService.saveUniverSnapshot).toHaveBeenLastCalledWith(
      'app-1',
      {
        version: 6,
        snapshot: {
          sheets: {
            remote: { id: 'remote' },
            'sheet-1': { id: 'sheet-1', cellData: { 0: { 0: { v: 'local' } } } }
          },
          styles: { remoteStyle: true, localStyle: true },
          sheetOrder: ['sheet-1'],
          __meta: { coversVersions: { remote: 3, 'sheet-1': 6 } }
        }
      },
      undefined
    )
    expect(workbookSnapshotVersionRef.current).toBe(7)
    expect(workbookSnapshotCoversVersionsRef.current).toEqual({ 'sheet-1': 6, remote: 3 })
  })

  it('accepts the refreshed remote snapshot directly when keepalive mode is enabled', async () => {
    jest
      .spyOn(SpreadsheetApiService, 'saveUniverSnapshot')
      .mockRejectedValueOnce(new SpreadsheetApiRequestError('conflict', 409, { currentVersion: 9 }))
    jest.spyOn(SpreadsheetApiService, 'getUniverSnapshot').mockResolvedValue({
      version: 10,
      snapshot: { sheets: { 'sheet-1': { id: 'sheet-1', from: 'remote' } } },
      coversVersions: { 'sheet-1': 10 }
    } as never)

    const result = await saveSpreadsheetSnapshotWithRetry({
      appId: 'app-1',
      activeSheetId: 'sheet-1',
      baseSnapshot: { sheets: { 'sheet-1': { id: 'sheet-1', from: 'local' } } },
      workbookSnapshotVersionRef: { current: 3 },
      workbookSnapshotCoversVersionsRef: { current: { 'sheet-1': 3 } },
      snapshotSaveMetricsRef: { current: { attempts: 1, conflicts: 0, failures: 0, fallbackLoads: 0 } },
      recoverFromVersionConflict: jest.fn().mockResolvedValue(true),
      spreadsheetGridRef: { current: null },
      maxSnapshotRetries: 2,
      useKeepaliveHttp: true
    })

    expect(SpreadsheetApiService.saveUniverSnapshot).toHaveBeenCalledTimes(1)
    expect(result.savedSnapshot).toEqual({
      sheets: { 'sheet-1': { id: 'sheet-1', from: 'remote' } },
      __meta: { coversVersions: { 'sheet-1': 10 } }
    })
    expect(mockWriteUniverSnapshotCache).toHaveBeenCalledWith('app-1', 10, {
      sheets: { 'sheet-1': { id: 'sheet-1', from: 'remote' } },
      __meta: { coversVersions: { 'sheet-1': 10 } }
    })
  })

  it('increments failures and rethrows when conflict recovery cannot proceed', async () => {
    jest
      .spyOn(SpreadsheetApiService, 'saveUniverSnapshot')
      .mockRejectedValue(new SpreadsheetApiRequestError('conflict', 409, { message: 'no version payload' }))

    const snapshotSaveMetricsRef = { current: { attempts: 1, conflicts: 0, failures: 0, fallbackLoads: 0 } }
    await expect(
      saveSpreadsheetSnapshotWithRetry({
        appId: 'app-1',
        activeSheetId: 'sheet-1',
        baseSnapshot: { sheets: { 'sheet-1': { id: 'sheet-1' } } },
        workbookSnapshotVersionRef: { current: 2 },
        workbookSnapshotCoversVersionsRef: { current: { 'sheet-1': 2 } },
        snapshotSaveMetricsRef,
        recoverFromVersionConflict: jest.fn().mockResolvedValue(false),
        spreadsheetGridRef: { current: null },
        maxSnapshotRetries: 2
      })
    ).rejects.toBeInstanceOf(SpreadsheetApiRequestError)

    expect(snapshotSaveMetricsRef.current.conflicts).toBe(1)
    expect(snapshotSaveMetricsRef.current.failures).toBe(1)
  })
})
