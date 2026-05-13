import type { SpreadsheetSheet } from '../../types'
import { reconcilePeerSheetCachesFromAppSheets } from '../../utils/spreadsheetViewerPeerCacheReconcile'

function sheet(id: string, data: Record<string, unknown>[] = []): SpreadsheetSheet {
  return {
    id,
    name: id,
    viewType: 'table',
    columns: [],
    views: [],
    data,
    settings: {},
    version: 0
  } as SpreadsheetSheet
}

describe('reconcilePeerSheetCachesFromAppSheets (session model peer cache)', () => {
  it('prunes caches for sheets removed from the app', () => {
    const peerSheetDataCache = new Map<string, Record<string, unknown>[]>()
    const authoritativePeerSheetDataCache = new Set<string>()
    peerSheetDataCache.set('gone', [{ a: 1 }])
    authoritativePeerSheetDataCache.add('gone')

    reconcilePeerSheetCachesFromAppSheets({
      sheets: [sheet('s1')],
      activeSheetId: 's1',
      getActiveSessionRows: () => [],
      pendingUniverRowsBySheet: new Map(),
      peerSheetDataCache,
      authoritativePeerSheetDataCache
    })

    expect(peerSheetDataCache.has('gone')).toBe(false)
    expect(authoritativePeerSheetDataCache.has('gone')).toBe(false)
  })

  it('seeds missing inactive sheets from sorted server rows', () => {
    const peerSheetDataCache = new Map<string, Record<string, unknown>[]>()
    const authoritativePeerSheetDataCache = new Set<string>()
    const row = { id: 'r1' }

    reconcilePeerSheetCachesFromAppSheets({
      sheets: [sheet('active', []), sheet('inactive', [row])],
      activeSheetId: 'active',
      getActiveSessionRows: () => [],
      pendingUniverRowsBySheet: new Map(),
      peerSheetDataCache,
      authoritativePeerSheetDataCache
    })

    expect(peerSheetDataCache.get('inactive')).toEqual([row])
    expect(authoritativePeerSheetDataCache.has('inactive')).toBe(true)
  })

  it('prefers pending Univer rows when they extend beyond persisted rows', () => {
    const peerSheetDataCache = new Map<string, Record<string, unknown>[]>()
    const authoritativePeerSheetDataCache = new Set<string>()
    const pendingRows = [{ id: 'live' }]
    const persistedRows: Record<string, unknown>[] = []

    reconcilePeerSheetCachesFromAppSheets({
      sheets: [sheet('active', []), sheet('other', [])],
      activeSheetId: 'active',
      getActiveSessionRows: () => [],
      pendingUniverRowsBySheet: new Map([['other', { data: pendingRows, persistedRows }]]),
      peerSheetDataCache,
      authoritativePeerSheetDataCache
    })

    expect(peerSheetDataCache.get('other')).toEqual(pendingRows)
  })
})
