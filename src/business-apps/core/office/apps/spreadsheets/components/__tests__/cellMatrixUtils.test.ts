import { buildAbsoluteCellMatrixForRanges, mergeCellMatrices, normalizeCellMatrix } from '../cellMatrixUtils'

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
})
