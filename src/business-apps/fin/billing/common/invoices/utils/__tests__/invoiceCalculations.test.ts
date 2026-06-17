import { calculateLine, calculateTotals, calculateInvoice, calculateOutstanding } from '../invoiceCalculations'
import { DEFAULT_TAX_CATEGORIES } from '../../../constants'
import type { CalculationContext } from '../invoiceCalculations'

const context: CalculationContext = {
  currency: 'EUR',
  taxCategories: DEFAULT_TAX_CATEGORIES
}

describe('calculateLine', () => {
  it('computes net, tax, and gross with a discount and standard rate', () => {
    const line = calculateLine(
      {
        id: 'l1',
        description: 'Item',
        quantity: 2,
        unitPrice: 100,
        discountPercent: 10,
        taxCategoryId: 'tax-standard-de'
      },
      context
    )
    expect(line.netAmount).toBe(180) // 2 * 100 * 0.9
    expect(line.taxRatePercent).toBe(19)
    expect(line.taxAmount).toBe(34.2) // 180 * 0.19
    expect(line.grossAmount).toBe(214.2)
  })

  it('applies zero tax for reverse-charge categories', () => {
    const line = calculateLine(
      { id: 'l2', description: 'Cross-border', quantity: 1, unitPrice: 1000, taxCategoryId: 'tax-intra-eu' },
      context
    )
    expect(line.taxRatePercent).toBe(0)
    expect(line.taxAmount).toBe(0)
    expect(line.grossAmount).toBe(1000)
  })

  it('clamps discount to the 0-100 range', () => {
    const line = calculateLine(
      {
        id: 'l3',
        description: 'Item',
        quantity: 1,
        unitPrice: 100,
        discountPercent: 150,
        taxCategoryId: 'tax-standard-de'
      },
      context
    )
    expect(line.netAmount).toBe(0) // clamped to 100% discount
  })

  it('rounds to currency precision', () => {
    const line = calculateLine(
      { id: 'l4', description: 'Odd', quantity: 3, unitPrice: 33.333, taxCategoryId: 'tax-reduced-de' },
      context
    )
    expect(line.netAmount).toBe(100) // 99.999 rounds to 100.00
    expect(line.taxAmount).toBe(7) // 100 * 0.07
  })
})

describe('calculateTotals', () => {
  it('aggregates lines and groups tax per rate', () => {
    const { lines, totals } = calculateInvoice(
      [
        { id: 'a', description: 'Std', quantity: 1, unitPrice: 100, taxCategoryId: 'tax-standard-de' },
        { id: 'b', description: 'Std 2', quantity: 1, unitPrice: 200, taxCategoryId: 'tax-standard-de' },
        { id: 'c', description: 'Reduced', quantity: 1, unitPrice: 100, taxCategoryId: 'tax-reduced-de' }
      ],
      context
    )
    expect(lines).toHaveLength(3)
    expect(totals.netTotal).toBe(400)
    expect(totals.taxTotal).toBe(64) // (300 * 0.19) + (100 * 0.07) = 57 + 7
    expect(totals.grossTotal).toBe(464)
    expect(totals.taxSummary).toHaveLength(2)
    const standard = totals.taxSummary.find(entry => entry.taxRatePercent === 19)
    expect(standard?.netAmount).toBe(300)
    expect(standard?.taxAmount).toBe(57)
  })

  it('returns zero totals for an empty invoice', () => {
    const totals = calculateTotals([], context)
    expect(totals.netTotal).toBe(0)
    expect(totals.grossTotal).toBe(0)
    expect(totals.taxSummary).toHaveLength(0)
  })
})

describe('calculateOutstanding', () => {
  it('returns the remaining balance', () => {
    expect(calculateOutstanding(100, 30)).toBe(70)
  })
  it('never goes negative for overpayments', () => {
    expect(calculateOutstanding(100, 130)).toBe(0)
  })
})
