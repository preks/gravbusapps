import type { SpreadsheetApp } from '../../types'
import { prepareUniverSheetInsertLocally } from '../spreadsheetUniverSheetInsert'
import { createTestSpreadsheetColumn, createTestSpreadsheetSheet } from '../test-fixtures/spreadsheetCoreTestFixtures'

const baseSheet = createTestSpreadsheetSheet()

describe('spreadsheetUniverSheetInsert', () => {
  it('prepareUniverSheetInsertLocally pre-seeds placeholder, selection ref, and primes caches', () => {
    const baseSheetWithWidth = createTestSpreadsheetSheet({
      columns: [createTestSpreadsheetColumn({ id: 'col-1', name: 'Name', label: 'Name', width: 222 })]
    })
    const pendingCreatedSheetSelectionRef = {
      current: null as { temporarySheetId: string; persistedSheetId: string | null } | null
    }
    const appWithOneSheet = { sheets: [baseSheetWithWidth] } as SpreadsheetApp
    const applyLocalAppUpdate = jest.fn((updater: (app: SpreadsheetApp) => SpreadsheetApp) => updater(appWithOneSheet))
    const onWillPrime = jest.fn()
    const getRows = jest.fn(() => [{ _id: 'r1' }])
    const getActive = jest.fn(() => [{ _id: 'r1' }])

    const result = prepareUniverSheetInsertLocally(
      {
        payload: { kind: 'blank', sheetId: 'new-1', sheetName: 'Tab 2' },
        appSheets: [baseSheetWithWidth],
        activeTemplateSheet: {
          columns: baseSheetWithWidth.columns,
          viewType: baseSheetWithWidth.viewType,
          settings: baseSheetWithWidth.settings
        },
        previousActiveSheetId: 'sheet-1',
        getActiveSessionRows: getActive,
        getRichestKnownRowsForSheet: getRows,
        shouldPreseedPlaceholder: true,
        onWillPrimeCaches: onWillPrime
      },
      {
        pendingCreatedSheetSelectionRef,
        applyLocalAppUpdate,
        peerSheetDataCacheRef: { current: new Map() },
        authoritativePeerSheetDataCacheRef: { current: new Set() },
        pendingUniverRowsBySheetRef: { current: new Map() }
      }
    )

    expect(result.templateColumns).toEqual([
      expect.objectContaining({
        id: 'col-1',
        name: 'Name',
        label: 'Name',
        width: 73
      })
    ])
    expect(result.sourceSheetId).toBeUndefined()
    expect(pendingCreatedSheetSelectionRef.current).toEqual({
      temporarySheetId: 'new-1',
      persistedSheetId: null
    })
    expect(applyLocalAppUpdate).toHaveBeenCalled()
    expect(onWillPrime).toHaveBeenCalledWith({
      rowsToPreserve: [{ _id: 'r1' }],
      currentActiveRows: [{ _id: 'r1' }]
    })
  })

  it('prepareUniverSheetInsertLocally resolves duplicate source columns and skips placeholder when disabled', () => {
    const duplicateSource = createTestSpreadsheetSheet({
      id: 'src',
      columns: [createTestSpreadsheetColumn({ id: 'c2', name: 'Extra', label: 'Extra', width: 310 })]
    })
    const pendingCreatedSheetSelectionRef = {
      current: null as { temporarySheetId: string; persistedSheetId: string | null } | null
    }
    const applyLocalAppUpdate = jest.fn()

    const result = prepareUniverSheetInsertLocally(
      {
        payload: {
          kind: 'duplicate',
          sheetId: 'dup-1',
          sheetName: 'Copy',
          sourceSheetId: 'src'
        },
        appSheets: [baseSheet, duplicateSource],
        activeTemplateSheet: {
          columns: baseSheet.columns,
          viewType: baseSheet.viewType,
          settings: baseSheet.settings
        },
        previousActiveSheetId: 'sheet-1',
        getActiveSessionRows: () => [],
        getRichestKnownRowsForSheet: () => [],
        shouldPreseedPlaceholder: false
      },
      {
        pendingCreatedSheetSelectionRef,
        applyLocalAppUpdate,
        peerSheetDataCacheRef: { current: new Map() },
        authoritativePeerSheetDataCacheRef: { current: new Set() },
        pendingUniverRowsBySheetRef: { current: new Map() }
      }
    )

    expect(result.sourceSheetId).toBe('src')
    expect(result.templateColumns).toEqual(duplicateSource.columns)
    expect(result.templateColumns[0]?.width).toBe(310)
    expect(applyLocalAppUpdate).not.toHaveBeenCalled()
  })
})
