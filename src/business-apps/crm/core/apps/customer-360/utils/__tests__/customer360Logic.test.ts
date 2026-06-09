import { formatNumber, formatCurrency, parseDate, formatDate, byTimestampDesc } from '../format'
import { getStatusBadgeVariant, isOpenStatus } from '../statusBadge'
import { deriveBalance } from '../../data/deriveBalance'
import type { CustomerInvoice } from '../../data/types'

describe('format utils', () => {
  it('formats numbers and returns empty string for invalid input', () => {
    expect(formatNumber(undefined)).toBe('')
    expect(formatNumber(Number.NaN)).toBe('')
    expect(formatNumber(5)).toBe('5')
  })

  it('formats currency and returns empty string when amount is missing', () => {
    expect(formatCurrency(undefined, 'EUR')).toBe('')
    const formatted = formatCurrency(100, 'EUR')
    expect(formatted).not.toBe('')
    expect(formatted).toContain('100')
  })

  it('parses dates safely', () => {
    expect(parseDate(undefined)).toBeNull()
    expect(parseDate('not-a-date')).toBeNull()
    expect(parseDate('2026-01-15')).toBeInstanceOf(Date)
    expect(formatDate('not-a-date')).toBe('')
  })

  it('sorts timestamps newest-first with missing dates last', () => {
    const sorted = ['2026-01-01', undefined, '2026-03-01'].sort(byTimestampDesc)
    expect(sorted[0]).toBe('2026-03-01')
    expect(sorted[1]).toBe('2026-01-01')
    expect(sorted[2]).toBeUndefined()
  })
})

describe('statusBadge', () => {
  it('maps known statuses to design-system variants', () => {
    expect(getStatusBadgeVariant('active')).toBe('success')
    expect(getStatusBadgeVariant('open')).toBe('info')
    expect(getStatusBadgeVariant('pending')).toBe('warning')
    expect(getStatusBadgeVariant('overdue')).toBe('destructive')
    expect(getStatusBadgeVariant('something-unknown')).toBe('secondary')
    expect(getStatusBadgeVariant(undefined)).toBe('outline')
  })

  it('treats terminal statuses as closed and everything else as open', () => {
    expect(isOpenStatus('paid')).toBe(false)
    expect(isOpenStatus('closed')).toBe(false)
    expect(isOpenStatus('open')).toBe(true)
    expect(isOpenStatus('in_progress')).toBe(true)
    expect(isOpenStatus(undefined)).toBe(true)
  })
})

describe('deriveBalance', () => {
  it('returns undefined when there are no invoices', () => {
    expect(deriveBalance([])).toBeUndefined()
  })

  it('aggregates open, overdue and lifetime value', () => {
    const invoices: CustomerInvoice[] = [
      { id: '1', status: 'open', amount: 100, currency: 'EUR', dueDate: '2000-01-01' },
      { id: '2', status: 'open', amount: 50, currency: 'EUR', dueDate: '2999-01-01' },
      { id: '3', status: 'paid', amount: 200, currency: 'EUR', dueDate: '2000-01-01' }
    ]

    const balance = deriveBalance(invoices)
    expect(balance).toBeDefined()
    expect(balance?.lifetimeValue).toBe(350)
    expect(balance?.openAmount).toBe(150)
    // Only the past-due open invoice (#1) counts as overdue; the paid one is excluded.
    expect(balance?.overdueAmount).toBe(100)
    expect(balance?.currency).toBe('EUR')
  })
})
