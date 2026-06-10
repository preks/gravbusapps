import type { WorkforceRunCaseRef, WorkforceRunTraceEvent } from '../../workforceTypes'
import { caseEntityLinks, policyRunLinks } from '../runDetailLinks'

describe('caseEntityLinks', () => {
  it('deep-links a CRM account case', () => {
    const caseRef: WorkforceRunCaseRef = { domain: 'crm', entity_type: 'account', record_id: 'ACC-9' }
    const [link] = caseEntityLinks(caseRef)
    expect(link.kind).toBe('entity')
    expect(link.label).toBe('Account')
    expect(link.value).toBe('ACC-9')
    expect(link.url).toContain('/platform/crm/account-record')
    expect(link.url).toContain('ACC-9')
  })

  it('falls back to a plain chip for a non-navigable (non-CRM) domain', () => {
    const caseRef: WorkforceRunCaseRef = { domain: 'hr', entity_type: 'employee', record_id: 'E-42' }
    const [link] = caseEntityLinks(caseRef)
    expect(link.label).toBe('employee')
    expect(link.value).toBe('E-42')
    expect(link.url).toBeNull()
  })

  it('adds linkable record ids and skips non-navigable extras', () => {
    const caseRef: WorkforceRunCaseRef = {
      domain: 'crm',
      entity_type: 'account',
      record_id: 'ACC-9',
      record_ids: { account_id: 'ACC-9', contact_id: 'C-1', note_id: 'N-7' }
    }
    const links = caseEntityLinks(caseRef)
    const labels = links.map(l => `${l.label}:${l.value}`)
    // Account (primary, deduped) + Contact (linkable). Note is not navigable -> skipped.
    expect(labels).toEqual(['Account:ACC-9', 'Contact:C-1'])
    expect(links.every(l => l.url !== null)).toBe(true)
  })

  it('resolves a display name from record_labels (avatar + name, no id)', () => {
    const caseRef: WorkforceRunCaseRef = {
      domain: 'crm',
      entity_type: 'contact',
      record_id: 'ct-1',
      record_labels: { 'ct-1': 'Maria Schmidt' }
    }
    const [link] = caseEntityLinks(caseRef)
    expect(link.name).toBe('Maria Schmidt')
    expect(link.label).toBe('Contact')
    expect(link.url).toContain('contactId=ct-1')
  })

  it('leaves name null when no label is known', () => {
    const caseRef: WorkforceRunCaseRef = { domain: 'crm', entity_type: 'account', record_id: 'ACC-9' }
    const [link] = caseEntityLinks(caseRef)
    expect(link.name).toBeNull()
  })

  it('returns nothing without a case ref', () => {
    expect(caseEntityLinks(null)).toEqual([])
  })
})

describe('policyRunLinks', () => {
  it('links policy UUIDs and leaves slug refs as plain chips', () => {
    const trace: WorkforceRunTraceEvent[] = [
      { type: 'policy_applied', policy: { policy_id: '11111111-1111-1111-1111-111111111111', title: 'Refund Policy' } },
      { type: 'policy_applied', policy: { policy_id: 'legacy-slug', title: 'Legacy Policy' } }
    ]
    const links = policyRunLinks(trace)
    expect(links).toHaveLength(2)
    expect(links[0].url).not.toBeNull()
    expect(links[0].label).toBe('Refund Policy')
    expect(links[1].url).toBeNull()
  })

  it('surfaces consulted policies from a policy_list tool call, humanising slugs', () => {
    const trace: WorkforceRunTraceEvent[] = [
      {
        type: 'agent_chunk',
        tool_name: 'policy_list',
        content: JSON.stringify([
          { policy_id: 'policy.insurance.claim_triage.v1', title: 'policy.insurance.claim_triage.v1' },
          { policy_id: 'policy.insurance.disclosure.v1', title: 'policy.insurance.disclosure.v1' }
        ])
      }
    ]
    const links = policyRunLinks(trace)
    expect(links.map(l => l.label)).toEqual(['Insurance Claim Triage · v1', 'Insurance Disclosure · v1'])
    expect(links.every(l => l.url === null)).toBe(true)
  })
})
