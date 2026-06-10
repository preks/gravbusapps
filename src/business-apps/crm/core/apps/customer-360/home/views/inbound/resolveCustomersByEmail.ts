/**
 * View-time inbound identity resolution.
 *
 * Mirrors the agent's `resolve_customer_by_email` Functions tool, but runs in
 * the browser with the viewer's own access token — so the Inbound tab can
 * show "who wrote in" even when the headless run could not resolve the
 * customer itself (e.g. service-account auth not configured). Exact email
 * beats domain; contact beats account.
 */
import { GraphQLClient } from '@/common/network/graphql/GraphQLClient'
import type { CustomerSubjectType } from '../../../data/types'

export interface InboundCustomerMatch {
  type: CustomerSubjectType
  id: string
  label: string
  matchType: 'email' | 'domain'
}

interface RawContactRow {
  id?: string
  firstName?: string
  lastName?: string
  fullName?: string
}

interface RawAccountRow {
  id?: string
  name?: string
}

const EXACT_EMAIL_QUERY = `query InboundResolveEmail($email: String!) {
  Contact(where: { isDeleted: { _eq: false }, communicationChannels: { value: { _ilike: $email } } }, limit: 5) {
    id firstName lastName fullName
  }
  Account(where: { isDeleted: { _eq: false }, communicationChannels: { value: { _ilike: $email } } }, limit: 5) {
    id name
  }
}`

const DOMAIN_QUERY = `query InboundResolveDomain($domainLike: String!, $emailLike: String!) {
  Account(
    where: {
      isDeleted: { _eq: false }
      _or: [{ website: { _ilike: $domainLike } }, { communicationChannels: { value: { _ilike: $emailLike } } }]
    }
    limit: 5
  ) {
    id name
  }
}`

function contactLabel(row: RawContactRow): string {
  if (row.fullName) return row.fullName
  const joined = [row.firstName, row.lastName].filter(Boolean).join(' ').trim()
  return joined || 'Unknown contact'
}

/** Resolve one sender email to its best CRM match, or null when unmatched. */
export async function resolveCustomerByEmail(
  client: GraphQLClient,
  email: string
): Promise<InboundCustomerMatch | null> {
  const normalized = email.trim().toLowerCase()
  if (!normalized.includes('@')) return null

  const exact = await client.request<{ Contact?: RawContactRow[]; Account?: RawAccountRow[] }>(EXACT_EMAIL_QUERY, {
    email: normalized
  })
  const contact = (exact.Contact ?? []).find(row => row.id)
  if (contact?.id) {
    return { type: 'contact', id: contact.id, label: contactLabel(contact), matchType: 'email' }
  }
  const account = (exact.Account ?? []).find(row => row.id)
  if (account?.id) {
    return { type: 'account', id: account.id, label: account.name || 'Unknown account', matchType: 'email' }
  }

  const domain = normalized.slice(normalized.lastIndexOf('@') + 1)
  if (!domain) return null
  const byDomain = await client.request<{ Account?: RawAccountRow[] }>(DOMAIN_QUERY, {
    domainLike: `%${domain}%`,
    emailLike: `%@${domain}`
  })
  const domainAccount = (byDomain.Account ?? []).find(row => row.id)
  if (domainAccount?.id) {
    return {
      type: 'account',
      id: domainAccount.id,
      label: domainAccount.name || 'Unknown account',
      matchType: 'domain'
    }
  }
  return null
}
