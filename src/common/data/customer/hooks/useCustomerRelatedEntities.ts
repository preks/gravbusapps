import { useCallback, useRef, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { EntityOption } from '@/common/components/common-relations/form-segments/activity-segment/ActivitySegment'

// GraphQL query for relation entities (accounts, contacts, opportunities, leads)
// Uses communicationChannels for Account/Contact/Opportunity email (the field shown on record pages)
// and flat email/companyEmail for Lead (which uses flat fields in its data model)
const GET_CUSTOMER_RELATION_ENTITIES_QUERY = `
  query GetCustomerRelationEntities($searchPattern: String!, $limit: Int, $offset: Int) {
    Account(
      limit: $limit
      offset: $offset
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          {
            _or: [
              { name: { _ilike: $searchPattern } }
              { code: { _ilike: $searchPattern } }
              { communicationChannels: { value: { _ilike: $searchPattern }, communicationChannelRef: { _ilike: "%e-mail%" } } }
            ]
          }
        ]
      }
      orderBy: { name: ASC }
    ) {
      id
      code
      name
      communicationChannels(where: { isDeleted: { _eq: false }, communicationChannelRef: { _ilike: "%e-mail%" } }, limit: 1) {
        value
        communicationChannelRef
      }
    }
    
    Contact(
      limit: $limit
      offset: $offset
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          {
            _or: [
              { firstName: { _ilike: $searchPattern } }
              { lastName: { _ilike: $searchPattern } }
              { fullName: { _ilike: $searchPattern } }
              { code: { _ilike: $searchPattern } }
              { communicationChannels: { value: { _ilike: $searchPattern }, communicationChannelRef: { _ilike: "%e-mail%" } } }
            ]
          }
        ]
      }
      orderBy: { firstName: ASC }
    ) {
      id
      code
      firstName
      lastName
      fullName
      communicationChannels(where: { isDeleted: { _eq: false }, communicationChannelRef: { _ilike: "%e-mail%" } }, limit: 1) {
        value
        communicationChannelRef
      }
    }
    
    Opportunity(
      limit: $limit
      offset: $offset
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          {
            _or: [
              { name: { _ilike: $searchPattern } }
              { code: { _ilike: $searchPattern } }
              { communicationChannels: { value: { _ilike: $searchPattern }, communicationChannelRef: { _ilike: "%e-mail%" } } }
            ]
          }
        ]
      }
      orderBy: { name: ASC }
    ) {
      id
      code
      name
      stage
      communicationChannels(where: { isDeleted: { _eq: false }, communicationChannelRef: { _ilike: "%e-mail%" } }, limit: 1) {
        value
        communicationChannelRef
      }
    }
    
    Lead(
      limit: $limit
      offset: $offset
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          {
            _or: [
              { firstName: { _ilike: $searchPattern } }
              { lastName: { _ilike: $searchPattern } }
              { companyName: { _ilike: $searchPattern } }
              { email: { _ilike: $searchPattern } }
              { companyEmail: { _ilike: $searchPattern } }
              { code: { _ilike: $searchPattern } }
            ]
          }
        ]
      }
      orderBy: { firstName: ASC }
    ) {
      id
      code
      firstName
      lastName
      companyName
      email
      companyEmail
    }
  }
`

/** Communication channel sub-selection returned for Account/Contact/Opportunity */
interface EmailChannelEntry {
  value?: string
  communicationChannelRef?: string
}

/** Helper to extract the first email from communication channels */
const getEmailFromChannels = (channels?: EmailChannelEntry[]): string | undefined => {
  if (!channels || channels.length === 0) return undefined
  return channels[0]?.value || undefined
}

// Type for the GraphQL response
interface CustomerEntitiesResponse {
  Account: Array<{
    id: string
    code?: string
    name?: string
    communicationChannels?: EmailChannelEntry[]
  }>
  Contact: Array<{
    id: string
    code?: string
    firstName?: string
    lastName?: string
    fullName?: string
    communicationChannels?: EmailChannelEntry[]
  }>
  Opportunity: Array<{
    id: string
    code?: string
    name?: string
    stage?: string
    communicationChannels?: EmailChannelEntry[]
  }>
  Lead: Array<{
    id: string
    code?: string
    firstName?: string
    lastName?: string
    companyName?: string
    email?: string
    companyEmail?: string
  }>
}

export const useCustomerRelatedEntities = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const [entities, setEntities] = useState<EntityOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const PAGE_SIZE = 20

  const inFlightRef = useRef<{ key: string; promise: Promise<any> } | null>(null)
  // Persist selected/hydrated entities across searches/pages
  const pinnedRef = useRef<Map<string, EntityOption>>(new Map())

  const fetchPage = useCallback(
    async (term: string, pageOffset: number, append: boolean) => {
      setLoading(true)
      setError(null)
      try {
        const searchPattern = `%${term.trim()}%`
        const result = await graphqlClient.request<CustomerEntitiesResponse>(GET_CUSTOMER_RELATION_ENTITIES_QUERY, {
          searchPattern,
          limit: PAGE_SIZE,
          offset: pageOffset
        })

        // Map results to EntityOption format
        // Account/Contact/Opportunity use communicationChannels EMAIL for subtitle
        // Lead uses flat email / companyEmail fields
        const accountOptions: EntityOption[] = (result.Account || []).map(acc => ({
          id: acc.id,
          name: acc.name || '',
          type: 'account' as const,
          subtitle: getEmailFromChannels(acc.communicationChannels) || acc.code || undefined
        }))

        const contactOptions: EntityOption[] = (result.Contact || []).map(contact => ({
          id: contact.id,
          name:
            `${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
            contact.fullName ||
            contact.code ||
            'Contact',
          type: 'contact' as const,
          subtitle: getEmailFromChannels(contact.communicationChannels) || contact.code || undefined
        }))

        const opportunityOptions: EntityOption[] = (result.Opportunity || []).map(opp => ({
          id: opp.id,
          name: opp.name || '',
          type: 'opportunity' as const,
          subtitle: getEmailFromChannels(opp.communicationChannels) || opp.stage || opp.code || undefined
        }))

        const leadOptions: EntityOption[] = (result.Lead || []).map(lead => ({
          id: lead.id,
          name: lead.companyName || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || 'Unknown Lead',
          type: 'lead' as const,
          subtitle: lead.email || lead.companyEmail || lead.code || undefined
        }))

        const combined = [...accountOptions, ...contactOptions, ...opportunityOptions, ...leadOptions]

        // Append pinned entities so selected items remain visible
        const pinnedList = Array.from(pinnedRef.current.values())
        const entityMap = new Map<string, EntityOption>()
        for (const e of pinnedList) entityMap.set(e.id, e)
        for (const e of combined) entityMap.set(e.id, e)
        const merged = Array.from(entityMap.values())

        setEntities(prev => {
          if (append) {
            // Avoid duplication when loading more
            const existingIds = new Set(prev.map(e => e.id))
            return [...prev, ...merged.filter(e => !existingIds.has(e.id))]
          }
          return merged
        })

        setHasMore(combined.length >= PAGE_SIZE)
        setOffset(pageOffset)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    },
    [PAGE_SIZE, graphqlClient]
  )

  const searchEntities = useCallback(
    (term: string) => {
      const key = `search:${term}`
      // If already in-flight with same key, reuse existing promise
      if (inFlightRef.current?.key === key) {
        return inFlightRef.current.promise
      }
      setSearchTerm(term)
      setOffset(0)
      const promise = fetchPage(term, 0, false)
      inFlightRef.current = { key, promise }
      promise.finally(() => {
        if (inFlightRef.current?.key === key) {
          inFlightRef.current = null
        }
      })
      return promise
    },
    [fetchPage]
  )

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return
    return fetchPage(searchTerm, offset + PAGE_SIZE, true)
  }, [fetchPage, hasMore, loading, offset, PAGE_SIZE, searchTerm])

  // Hydrate a specific entity by ID and type so it appears in the combobox trigger
  const hydrateEntityById = useCallback(
    async (type: 'account' | 'contact' | 'opportunity' | 'lead', entityId: string) => {
      try {
        const typename = type.charAt(0).toUpperCase() + type.slice(1)
        // Account/Contact/Opportunity fetch communicationChannels for email subtitle
        const emailChannelFragment =
          type !== 'lead'
            ? `communicationChannels(where: { isDeleted: { _eq: false }, communicationChannelRef: { _ilike: "%e-mail%" } }, limit: 1) { value communicationChannelRef }`
            : ''
        const query = `
          query GetEntity {
            ${typename}(where: { id: { _eq: "${entityId}" } }) {
              id
              code
              ${type === 'account' ? `name ${emailChannelFragment}` : ''}
              ${type === 'contact' ? `firstName lastName fullName ${emailChannelFragment}` : ''}
              ${type === 'opportunity' ? `name stage ${emailChannelFragment}` : ''}
              ${type === 'lead' ? 'firstName lastName companyName email companyEmail' : ''}
            }
          }
        `
        const result: any = await graphqlClient.request(query)
        const items = result[typename]
        if (items && items.length > 0) {
          const item = items[0]
          let name = ''
          let subtitle = ''

          if (type === 'account') {
            name = item.name || ''
            subtitle = getEmailFromChannels(item.communicationChannels) || item.code || ''
          } else if (type === 'contact') {
            name = `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.fullName || item.code || 'Contact'
            subtitle = getEmailFromChannels(item.communicationChannels) || item.code || ''
          } else if (type === 'opportunity') {
            name = item.name || ''
            subtitle = getEmailFromChannels(item.communicationChannels) || item.stage || item.code || ''
          } else if (type === 'lead') {
            name = item.companyName || `${item.firstName || ''} ${item.lastName || ''}`.trim()
            subtitle = item.email || item.companyEmail || item.code || ''
          }

          const entityOption: EntityOption = {
            id: item.id,
            name,
            type,
            subtitle
          }

          // Pin the entity so it persists across searches
          pinnedRef.current.set(item.id, entityOption)

          // Also add to current entities list if not already present
          setEntities(prev => {
            if (prev.some(e => e.id === item.id)) return prev
            return [entityOption, ...prev]
          })
        }
      } catch (err) {
        console.error(`Failed to hydrate ${type} entity ${entityId}:`, err)
      }
    },
    [graphqlClient]
  )

  return {
    entities,
    loading,
    error,
    hasMore,
    searchEntities,
    loadMore,
    hydrateEntityById
  }
}
