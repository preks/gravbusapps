import { validateInvoiceDraft, assertIssuable } from '../invoiceValidation'
import type { InvoiceDraftInput } from '../../queries/billingCoreApi'

function makeDraft(overrides: Partial<InvoiceDraftInput> = {}): InvoiceDraftInput {
  return {
    legalEntityId: 'le-1',
    billingCustomerId: 'bc-1',
    currency: 'EUR',
    lines: [{ description: 'Service', quantity: 1, unitPrice: 100, taxCategoryId: 'tax-standard-de' }],
    ...overrides
  }
}

describe('validateInvoiceDraft', () => {
  it('accepts a complete draft', () => {
    const result = validateInvoiceDraft(makeDraft())
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('requires a legal entity and billing customer', () => {
    const result = validateInvoiceDraft(makeDraft({ legalEntityId: '', billingCustomerId: '' }))
    expect(result.valid).toBe(false)
    expect(result.errors.map(error => error.field)).toEqual(
      expect.arrayContaining(['legalEntityId', 'billingCustomerId'])
    )
  })

  it('requires a valid 3-letter currency code', () => {
    const result = validateInvoiceDraft(makeDraft({ currency: 'EU' }))
    expect(result.valid).toBe(false)
    expect(result.errors.some(error => error.field === 'currency')).toBe(true)
  })

  it('requires at least one line', () => {
    const result = validateInvoiceDraft(makeDraft({ lines: [] }))
    expect(result.errors.some(error => error.field === 'lines')).toBe(true)
  })

  it('validates each line: description, quantity, unit price, discount, tax', () => {
    const result = validateInvoiceDraft(
      makeDraft({
        lines: [{ description: '  ', quantity: 0, unitPrice: Number.NaN, discountPercent: 150, taxCategoryId: '' }]
      })
    )
    const fields = result.errors.map(error => error.field)
    expect(fields).toEqual(
      expect.arrayContaining([
        'lines[0].description',
        'lines[0].quantity',
        'lines[0].unitPrice',
        'lines[0].discountPercent',
        'lines[0].taxCategoryId'
      ])
    )
  })
})

describe('assertIssuable', () => {
  it('does not throw for a valid draft', () => {
    expect(() => assertIssuable(makeDraft())).not.toThrow()
  })
  it('throws with a combined message for an invalid draft', () => {
    expect(() => assertIssuable(makeDraft({ lines: [] }))).toThrow(/cannot be issued/i)
  })
})
