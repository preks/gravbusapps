import {
  buildAbsoluteCellMatrixForRanges,
  cellMatricesDisagreeForRanges,
  detectClearAllRangesFromCellMatrix,
  detectClearFormatRangesFromCellMatrix,
  mergeCellMatrices,
  normalizeCellMatrix
} from '../cellMatrixUtils'

describe('cellMatrixUtils', () => {
  it('normalizes object input into a cell matrix', () => {
    expect(normalizeCellMatrix({ 0: { 0: { v: 'x' } } })).toEqual({ 0: { 0: { v: 'x' } } })
    expect(normalizeCellMatrix(null)).toBeUndefined()
  })

  it('prefers worksheet-derived values while backfilling missing payload cells', () => {
    const worksheetCellValue = {
      0: {
        0: { v: 'Current A' }
      },
      2: {
        0: { v: 'Current C' }
      }
    }
    const payloadCellValue = {
      0: {
        0: { v: 'Stale A' }
      },
      1: {
        0: { v: 'Payload B' }
      },
      2: {
        0: { v: 'Stale C' }
      }
    }

    expect(mergeCellMatrices(worksheetCellValue, payloadCellValue)).toEqual({
      0: {
        0: { v: 'Current A' }
      },
      1: {
        0: { v: 'Payload B' }
      },
      2: {
        0: { v: 'Current C' }
      }
    })
  })

  it('returns whichever matrix exists when only one source is present', () => {
    const payloadOnly = { 4: { 10: { v: 'Only payload' } } }
    expect(mergeCellMatrices(undefined, payloadOnly)).toEqual(payloadOnly)
    expect(mergeCellMatrices(payloadOnly, undefined)).toEqual(payloadOnly)
  })

  it('projects range payload cells into absolute worksheet coordinates', () => {
    const payloadRelative = {
      0: { 0: { v: 'A' } },
      1: { 0: { v: 'B' } },
      2: { 0: { v: 'C' } }
    }

    expect(
      buildAbsoluteCellMatrixForRanges(
        [{ startRow: 1, endRow: 3, startColumn: 10, endColumn: 10 }],
        undefined,
        payloadRelative
      )
    ).toEqual({
      1: { 10: { v: 'A' } },
      2: { 10: { v: 'B' } },
      3: { 10: { v: 'C' } }
    })
  })

  it('fills missing worksheet cells from payload while preserving worksheet absolute coordinates', () => {
    expect(
      buildAbsoluteCellMatrixForRanges(
        [{ startRow: 1, endRow: 3, startColumn: 10, endColumn: 10 }],
        {
          1: { 10: { v: 'Worksheet A' } },
          3: { 10: { v: 'Worksheet C' } }
        },
        {
          0: { 0: { v: 'Payload A' } },
          1: { 0: { v: 'Payload B' } },
          2: { 0: { v: 'Payload C' } }
        }
      )
    ).toEqual({
      1: { 10: { v: 'Worksheet A' } },
      2: { 10: { v: 'Payload B' } },
      3: { 10: { v: 'Worksheet C' } }
    })
  })

  it('prefers explicit non-blank payload values over worksheet blanks for the same ranged cell', () => {
    expect(
      buildAbsoluteCellMatrixForRanges(
        [{ startRow: 0, endRow: 0, startColumn: 5, endColumn: 6 }],
        {
          0: {
            5: '',
            6: { v: null }
          }
        },
        {
          0: {
            0: { v: 'Payload F' },
            1: { v: 'Payload G' }
          }
        }
      )
    ).toEqual({
      0: {
        5: { v: 'Payload F' },
        6: { v: 'Payload G' }
      }
    })
  })

  it('still prefers worksheet non-blank values over conflicting payload values', () => {
    expect(
      buildAbsoluteCellMatrixForRanges(
        [{ startRow: 0, endRow: 0, startColumn: 5, endColumn: 5 }],
        {
          0: {
            5: { v: 'Worksheet value' }
          }
        },
        {
          0: {
            0: { v: 'Payload value' }
          }
        }
      )
    ).toEqual({
      0: {
        5: { v: 'Worksheet value' }
      }
    })
  })

  it('detects when worksheet and payload disagree for the same ranged cell', () => {
    expect(
      cellMatricesDisagreeForRanges(
        [{ startRow: 4, endRow: 4, startColumn: 2, endColumn: 2 }],
        { 4: { 2: { v: 'Worksheet value' } } },
        { 0: { 0: { v: 'Payload value' } } }
      )
    ).toBe(true)
  })

  describe('detectClearAllRangesFromCellMatrix', () => {
    it('treats a single literal-null cell as a clear-all rectangle', () => {
      expect(detectClearAllRangesFromCellMatrix({ 2: { 3: null } })).toEqual([
        { startRow: 2, endRow: 2, startColumn: 3, endColumn: 3 }
      ])
    })

    it('collapses contiguous literal-null rows into one rectangle', () => {
      expect(
        detectClearAllRangesFromCellMatrix({
          0: { 0: null, 1: null, 2: null },
          1: { 0: null, 1: null, 2: null },
          2: { 0: null, 1: null, 2: null }
        })
      ).toEqual([{ startRow: 0, endRow: 2, startColumn: 0, endColumn: 2 }])
    })

    it('emits separate stripes for non-contiguous row blocks', () => {
      expect(
        detectClearAllRangesFromCellMatrix({
          0: { 0: null },
          1: { 0: null },
          5: { 1: null },
          6: { 1: null }
        })
      ).toEqual([
        { startRow: 0, endRow: 1, startColumn: 0, endColumn: 0 },
        { startRow: 5, endRow: 6, startColumn: 1, endColumn: 1 }
      ])
    })

    it('rejects clear-content payloads that carry non-null cell records', () => {
      expect(
        detectClearAllRangesFromCellMatrix({
          0: { 0: { v: '', si: null, p: null } }
        })
      ).toBeNull()
    })

    it('rejects clear-format payloads that strip styles only', () => {
      expect(
        detectClearAllRangesFromCellMatrix({
          0: { 0: { s: null } }
        })
      ).toBeNull()
    })

    it('rejects ordinary value writes', () => {
      expect(
        detectClearAllRangesFromCellMatrix({
          0: { 0: { v: 5 } }
        })
      ).toBeNull()
    })

    it('returns null for empty or missing matrices', () => {
      expect(detectClearAllRangesFromCellMatrix(undefined)).toBeNull()
      expect(detectClearAllRangesFromCellMatrix({})).toBeNull()
      expect(detectClearAllRangesFromCellMatrix({ 0: {} })).toBeNull()
    })
  })

  describe('detectClearFormatRangesFromCellMatrix', () => {
    it('treats a single { s: null } cell as a clear-format rectangle', () => {
      expect(detectClearFormatRangesFromCellMatrix({ 2: { 3: { s: null } } })).toEqual([
        { startRow: 2, endRow: 2, startColumn: 3, endColumn: 3 }
      ])
    })

    it('collapses contiguous { s: null } rows into one rectangle', () => {
      expect(
        detectClearFormatRangesFromCellMatrix({
          0: { 0: { s: null }, 1: { s: null }, 2: { s: null } },
          1: { 0: { s: null }, 1: { s: null }, 2: { s: null } },
          2: { 0: { s: null }, 1: { s: null }, 2: { s: null } }
        })
      ).toEqual([{ startRow: 0, endRow: 2, startColumn: 0, endColumn: 2 }])
    })

    it('emits separate stripes for non-contiguous row blocks', () => {
      expect(
        detectClearFormatRangesFromCellMatrix({
          0: { 0: { s: null } },
          1: { 0: { s: null } },
          5: { 1: { s: null } },
          6: { 1: { s: null } }
        })
      ).toEqual([
        { startRow: 0, endRow: 1, startColumn: 0, endColumn: 0 },
        { startRow: 5, endRow: 6, startColumn: 1, endColumn: 1 }
      ])
    })

    it('rejects clear-all payloads (literal null)', () => {
      expect(detectClearFormatRangesFromCellMatrix({ 0: { 0: null } })).toBeNull()
    })

    it('rejects clear-content payloads that strip values', () => {
      expect(
        detectClearFormatRangesFromCellMatrix({
          0: { 0: { v: '', si: null, p: null } }
        })
      ).toBeNull()
    })

    it('rejects mixed payloads where any cell is not exactly { s: null }', () => {
      expect(
        detectClearFormatRangesFromCellMatrix({
          0: {
            0: { s: null },
            1: { s: null, v: 'still here' }
          }
        })
      ).toBeNull()
      expect(
        detectClearFormatRangesFromCellMatrix({
          0: {
            0: { s: null },
            1: { s: 'someStyleId' }
          }
        })
      ).toBeNull()
    })

    it('rejects ordinary value writes', () => {
      expect(detectClearFormatRangesFromCellMatrix({ 0: { 0: { v: 5 } } })).toBeNull()
    })

    it('returns null for empty or missing matrices', () => {
      expect(detectClearFormatRangesFromCellMatrix(undefined)).toBeNull()
      expect(detectClearFormatRangesFromCellMatrix({})).toBeNull()
      expect(detectClearFormatRangesFromCellMatrix({ 0: {} })).toBeNull()
    })
  })
})
