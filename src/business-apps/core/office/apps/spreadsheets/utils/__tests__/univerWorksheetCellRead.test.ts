import { deriveCellMatrixFromPayloadCoordinates, deriveCellMatrixFromRanges } from '../univerWorksheetCellRead'

describe('univerWorksheetCellRead', () => {
  it('reads a synthetic 50k sparse payload by coordinates without expanding the declared range', () => {
    const payloadCellValue: Record<number, Record<number, unknown>> = Object.fromEntries(
      Array.from({ length: 50000 }, (_, row) => [row, { 0: { v: `A${row + 1}` } }])
    )
    const getRange = jest.fn((row: number, col: number) => ({
      getCellData: () => ({
        v: `live:${row}:${col}`,
        bg: { rgb: row === 49999 ? '#00ff00' : '#ffffff' }
      })
    }))

    const matrix = deriveCellMatrixFromPayloadCoordinates({ getRange }, payloadCellValue, [], 'auto', true)

    expect(getRange).toHaveBeenCalledTimes(50000)
    expect(getRange).toHaveBeenCalledWith(49999, 0)
    expect(matrix?.[49999]?.[0]).toEqual({
      v: 'live:49999:0',
      bg: { rgb: '#00ff00' }
    })
  })

  it('reads relative sparse payload coordinates from the pasted range position', () => {
    const payloadCellValue: Record<number, Record<number, unknown>> = {
      0: { 0: { v: 'relative' } }
    }
    const getRange = jest.fn((row: number, col: number) => ({
      getCellData: () => ({
        v: `live:${row}:${col}`,
        bg: { rgb: '#00ff00' }
      })
    }))

    const matrix = deriveCellMatrixFromPayloadCoordinates(
      { getRange },
      payloadCellValue,
      [{ startRow: 6, endRow: 6, startColumn: 12, endColumn: 12 }],
      'relative',
      true
    )

    expect(getRange).toHaveBeenCalledWith(6, 12)
    expect(matrix?.[6]?.[12]).toEqual({
      v: 'live:6:12',
      bg: { rgb: '#00ff00' }
    })
  })

  it('keeps bounded range scans capped when no sparse payload coordinates exist', () => {
    const getRange = jest.fn((row: number, col: number) => ({
      getCellData: () => ({ v: `${row}:${col}` })
    }))

    const matrix = deriveCellMatrixFromRanges(
      { getRange },
      [{ startRow: 0, endRow: 49999, startColumn: 0, endColumn: 0 }],
      10000,
      false,
      true
    )

    expect(getRange).toHaveBeenCalledTimes(10000)
    expect(matrix?.[9999]?.[0]).toEqual({ v: '9999:0' })
    expect(matrix?.[10000]?.[0]).toBeUndefined()
  })
})
