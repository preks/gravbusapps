/**
 * useEmailCrmSuggestions - Fetches CRM entity suggestions for email-to-activity booking.
 *
 * Three tiers of results, merged and de-duplicated:
 *   1. "Owned" entities – records whose ownerEmployeeId matches the current user
 *   2. "Email-matched" entities – records whose email/communicationChannel matches
 *      the counterparty email addresses from the message
 *   3. "Search" entities – records matching a free-text name query (manual search)
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { EmailMessage, EmailAccount } from '../types'

/* ---------- Types ---------- */

export interface CrmEntityMatch {
  id: string
  name: string
  type: 'account' | 'contact' | 'opportunity' | 'lead'
  email?: string
  code?: string
  pictureThumbnail?: string
  /** Where the match came from */
  source: 'owned' | 'email' | 'search'
}

/* ---------- GraphQL queries ---------- */

const OWNED_ENTITIES_QUERY = `
  query OwnedEntities($employeeId: uuid!, $limit: Int) {
    Account(limit: $limit, where: { _and: [{ isDeleted: { _eq: false } }, { ownerEmployeeId: { _eq: $employeeId } }] }, orderBy: { updatedAt: DESC }) {
      id name code pictureThumbnailUrl
      communicationChannels(where: { isDeleted: { _eq: false }, communicationChannelRef: { _ilike: "%e-mail%" } }, limit: 1) { value }
    }
    Contact(limit: $limit, where: { _and: [{ isDeleted: { _eq: false } }, { ownerEmployeeId: { _eq: $employeeId } }] }, orderBy: { updatedAt: DESC }) {
      id firstName lastName fullName code pictureThumbnailUrl
      communicationChannels(where: { isDeleted: { _eq: false }, communicationChannelRef: { _ilike: "%e-mail%" } }, limit: 1) { value }
    }
    Opportunity(limit: $limit, where: { _and: [{ isDeleted: { _eq: false } }, { ownerEmployeeId: { _eq: $employeeId } }] }, orderBy: { updatedAt: DESC }) {
      id name code
      communicationChannels(where: { isDeleted: { _eq: false }, communicationChannelRef: { _ilike: "%e-mail%" } }, limit: 1) { value }
    }
    Lead(limit: $limit, where: { _and: [{ isDeleted: { _eq: false } }, { ownerEmployeeId: { _eq: $employeeId } }] }, orderBy: { updatedAt: DESC }) {
      id firstName lastName companyName email companyEmail code
    }
  }
`

const EMAIL_MATCH_QUERY = `
  query FindCrmEntitiesByEmail($emailExact: String!, $limit: Int) {
    Account(limit: $limit, where: { _and: [{ isDeleted: { _eq: false } }, { communicationChannels: { value: { _ilike: $emailExact }, communicationChannelRef: { _ilike: "%e-mail%" } } }] }) {
      id name code pictureThumbnailUrl
      communicationChannels(where: { isDeleted: { _eq: false }, communicationChannelRef: { _ilike: "%e-mail%" } }, limit: 1) { value }
    }
    Contact(limit: $limit, where: { _and: [{ isDeleted: { _eq: false } }, { communicationChannels: { value: { _ilike: $emailExact }, communicationChannelRef: { _ilike: "%e-mail%" } } }] }) {
      id firstName lastName fullName code pictureThumbnailUrl
      communicationChannels(where: { isDeleted: { _eq: false }, communicationChannelRef: { _ilike: "%e-mail%" } }, limit: 1) { value }
    }
    Opportunity(limit: $limit, where: { _and: [{ isDeleted: { _eq: false } }, { communicationChannels: { value: { _ilike: $emailExact }, communicationChannelRef: { _ilike: "%e-mail%" } } }] }) {
      id name code
      communicationChannels(where: { isDeleted: { _eq: false }, communicationChannelRef: { _ilike: "%e-mail%" } }, limit: 1) { value }
    }
    Lead(limit: $limit, where: { _and: [{ isDeleted: { _eq: false } }, { _or: [{ email: { _ilike: $emailExact } }, { companyEmail: { _ilike: $emailExact } }] }] }) {
      id firstName lastName companyName email companyEmail code
    }
  }
`

