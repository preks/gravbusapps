import {
  clampClearAllRangeToBounds,
  dedupeClearAllRanges,
  resolveWorksheetGridBounds
} from '../univerGridRangeSelection'

describe('univerGridRangeSelection clear-all bounds', () => {
  it('clamps wire clear_all ranges to worksheet max indices', () => {
    const clamped = clampClearAllRangeToBounds(
      { startRow: 0, endRow: 999, startColumn: 0, endColumn: 26 },
      { maxRowIndex: 26, maxColIndex: 26 }
    )
    expect(clamped).toEqual({ startRow: 0, endRow: 26, startColumn: 0, endColumn: 26 })
  })

  it('dedupes identical clear_all rectangles', () => {
    const ranges = dedupeClearAllRanges([
      { startRow: 0, endRow: 10, startColumn: 0, endColumn: 5 },
      { startRow: 0, endRow: 10, startColumn: 0, endColumn: 5 }
    ])
    expect(ranges).toHaveLength(1)
  })

  it('reads max row/col indices from Univer worksheet facade', () => {
    const bounds = resolveWorksheetGridBounds({
      getMaxRows: () => 27,
      getMaxColumns: () => 27
    })
    expect(bounds).toEqual({ maxRowIndex: 26, maxColIndex: 26 })
  })
})
