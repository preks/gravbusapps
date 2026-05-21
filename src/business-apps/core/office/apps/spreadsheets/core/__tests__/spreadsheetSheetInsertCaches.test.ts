import { primeSpreadsheetSheetInsertCaches } from '../spreadsheetSheetInsertCaches'

describe('spreadsheetSheetInsertCaches', () => {
  it('primes caches for sheet insertion and stores richer pending rows', () => {
    const ctx = {
      peerSheetDataCacheRef: { current: new Map<string, Record<string, unknown>[]>() },
      authoritativePeerSheetDataCacheRef: { current: new Set<string>() },
      pendingUniverRowsBySheetRef: { current: new Map() }
    }

    primeSpreadsheetSheetInsertCaches(
      'sheet-1',
      'sheet-2',
      [{ _id: 'row-1' }, { _id: 'row-2' }],
      [{ _id: 'row-1' }],
      ctx
    )

    expect(ctx.peerSheetDataCacheRef.current.get('sheet-1')).toEqual([{ _id: 'row-1' }, { _id: 'row-2' }])
    expect(ctx.peerSheetDataCacheRef.current.get('sheet-2')).toEqual([])
    expect(ctx.authoritativePeerSheetDataCacheRef.current.has('sheet-1')).toBe(true)
    expect(ctx.pendingUniverRowsBySheetRef.current.get('sheet-1')).toEqual({
      data: [{ _id: 'row-1' }, { _id: 'row-2' }],
      persistedRows: [{ _id: 'row-1' }]
    })
  })
})
