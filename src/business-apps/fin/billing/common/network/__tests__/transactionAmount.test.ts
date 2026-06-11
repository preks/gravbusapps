import { transactionAmount } from '../ledgerAdminClient'

describe('transactionAmount', () => {
  it('treats the engine amount as major units (no /100)', () => {
    expect(transactionAmount({ amount: 1 })).toBe(1)
    expect(transactionAmount({ amount: 17.56 })).toBeCloseTo(17.56, 2)
    expect(transactionAmount({ amount: 5950 })).toBe(5950)
  })

  it('falls back to precise_amount / precision when amount is absent', () => {
    expect(transactionAmount({ precise_amount: 100, precision: 100 })).toBe(1)
    expect(transactionAmount({ precise_amount: 1756, precision: 100 })).toBeCloseTo(17.56, 2)
  })

  it('defaults precision to 100 when missing', () => {
    expect(transactionAmount({ precise_amount: 250 })).toBe(2.5)
  })

  it('returns 0 for unparseable input', () => {
    expect(transactionAmount({})).toBe(0)
    expect(transactionAmount({ amount: 'oops' })).toBe(0)
  })
})
