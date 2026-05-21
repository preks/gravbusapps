import { formatDateCell, isIsoDateLike, sortKeyForDateCell } from './formatDateCell'

describe('formatDateCell', () => {
  it('formats date-only ISO datetime without time (closeDate)', () => {
    const formatted = formatDateCell('2025-09-30T00:00:00')
    expect(formatted).not.toContain('T00:00:00')
    expect(formatted).toMatch(/2025/)
    expect(formatted).toMatch(/30|Sep/i)
  })

  it('formats plain ISO date', () => {
    const formatted = formatDateCell('2025-09-30')
    expect(formatted).toMatch(/2025/)
  })

  it('detects iso date strings', () => {
    expect(isIsoDateLike('2025-09-30T00:00:00')).toBe(true)
    expect(isIsoDateLike('not-a-date')).toBe(false)
  })

  it('sortKeyForDateCell returns timestamp', () => {
    const a = sortKeyForDateCell('2025-01-01T00:00:00')
    const b = sortKeyForDateCell('2025-12-31T00:00:00')
    expect(b).toBeGreaterThan(a)
  })
})