const SEARCH_ENTITIES_QUERY = `
  query SearchCrmEntities($searchPattern: String!, $limit: Int) {
    Account(limit: $limit, where: { _and: [{ isDeleted: { _eq: false } }, { _or: [{ name: { _ilike: $searchPattern } }, { code: { _ilike: $searchPattern } }] }] }, orderBy: { name: ASC }) {
      id name code pictureThumbnailUrl
      communicationChannels(where: { isDeleted: { _eq: false }, communicationChannelRef: { _ilike: "%e-mail%" } }, limit: 1) { value }
    }
    Contact(limit: $limit, where: { _and: [{ isDeleted: { _eq: false } }, { _or: [{ firstName: { _ilike: $searchPattern } }, { lastName: { _ilike: $searchPattern } }, { fullName: { _ilike: $searchPattern } }, { code: { _ilike: $searchPattern } }] }] }, orderBy: { lastName: ASC }) {
      id firstName lastName fullName code pictureThumbnailUrl
      communicationChannels(where: { isDeleted: { _eq: false }, communicationChannelRef: { _ilike: "%e-mail%" } }, limit: 1) { value }
    }
    Opportunity(limit: $limit, where: { _and: [{ isDeleted: { _eq: false } }, { _or: [{ name: { _ilike: $searchPattern } }, { code: { _ilike: $searchPattern } }] }] }, orderBy: { name: ASC }) {
      id name code
      communicationChannels(where: { isDeleted: { _eq: false }, communicationChannelRef: { _ilike: "%e-mail%" } }, limit: 1) { value }
    }
    Lead(limit: $limit, where: { _and: [{ isDeleted: { _eq: false } }, { _or: [{ firstName: { _ilike: $searchPattern } }, { lastName: { _ilike: $searchPattern } }, { companyName: { _ilike: $searchPattern } }, { code: { _ilike: $searchPattern } }] }] }, orderBy: { lastName: ASC }) {
      id firstName lastName companyName email companyEmail code
    }
  }
`

/* ---------- Helpers ---------- */

const getChannelEmail = (channels?: Array<{ value?: string }>): string | undefined => channels?.[0]?.value || undefined

const mapAccountRow = (a: any, source: CrmEntityMatch['source']): CrmEntityMatch => ({
  id: a.id,
  name: a.name || a.code || 'Account',
  type: 'account',
  email: getChannelEmail(a.communicationChannels) || undefined,
  code: a.code,
  pictureThumbnail: a.pictureThumbnailUrl || undefined,
  source
})

const mapContactRow = (c: any, source: CrmEntityMatch['source']): CrmEntityMatch => ({
  id: c.id,
  name: `${c.firstName || ''} ${c.lastName || ''}`.trim() || c.fullName || c.code || 'Contact',
  type: 'contact',
  email: getChannelEmail(c.communicationChannels) || undefined,
  code: c.code,
  pictureThumbnail: c.pictureThumbnailUrl || undefined,
  source
})

const mapOpportunityRow = (o: any, source: CrmEntityMatch['source']): CrmEntityMatch => ({
  id: o.id,
  name: o.name || o.code || 'Opportunity',
  type: 'opportunity',
  email: getChannelEmail(o.communicationChannels) || undefined,
  code: o.code,
  source
})

const mapLeadRow = (l: any, source: CrmEntityMatch['source']): CrmEntityMatch => ({
  id: l.id,
  name: l.companyName || `${l.firstName || ''} ${l.lastName || ''}`.trim() || l.code || 'Lead',
  type: 'lead',
  email: l.email || l.companyEmail || undefined,
  code: l.code,
  source
})

const mapAll = (data: any, source: CrmEntityMatch['source']): CrmEntityMatch[] => [
  ...(data.Account || []).map((a: any) => mapAccountRow(a, source)),
  ...(data.Contact || []).map((c: any) => mapContactRow(c, source)),
  ...(data.Opportunity || []).map((o: any) => mapOpportunityRow(o, source)),
  ...(data.Lead || []).map((l: any) => mapLeadRow(l, source))
]

const dedup = (items: CrmEntityMatch[]): CrmEntityMatch[] => {
  const seen = new Set<string>()
  return items.filter(m => {
    if (seen.has(m.id)) return false
    seen.add(m.id)
    return true
  })
}

