import { extractCurrencyCode, formatCurrencyCell } from './formatCurrencyCell'

describe('formatCurrencyCell', () => {
  it('extracts ISO code from catalog id', () => {
    expect(extractCurrencyCode('Currency:v1:EUR')).toBe('EUR')
  })

  it('formats amount with unit', () => {
    const formatted = formatCurrencyCell({ value: 400000, unit: 'USD' })
    expect(formatted).toMatch(/\$|USD|400/)
  })
})
