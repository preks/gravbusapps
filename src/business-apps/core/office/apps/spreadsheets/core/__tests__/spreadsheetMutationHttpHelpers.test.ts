import { SpreadsheetApiService } from '../../services/SpreadsheetApiService'
import { fetchSpreadsheetSheetReplaySince, fetchSpreadsheetSheetVersion } from '../spreadsheetMutationHttpHelpers'

describe('spreadsheetMutationHttpHelpers', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('fetchSpreadsheetSheetVersion', () => {
    it('returns numeric version from getSheet', async () => {
      jest.spyOn(SpreadsheetApiService, 'getSheet').mockResolvedValue({ version: 12 } as never)

      await expect(fetchSpreadsheetSheetVersion('app-1', 'sheet-a')).resolves.toBe(12)
      expect(SpreadsheetApiService.getSheet).toHaveBeenCalledWith('app-1', 'sheet-a')
    })

    it('defaults missing version to 0', async () => {
      jest.spyOn(SpreadsheetApiService, 'getSheet').mockResolvedValue({} as never)

      await expect(fetchSpreadsheetSheetVersion('app-1', 'sheet-a')).resolves.toBe(0)
    })
  })

  describe('fetchSpreadsheetSheetReplaySince', () => {
    it('maps getSheetChangesSince response to SpreadsheetReplayResponse shape', async () => {
      jest.spyOn(SpreadsheetApiService, 'getSheetChangesSince').mockResolvedValue({
        sheetId: 'sheet-a',
        currentVersion: 5,
        requiresSnapshot: false,
        changes: [{ operationType: 'x', payload: {}, appliedVersion: 4 }]
      } as never)

      await expect(
        fetchSpreadsheetSheetReplaySince('app-1', 'sheet-a', 3, {
          traceSessionId: 'ts-1',
          sessionId: 's-1',
          tabId: 't-1'
        })
      ).resolves.toEqual({
        currentVersion: 5,
        requiresSnapshot: false,
        changes: [{ operationType: 'x', payload: {}, appliedVersion: 4 }]
      })

      expect(SpreadsheetApiService.getSheetChangesSince).toHaveBeenCalledWith('app-1', 'sheet-a', 3, {
        traceSessionId: 'ts-1',
        sessionId: 's-1',
        tabId: 't-1'
      })
    })
  })
})