/* ---------- Hook ---------- */

interface UseEmailCrmSuggestionsParams {
  message: EmailMessage | null
  accessToken: string
  activeAccount?: EmailAccount | null
  employeeId?: string
  isExpanded: boolean
}

export function useEmailCrmSuggestions({
  message,
  accessToken,
  activeAccount,
  employeeId,
  isExpanded
}: UseEmailCrmSuggestionsParams) {
  const graphqlClient = useGraphQLClient(accessToken)

  const [ownedEntities, setOwnedEntities] = useState<CrmEntityMatch[]>([])
  const [emailMatches, setEmailMatches] = useState<CrmEntityMatch[]>([])
  const [searchResults, setSearchResults] = useState<CrmEntityMatch[]>([])
  const [ownedLoading, setOwnedLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>()

  // Compute counterparty emails from the message
  const counterpartyEmails = useMemo(() => {
    if (!message) return []
    const ownEmail = activeAccount?.emailAddress?.toLowerCase()
    const emails: string[] = []
    if (message.status === 'received' || message.status === 'sending') {
      if (message.fromAddress?.address) {
        const addr = message.fromAddress.address.toLowerCase()
        if (addr !== ownEmail) emails.push(addr)
      }
    } else {
      for (const to of message.toAddresses || []) {
        const addr = to.address?.toLowerCase()
        if (addr && addr !== ownEmail) emails.push(addr)
      }
    }
    return [...new Set(emails)]
  }, [message, activeAccount])

  // 1) Fetch owned entities when panel opens
  useEffect(() => {
    if (!isExpanded || !employeeId || !accessToken) return
    let cancelled = false
    setOwnedLoading(true)

    graphqlClient
      .request<any>(OWNED_ENTITIES_QUERY, { employeeId, limit: 8 })
      .then(data => {
        if (!cancelled) setOwnedEntities(mapAll(data, 'owned'))
      })
      .catch(err => console.error('Owned entities fetch failed:', err))
      .finally(() => {
        if (!cancelled) setOwnedLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [isExpanded, employeeId, accessToken, graphqlClient])

  // 2) Fetch email-matched entities when panel opens
  useEffect(() => {
    if (!isExpanded || counterpartyEmails.length === 0 || !accessToken) {
      setEmailMatches([])
      return
    }

    let cancelled = false
    setEmailLoading(true)

    const searchAll = async () => {
      const allMatches: CrmEntityMatch[] = []
      for (const email of counterpartyEmails) {
        try {
          const data: any = await graphqlClient.request(EMAIL_MATCH_QUERY, { emailExact: email, limit: 5 })
          allMatches.push(...mapAll(data, 'email'))
        } catch (err) {
          console.error('CRM email search failed:', err)
        }
      }
      if (!cancelled) {
        setEmailMatches(dedup(allMatches))
        setEmailLoading(false)
      }
    }

    searchAll()
    return () => {
      cancelled = true
    }
  }, [isExpanded, counterpartyEmails, accessToken, graphqlClient])

  // 3) Manual search by name (debounced)
  const handleSearch = useCallback(
    (term: string) => {
      setSearchTerm(term)
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current)

      if (!term.trim()) {
        setSearchResults([])
        setSearchLoading(false)
        return
      }

      setSearchLoading(true)
      searchTimerRef.current = setTimeout(async () => {
        try {
          const data: any = await graphqlClient.request(SEARCH_ENTITIES_QUERY, {
            searchPattern: `%${term.trim()}%`,
            limit: 10
          })
          setSearchResults(mapAll(data, 'search'))
        } catch (err) {
          console.error('CRM search failed:', err)
        } finally {
          setSearchLoading(false)
        }
      }, 300)
    },
    [graphqlClient]
  )

  // Merge all tiers: owned first, then email matches, then search — deduped
  const allSuggestions = useMemo(
    () => dedup([...ownedEntities, ...emailMatches, ...searchResults]),
    [ownedEntities, emailMatches, searchResults]
  )

  return {
    ownedEntities,
    emailMatches,
    searchResults,
    allSuggestions,
    counterpartyEmails,
    ownedLoading,
    emailLoading,
    searchLoading,
    searchTerm,
    handleSearch
  }
}
