import { formatNumber, formatCurrency, parseDate, formatDate, byTimestampDesc } from '../format'
import { getStatusBadgeVariant, isOpenStatus } from '../statusBadge'
import { deriveBalance } from '../../data/record/deriveBalance'
import type { CustomerInvoice } from '../../data/types'
import {
  buildCustomerFlowListQuery,
  CUSTOMER_SUPPORT_FLOW_TAGS,
  CUSTOMER_SUPPORT_LIFECYCLE,
  listCustomerFlows
} from '../../data/network/customerFlowClient'

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

describe('customerFlowClient', () => {
  const originalFetch = global.fetch

  afterEach(() => {
    global.fetch = originalFetch
    jest.restoreAllMocks()
  })

  it('builds Customer Support flow queries with Services ownership tags', () => {
    const query = buildCustomerFlowListQuery({
      subjectId: 'account-123',
      lifecycleType: CUSTOMER_SUPPORT_LIFECYCLE.serviceTicket
    })

    expect(query.get('correlationEntity')).toBe('account')
    expect(query.get('correlationEntityId')).toBe('account-123')
    expect(query.get('tag.app')).toBe(CUSTOMER_SUPPORT_FLOW_TAGS.app)
    expect(query.get('tag.serviceCategory')).toBe(CUSTOMER_SUPPORT_FLOW_TAGS.serviceCategory)
    expect(query.get('tag.sourceApp')).toBe(CUSTOMER_SUPPORT_FLOW_TAGS.sourceApp)
    expect(query.get('tag.solution')).toBe(CUSTOMER_SUPPORT_FLOW_TAGS.solution)
    expect(query.get('tag.lifecycleType')).toBe(CUSTOMER_SUPPORT_LIFECYCLE.serviceTicket)
  })

  it('filters returned flows by lifecycle metadata when the response includes it', async () => {
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({
        flows: [
          {
            flowId: 'ticket-flow',
            title: 'Ticket',
            tags: { lifecycleType: CUSTOMER_SUPPORT_LIFECYCLE.serviceTicket }
          },
          {
            flowId: 'reclamation-flow',
            title: 'Reclamation',
            lifecycleType: CUSTOMER_SUPPORT_LIFECYCLE.reclamation
          }
        ]
      })
    })
    global.fetch = fetchMock as unknown as typeof fetch

    const flows = await listCustomerFlows({
      accessToken: 'token',
      subjectId: 'account-123',
      lifecycleType: CUSTOMER_SUPPORT_LIFECYCLE.reclamation
    })

    expect(flows).toHaveLength(1)
    expect(flows[0].id).toBe('reclamation-flow')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toContain('tag.lifecycleType=reclamation')
  })
})
