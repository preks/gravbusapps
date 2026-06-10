import { hasExistingShares, resolveHasExistingShares } from '../hasExistingShares'

describe('hasExistingShares', () => {
  it('returns false when both counts are zero or undefined', () => {
    expect(hasExistingShares()).toBe(false)
    expect(hasExistingShares(0, 0)).toBe(false)
    expect(hasExistingShares(undefined, 0)).toBe(false)
  })

  it('returns true when either count is positive', () => {
    expect(hasExistingShares(1)).toBe(true)
    expect(hasExistingShares(0, 2)).toBe(true)
    expect(hasExistingShares(3, 1)).toBe(true)
  })
})

describe('resolveHasExistingShares', () => {
  it('uses loaded count when defined', () => {
    expect(resolveHasExistingShares(0, 2)).toBe(false)
    expect(resolveHasExistingShares(1, 0)).toBe(true)
  })

  it('falls back to summary count when loaded count is undefined', () => {
    expect(resolveHasExistingShares(undefined, 1)).toBe(true)
    expect(resolveHasExistingShares(undefined, 0)).toBe(false)
  })
})
