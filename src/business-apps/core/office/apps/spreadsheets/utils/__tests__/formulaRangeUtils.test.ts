import { expandFormulaFullColumnRanges } from '../formulaRangeUtils'

describe('formulaRangeUtils', () => {
  it('expands same-column ranges', () => {
    expect(expandFormulaFullColumnRanges('=SUM(B:B)', { rowCount: 40 })).toBe('=SUM(B2:B41)')
  })

  it('expands multi-column ranges', () => {
    expect(expandFormulaFullColumnRanges('=SUM(A:G)', { rowCount: 40 })).toBe('=SUM(A2:G41)')
  })

  it('expands SUMIF full-column refs', () => {
    expect(expandFormulaFullColumnRanges('=SUMIF(B:B,"APAC",G:G)', { rowCount: 40 })).toBe(
      '=SUMIF(B2:B41,"APAC",G2:G41)'
    )
  })
})
