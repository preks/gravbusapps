import { roundTo, roundMoney, convertCurrency, getPrecision } from '../money'

describe('roundTo', () => {
  it('rounds half up by default', () => {
    expect(roundTo(1.005, 2)).toBe(1.01)
    expect(roundTo(2.675, 2)).toBe(2.68)
  })

  it('rounds negative values symmetrically', () => {
    expect(roundTo(-1.005, 2)).toBe(-1.01)
  })

  it('supports half-even (banker’s) rounding', () => {
    expect(roundTo(0.5, 0, 'HALF_EVEN')).toBe(0)
    expect(roundTo(1.5, 0, 'HALF_EVEN')).toBe(2)
    expect(roundTo(2.5, 0, 'HALF_EVEN')).toBe(2)
  })

  it('supports DOWN and UP', () => {
    expect(roundTo(1.999, 2, 'DOWN')).toBe(1.99)
    expect(roundTo(1.001, 2, 'UP')).toBe(1.01)
  })
})

describe('getPrecision', () => {
  it('uses known precision and falls back to 2', () => {
    expect(getPrecision('EUR')).toBe(2)
    expect(getPrecision('JPY')).toBe(0)
    expect(getPrecision('XYZ')).toBe(2)
  })

  it('honours overrides', () => {
    expect(getPrecision('EUR', { EUR: 4 })).toBe(4)
  })
})

describe('roundMoney / convertCurrency', () => {
  it('rounds to currency precision', () => {
    expect(roundMoney(10.123, 'EUR')).toBe(10.12)
    expect(roundMoney(10.5, 'JPY')).toBe(11)
  })

  it('converts using a direct rate and rounds in the target currency', () => {
    expect(convertCurrency(100, 0.92, 'EUR')).toBe(92)
    expect(convertCurrency(100, 1.2345, 'JPY')).toBe(123)
  })
})
