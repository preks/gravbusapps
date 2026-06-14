import { buildCustomer360Handoff, buildSnapshotContext } from '../agentHandoff'
import type { Customer360Snapshot, Customer360Subject } from '../../../data/types'

const subject: Customer360Subject = {
  id: 'cust-123',
  type: 'account',
  displayName: 'Acme GmbH',
  status: 'active',
  account: { id: 'cust-123', name: 'Acme GmbH' } as Customer360Subject['account']
}

const snapshot: Customer360Snapshot = {
  scores: { aiScore: 82, icpScore: 70, scoreLabel: 'A' },
  satisfaction: { csat: 4.6, nps: 55 },
  contracts: [{ id: 'c1', name: 'SECRET_CONTRACT_NAME' }],
  tickets: [{ id: 't1', title: 'SECRET_TICKET_TITLE' }],
  cases: [{ id: 'case1', title: 'SECRET_CASE_TITLE' }],
  reclamations: [{ id: 'r1', title: 'SECRET_RECLAMATION' }],
  invoices: [{ id: 'i1', number: 'SECRET_INVOICE_NUMBER', amount: 100 }],
  balance: { openAmount: 100, overdueAmount: 0, lifetimeValue: 1000, currency: 'EUR' },
  transactions: [{ id: 'tx1', description: 'SECRET_TRANSACTION_DESC', amount: 50 }],
  journal: [{ id: 'j1', title: 'SECRET_JOURNAL_TITLE', summary: 'SECRET_JOURNAL_SUMMARY' }]
}

describe('buildSnapshotContext (PII safety)', () => {
  const context = buildSnapshotContext(subject, snapshot)

  it('includes the display name, type, id and numeric KPIs / counts', () => {
    expect(context).toContain('Acme GmbH')
    expect(context).toContain('account')
    expect(context).toContain('cust-123')
    expect(context).toContain('ICP score: 70')
    expect(context).toContain('AI score: 82')
    expect(context).toContain('CSAT: 4.6')
    expect(context).toContain('Active contracts: 1')
    expect(context).toContain('Open tickets: 1')
    expect(context).toContain('Journal entries: 1')
  })

  it('never leaks free-text record fields (names, titles, summaries, numbers)', () => {
    const leaks = [
      'SECRET_CONTRACT_NAME',
      'SECRET_TICKET_TITLE',
      'SECRET_CASE_TITLE',
      'SECRET_RECLAMATION',
      'SECRET_INVOICE_NUMBER',
      'SECRET_TRANSACTION_DESC',
      'SECRET_JOURNAL_TITLE',
      'SECRET_JOURNAL_SUMMARY'
    ]
    for (const secret of leaks) {
      expect(context).not.toContain(secret)
    }
  })
})

describe('buildCustomer360Handoff', () => {
  it('seeds a prompt that references the subject and the getCustomer360 tool', () => {
    const handoff = buildCustomer360Handoff(subject, snapshot)
    expect(handoff.prompt).toContain('Acme GmbH')
    expect(handoff.prompt).toContain('getCustomer360')
    expect(handoff.prompt).toContain('cust-123')
    expect(Array.isArray(handoff.skills)).toBe(true)
    expect(handoff.skills.length).toBeGreaterThan(0)
    expect(handoff.additionInfo).toContain('Acme GmbH')
  })

  it('embeds the deep-link back into the additionInfo when available', () => {
    const handoff = buildCustomer360Handoff(subject, snapshot)
    if (handoff.deepLinkBack) {
      expect(handoff.additionInfo).toContain(handoff.deepLinkBack)
      expect(handoff.deepLinkBack).toContain('customer-360')
    }
  })
})
