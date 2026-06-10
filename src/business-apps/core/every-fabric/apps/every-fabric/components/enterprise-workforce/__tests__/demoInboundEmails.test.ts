import { findDemoInboundEmail, formatDemoInboundEmailAsTask, INSURANCE_DEMO_INBOUND_EMAILS } from '../demoInboundEmails'

describe('demoInboundEmails', () => {
  it('defines six insurance demo scenarios', () => {
    expect(INSURANCE_DEMO_INBOUND_EMAILS).toHaveLength(6)
    expect(INSURANCE_DEMO_INBOUND_EMAILS.map(email => email.id)).toEqual([
      'status_update',
      'new_claim_no_policy',
      'settlement_amount',
      'high_value_claim',
      'document_upload',
      'complaint'
    ])
  })

  it('findDemoInboundEmail returns a match by id', () => {
    const email = findDemoInboundEmail('status_update')
    expect(email?.subject).toBe('Claim status for policy NW-2024-88421')
    expect(findDemoInboundEmail('missing')).toBeUndefined()
  })

  it('formatDemoInboundEmailAsTask includes headers and body', () => {
    const email = findDemoInboundEmail('status_update')
    expect(email).toBeDefined()
    const task = formatDemoInboundEmailAsTask(email!)
    expect(task).toContain('Subject: Claim status for policy NW-2024-88421')
    expect(task).toContain('From: maria.schmidt@example.com')
    expect(task).toContain('To: claims@insurance-demo.local')
    expect(task).toContain('Policy number: NW-2024-88421')
    expect(task).toContain('Maria Schmidt')
  })
})
