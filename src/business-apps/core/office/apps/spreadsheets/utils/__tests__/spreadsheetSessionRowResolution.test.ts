import type { SpreadsheetSheet } from '../../types'
import { resolveKnownRowsForSheetFromSources } from '../spreadsheetSessionRowResolution'

function sheetWithData(id: string, data: Record<string, unknown>[]): SpreadsheetSheet {
  return {
    id,
    name: 'S',
    viewType: 'table',
    columns: [],
    views: [],
    data,
    settings: {}
  }
}

describe('spreadsheetSessionRowResolution', () => {
  describe('resolveKnownRowsForSheetFromSources', () => {
    it('prefers authoritative peer cache when present', () => {
      const peer = [{ _id: '1', x: 'peer' }]
      const session = [{ _id: '1', x: 'session' }]
      const meta = sheetWithData('s1', [{ _id: '1', x: 'server' }])
      expect(
        resolveKnownRowsForSheetFromSources({
          authoritativePeerCacheHit: true,
          peerCachedRows: peer,
          sessionSheetRows: session,
          sheetMeta: meta
        })
      ).toEqual(peer)
    })

    it('uses session rows when peer cache is not authoritative', () => {
      const session = [{ _id: '1', x: 'session' }]
      const meta = sheetWithData('s1', [{ _id: '1', x: 'server' }])
      expect(
        resolveKnownRowsForSheetFromSources({
          authoritativePeerCacheHit: false,
          peerCachedRows: [{ _id: '1', x: 'ignored' }],
          sessionSheetRows: session,
          sheetMeta: meta
        })
      ).toEqual(session)
    })

    it('falls back to sorted server data when no peer authority and no session rows', () => {
      const meta = sheetWithData('s1', [{ _id: '1', x: 'server' }])
      const out = resolveKnownRowsForSheetFromSources({
        authoritativePeerCacheHit: false,
        peerCachedRows: undefined,
        sessionSheetRows: undefined,
        sheetMeta: meta
      })
      expect(out).toEqual(meta.data)
    })
  })
})
