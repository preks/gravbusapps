import {
  clearUniverSnapshotCache,
  readLatestUniverSnapshot,
  readUniverSnapshotCacheForBootstrap,
  SPREADSHEET_DISABLE_UNIVER_WORKBOOK_CACHE_KEY,
  writeUniverSnapshotCache
} from '../univerSnapshotCache'

describe('univerSnapshotCache', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('stores workbook snapshots by app instead of sheet', () => {
    const snapshot = { sheets: { 'sheet-1': { id: 'sheet-1' }, 'sheet-2': { id: 'sheet-2' } } }

    const write = writeUniverSnapshotCache('app-1', 3, snapshot)
    const readFromCache = readLatestUniverSnapshot('app-1', 0)

    expect(write.stored).toBe(true)
    expect(readFromCache?.version).toBe(3)
    expect(readFromCache?.snapshot).toEqual(snapshot)
  })

  it('clears the app-level workbook cache', () => {
    writeUniverSnapshotCache('app-1', 3, { workbook: true })

    clearUniverSnapshotCache('app-1')

    expect(readLatestUniverSnapshot('app-1', 0)).toBeNull()
  })

  it('readUniverSnapshotCacheForBootstrap prefers the highest watermark covering the requested sheet', async () => {
    writeUniverSnapshotCache('app-1', 100, {
      checkpoint: 'v100',
      __meta: { coversVersions: { 'sheet-1': 100 } }
    })
    await new Promise<void>(resolve => {
      setTimeout(resolve, 15)
    })
    writeUniverSnapshotCache('app-1', 50, {
      lag: true,
      __meta: { coversVersions: { 'sheet-1': 50 } }
    })

    const picked = readUniverSnapshotCacheForBootstrap('app-1', 'sheet-1', 80)
    expect(picked?.version).toBe(100)
    expect(picked?.coversVersions).toEqual({ 'sheet-1': 100 })
  })

  it('discards legacy cache entries without a coverage watermark', () => {
    writeUniverSnapshotCache('app-1', 100, { checkpoint: 'v100' })

    expect(readUniverSnapshotCacheForBootstrap('app-1', 'sheet-1', 80)).toBeNull()
  })

  it('skips reads and writes when disable flag is set', () => {
    window.localStorage.setItem(SPREADSHEET_DISABLE_UNIVER_WORKBOOK_CACHE_KEY, '1')

    const write = writeUniverSnapshotCache('app-1', 3, { workbook: true })
    expect(write.stored).toBe(false)
    expect(write.reason).toBe('cache_disabled')

    expect(readLatestUniverSnapshot('app-1', 0)).toBeNull()
  })
})
