import { formatNextInvoiceNumber, isValidInvoiceNumber } from '../invoiceNumbering'
import type { InvoiceNumberSequence } from '../../types'

const baseSequence: InvoiceNumberSequence = {
  id: 'seq-1',
  legalEntityId: 'le-1',
  prefix: 'INV',
  period: 'YEARLY',
  padding: 4,
  nextNumber: 1
}

describe('formatNextInvoiceNumber', () => {
  it('formats a yearly number with prefix, year, and padding', () => {
    const result = formatNextInvoiceNumber(baseSequence, new Date('2026-05-01T00:00:00Z'))
    expect(result.invoiceNumber).toBe('INV-2026-0001')
    expect(result.nextSequence.nextNumber).toBe(2)
  })

  it('advances the running number without resetting within the same year', () => {
    const seq = { ...baseSequence, nextNumber: 42 }
    const result = formatNextInvoiceNumber(seq, new Date('2026-05-01T00:00:00Z'), '2026-01-10T00:00:00Z')
    expect(result.invoiceNumber).toBe('INV-2026-0042')
  })

  it('resets the running number when the year rolls over', () => {
    const seq = { ...baseSequence, nextNumber: 99 }
    const result = formatNextInvoiceNumber(seq, new Date('2027-01-02T00:00:00Z'), '2026-12-31T00:00:00Z')
    expect(result.invoiceNumber).toBe('INV-2027-0001')
    expect(result.nextSequence.nextNumber).toBe(2)
  })

  it('omits the period token when period is NEVER', () => {
    const seq = { ...baseSequence, period: 'NEVER' as const, nextNumber: 7 }
    const result = formatNextInvoiceNumber(seq, new Date('2026-05-01T00:00:00Z'))
    expect(result.invoiceNumber).toBe('INV-0007')
  })

  it('uses a monthly token for monthly sequences', () => {
    const seq = { ...baseSequence, period: 'MONTHLY' as const }
    const result = formatNextInvoiceNumber(seq, new Date('2026-03-01T00:00:00Z'))
    expect(result.invoiceNumber).toBe('INV-202603-0001')
  })
})

describe('isValidInvoiceNumber', () => {
  it('accepts non-empty strings', () => {
    expect(isValidInvoiceNumber('INV-2026-0001')).toBe(true)
  })
  it('rejects null/empty', () => {
    expect(isValidInvoiceNumber(null)).toBe(false)
    expect(isValidInvoiceNumber('   ')).toBe(false)
  })
})
