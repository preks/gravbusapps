/**
 * Inbound view-time customer matching — sender extraction + GraphQL resolution.
 *
 * Covers the fallback path the Inbound tab uses when a run carries no
 * persisted `customer_ref`: pull the sender email out of the run
 * (trigger_payload or raw input text) and resolve it against CRM with the
 * viewer's token (exact email beats domain, contact beats account).
 */
import type { WorkforceRun } from '@/business-apps/core/every-fabric/apps/every-fabric/components/enterprise-workforce/workforceTypes'
import type { GraphQLClient } from '@/common/network/graphql/GraphQLClient'
import { readSenderEmail } from '../inboundRunFields'
import { resolveCustomerByEmail } from '../resolveCustomersByEmail'

function run(partial: Partial<WorkforceRun>): WorkforceRun {
  return { session_id: 's-1', status: 'completed', ...partial } as WorkforceRun
}

describe('readSenderEmail', () => {
  it('prefers the structured trigger payload', () => {
    const result = readSenderEmail(
      run({ trigger_payload: { from: 'CEO@Acme.com' }, input: 'Inbound email from other@else.io' })
    )
    expect(result).toBe('ceo@acme.com')
  })

  it('extracts the address from "Display Name <addr>" payloads', () => {
    expect(readSenderEmail(run({ trigger_payload: { from: 'Jane Doe <jane@acme.com>' } }))).toBe('jane@acme.com')
  })

  it('falls back to the run input text', () => {
    expect(readSenderEmail(run({ input: 'Inbound email from ceo@acme.com\nSubject: Invoice overdue' }))).toBe(
      'ceo@acme.com'
    )
  })

  it('returns empty when no email is present', () => {
    expect(readSenderEmail(run({ input: 'Quarterly portfolio review' }))).toBe('')
  })
})

describe('resolveCustomerByEmail', () => {
  function clientWith(responses: Array<Record<string, unknown>>): GraphQLClient {
    const request = jest.fn()
    responses.forEach(response => request.mockResolvedValueOnce(response))
    return { request } as unknown as GraphQLClient
  }

  it('prefers an exact contact match over accounts', async () => {
    const client = clientWith([
      {
        Contact: [{ id: 'con-1', firstName: 'Jane', lastName: 'Doe' }],
        Account: [{ id: 'acc-1', name: 'ACME GmbH' }]
      }
    ])
    const match = await resolveCustomerByEmail(client, 'jane@acme.com')
    expect(match).toEqual({ type: 'contact', id: 'con-1', label: 'Jane Doe', matchType: 'email' })
  })

  it('returns an exact account match when no contact matches', async () => {
    const client = clientWith([{ Contact: [], Account: [{ id: 'acc-1', name: 'ACME GmbH' }] }])
    const match = await resolveCustomerByEmail(client, 'office@acme.com')
    expect(match).toEqual({ type: 'account', id: 'acc-1', label: 'ACME GmbH', matchType: 'email' })
  })

  it('falls back to a domain account match', async () => {
    const client = clientWith([{ Contact: [], Account: [] }, { Account: [{ id: 'acc-2', name: 'ACME GmbH' }] }])
    const match = await resolveCustomerByEmail(client, 'someone@acme.com')
    expect(match).toEqual({ type: 'account', id: 'acc-2', label: 'ACME GmbH', matchType: 'domain' })
  })

  it('returns null when nothing matches', async () => {
    const client = clientWith([{ Contact: [], Account: [] }, { Account: [] }])
    expect(await resolveCustomerByEmail(client, 'nobody@unknown.io')).toBeNull()
  })

  it('rejects non-email input without querying', async () => {
    const client = clientWith([])
    expect(await resolveCustomerByEmail(client, 'not-an-email')).toBeNull()
    expect((client as unknown as { request: jest.Mock }).request).not.toHaveBeenCalled()
  })
})
