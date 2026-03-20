import { evaluateFormula, type FormulaContext } from '../formulaEvaluator'

describe('formulaEvaluator', () => {
  const context: FormulaContext = {
    columns: [
      { name: 'Month', id: 'col_month' },
      { name: 'Region', id: 'col_region' },
      { name: 'Revenue', id: 'col_revenue' }
    ],
    allRows: [
      { Month: 'Oct', Region: 'EMEA', Revenue: 105000 },
      { Month: 'Oct', Region: 'APAC', Revenue: 55000 },
      { Month: 'Nov', Region: 'APAC', Revenue: 75000 },
      { Month: 'Nov', Region: 'EMEA', Revenue: 137500 }
    ],
    row: { Month: 'Oct', Region: 'APAC', Revenue: 55000 },
    currentRowIndex: 1
  }

  it('evaluates SUMIF with Excel full-column references', () => {
    const result = evaluateFormula('=SUMIF(B:B, "APAC", C:C)', context)
    expect(result).toBe(130000)
  })

  it('evaluates SUMIF with named columns', () => {
    const result = evaluateFormula('=SUMIF(Region, "EMEA", Revenue)', context)
    expect(result).toBe(242500)
  })

  it('supports quoted string expressions directly', () => {
    const result = evaluateFormula('=IF(Revenue>60000, "HIGH", "LOW")', context)
    expect(result).toBe('LOW')
  })
})
