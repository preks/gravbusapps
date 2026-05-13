import { indexToExcelCol, parseChartRange } from '../chartRangeUtils'

describe('chartRangeUtils', () => {
  it('parseChartRange handles single cell and normalizes reversed corners', () => {
    expect(parseChartRange('A1')).toEqual({
      startRow: 0,
      endRow: 0,
      startCol: 0,
      endCol: 0
    })
    expect(parseChartRange('B2:A1')).toEqual({
      startRow: 0,
      endRow: 1,
      startCol: 0,
      endCol: 1
    })
  })

  it('indexToExcelCol delegates to shared column letters', () => {
    expect(indexToExcelCol(0)).toBe('A')
    expect(indexToExcelCol(26)).toBe('AA')
  })

  it('parseChartRange rejects invalid ranges', () => {
    expect(parseChartRange('')).toBeNull()
    expect(parseChartRange('A1:')).toBeNull()
    expect(parseChartRange('A1:B2:C3')).toBeNull()
  })
})
