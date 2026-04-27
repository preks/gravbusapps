import { useCallback, useRef, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CATALOG_ENTRY_REF } from '@/common/data/catalog/queries/catalogFragments'
import type { EntityOption } from '@/common/components/common-relations/form-segments/activity-segment/ActivitySegment'

// GraphQL query for relation entities (accounts, contacts, opportunities, leads, investments)
const GET_INVESTMENT_RELATION_ENTITIES_QUERY = `
  query GetInvestmentRelationEntities($searchPattern: String!, $limit: Int, $offset: Int) {
    InvestmentAccount(
      limit: $limit
      offset: $offset
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          {
            _or: [
              { name: { _ilike: $searchPattern } }
              { email: { _ilike: $searchPattern } }
              { code: { _ilike: $searchPattern } }
            ]
          }
        ]
      }
      orderBy: { name: ASC }
    ) {
      id
      code
      name
      email
      pictureThumbnail
    }
    
    InvestmentContact(
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
              { email: { _ilike: $searchPattern } }
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
      fullName
      email
      pictureThumbnail
    }
    
    InvestmentOpportunity(
      limit: $limit
      offset: $offset
      where: {
        _and: [
          { isDeleted: { _eq: false } }
          {
            _or: [
              { name: { _ilike: $searchPattern } }
              { code: { _ilike: $searchPattern } }
            ]
          }
        ]
      }
      orderBy: { name: ASC }
    ) {
      id
      code
      name
      dealType
    }
    
    InvestmentLead(
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
    }
    
    Investment(
      limit: $limit
      offset: $offset
      where: {
        _or: [
          { name: { _ilike: $searchPattern } }
          { code: { _ilike: $searchPattern } }
        ]
      }
      orderBy: { name: ASC }
    ) {
      id
      code
      name
      totalInvestmentAmount
      investmentMarketValue
      currency {
        ${CATALOG_ENTRY_REF}
      }
    }
  }
`

// Type for the GraphQL response
interface InvestmentEntitiesResponse {
  InvestmentAccount: Array<{
    id: string
    code?: string
    name?: string
    email?: string
    pictureThumbnail?: string
  }>
  InvestmentContact: Array<{
    id: string
    code?: string
    firstName?: string
    lastName?: string
    fullName?: string
    email?: string
    pictureThumbnail?: string
  }>
  InvestmentOpportunity: Array<{
    id: string
    code?: string
    name?: string
    dealType?: string
  }>
  InvestmentLead: Array<{
    id: string
    code?: string
    firstName?: string
    lastName?: string
    companyName?: string
    email?: string
  }>
  Investment: Array<{
    id: string
    code?: string
    name?: string
    totalInvestmentAmount?: number
    investmentMarketValue?: number
    currency?: {
      id?: string
      code?: string
      value?: string
      displayName?: string
    }
  }>
}

export const useInvestmentEntities = (context: BusinessAppContextProps) => {
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
        const variables = { searchPattern, limit: PAGE_SIZE, offset: pageOffset } as const
        const key = `${variables.searchPattern}|${variables.limit}|${variables.offset}`
        if (inFlightRef.current?.key === key) {
          await inFlightRef.current.promise
          return
        }
        const promise = graphqlClient.request<InvestmentEntitiesResponse>(
          GET_INVESTMENT_RELATION_ENTITIES_QUERY,
          variables
        )
        inFlightRef.current = { key, promise }
        const result = await promise

        const nextEntities: EntityOption[] = []

        ;(result.InvestmentAccount || []).forEach(account => {
          nextEntities.push({
            id: account.id,
            name: account.name || account.code || 'Account',
            type: 'account',
            subtitle: account.email,
            pictureThumbnail: (account as any).pictureThumbnail
          })
        })
        ;(result.InvestmentContact || []).forEach(contact => {
          const contactName =
            `${contact.firstName || ''} ${contact.lastName || ''}`.trim() ||
            contact.fullName ||
            contact.code ||
            'Contact'
          nextEntities.push({
            id: contact.id,
            name: contactName,
            type: 'contact',
            subtitle: contact.email,
            pictureThumbnail: (contact as any).pictureThumbnail
          })
        })
        ;(result.InvestmentOpportunity || []).forEach(opportunity => {
          nextEntities.push({
            id: opportunity.id,
            name: opportunity.name || opportunity.code || 'Opportunity',
            type: 'opportunity',
            subtitle: opportunity.dealType
          })
        })
        ;(result.InvestmentLead || []).forEach(lead => {
          const leadName =
            `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || lead.companyName || lead.code || 'Lead'
          nextEntities.push({
            id: lead.id,
            name: leadName,
            type: 'lead',
            subtitle: lead.companyName && leadName !== lead.companyName ? lead.companyName : lead.email
          })
        })
        ;(result.Investment || []).forEach(investment => {
          const currencyValue = investment.currency?.value ? ` (${investment.currency.value})` : ''
          // Use totalInvestmentAmount or investmentMarketValue for display
          const value = investment.totalInvestmentAmount || investment.investmentMarketValue
          const totalValueText = value ? `${value.toLocaleString()}${currencyValue}` : ''
          nextEntities.push({
            id: investment.id,
            name: investment.name || investment.code || 'Investment',
            type: 'investment',
            subtitle: totalValueText || investment.code
          })
        })

        // Merge previous (when appending) + current page with pinned
        setEntities(prev => {
          const map = new Map<string, EntityOption>()
          if (append) {
            prev.forEach(p => map.set(p.id, p))
          }
          nextEntities.forEach(e => map.set(e.id, e))
          pinnedRef.current.forEach((val, key) => {
            if (!map.has(key)) {
              map.set(key, val)
            }
          })
          return Array.from(map.values())
        })

        const lengths = [
          (result.InvestmentAccount || []).length,
          (result.InvestmentContact || []).length,
          (result.InvestmentOpportunity || []).length,
          (result.InvestmentLead || []).length,
          (result.Investment || []).length
        ]
        const nextHasMore = lengths.some(len => len === PAGE_SIZE)
        setHasMore(nextHasMore)
        setOffset(pageOffset)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to search entities'
        setError(errorMessage)
        console.error('Error searching investment entities:', err)
      } finally {
        inFlightRef.current = null
        setLoading(false)
      }
    },
    [PAGE_SIZE, graphqlClient]
  )

  const searchEntities = useCallback(
    async (q: string) => {
      if (!context.accessToken) {
        return
      }
      const trimmed = q?.trim() || ''
      setSearchTerm(trimmed)
      // Allow empty query to return a first page of results
      await fetchPage(trimmed, 0, false)
    },
    [context.accessToken, fetchPage]
  )

  const loadMore = useCallback(async () => {
    if (loading || !hasMore) return
    await fetchPage(searchTerm, offset + PAGE_SIZE, true)
  }, [fetchPage, hasMore, loading, offset, PAGE_SIZE, searchTerm])

  // Hydrate and pin by id + type so selected item always appears with full info
  const hydrateEntityById = useCallback(
    async (
      type: 'account' | 'contact' | 'opportunity' | 'lead' | 'investment',
      id: string
    ): Promise<EntityOption | undefined> => {
      if (!id) return undefined
      if (pinnedRef.current.has(id)) return pinnedRef.current.get(id)
      const buildQuery = () => {
        if (type === 'account') {
          return {
            query: `query GetAccountById($id: uuid!) { InvestmentAccount(where: { id: { _eq: $id } }) { id name code email pictureThumbnail } }`,
            key: 'InvestmentAccount'
          } as const
        }
        if (type === 'contact') {
          return {
            query: `query GetContactById($id: uuid!) { InvestmentContact(where: { id: { _eq: $id } }) { id firstName lastName fullName code email pictureThumbnail } }`,
            key: 'InvestmentContact'
          } as const
        }
        if (type === 'opportunity') {
          return {
            query: `query GetOpportunityById($id: uuid!) { InvestmentOpportunity(where: { id: { _eq: $id } }) { id name code dealType } }`,
            key: 'InvestmentOpportunity'
          } as const
        }
        if (type === 'investment') {
          return {
            query: `query GetInvestmentById($id: uuid!) { Investment(where: { id: { _eq: $id } }) { id name code totalInvestmentAmount investmentMarketValue currency { ${CATALOG_ENTRY_REF} } } }`,
            key: 'Investment'
          } as const
        }
        return {
          query: `query GetLeadById($id: uuid!) { InvestmentLead(where: { id: { _eq: $id } }) { id firstName lastName companyName code email } }`,
          key: 'InvestmentLead'
        } as const
      }
      try {
        const { query, key } = buildQuery()
        const result = await graphqlClient.request<any>(query, { id })
        const row = result?.[key]?.[0]
        if (!row) return undefined
        const record: EntityOption = ((): EntityOption => {
          if (type === 'account') {
            return {
              id: row.id,
              name: row.name || row.code || 'Account',
              type: 'account',
              subtitle: row.email,
              pictureThumbnail: row.pictureThumbnail
            }
          }
          if (type === 'contact') {
            const contactName =
              `${row.firstName || ''} ${row.lastName || ''}`.trim() || row.fullName || row.code || 'Contact'
            return {
              id: row.id,
              name: contactName,
              type: 'contact',
              subtitle: row.email,
              pictureThumbnail: row.pictureThumbnail
            }
          }
          if (type === 'opportunity') {
            return {
              id: row.id,
              name: row.name || row.code || 'Opportunity',
              type: 'opportunity',
              subtitle: row.dealType
            }
          }
          if (type === 'investment') {
            const currencyValue = row.currency?.value ? ` (${row.currency.value})` : ''
            const value = row.totalInvestmentAmount || row.investmentMarketValue
            const totalValueText = value ? `${value.toLocaleString()}${currencyValue}` : ''
            return {
              id: row.id,
              name: row.name || row.code || 'Investment',
              type: 'investment',
              subtitle: totalValueText || row.code
            }
          }
          const leadName =
            `${row.firstName || ''} ${row.lastName || ''}`.trim() || row.companyName || row.code || 'Lead'
          return {
            id: row.id,
            name: leadName,
            type: 'lead',
            subtitle: row.companyName && leadName !== row.companyName ? row.companyName : row.email
          }
        })()
        pinnedRef.current.set(record.id, record)
        setEntities(prev => {
          const map = new Map<string, EntityOption>()
          prev.forEach(e => map.set(e.id, e))
          pinnedRef.current.forEach((val, key2) => map.set(key2, val))
          return Array.from(map.values())
        })
        return record
      } catch (e) {
        console.error('Error hydrating entity by id:', e)
        return undefined
      }
    },
    [graphqlClient]
  )

  return {
    entities,
    loading,
    error,
    searchEntities,
    hasMore,
    loadMore,
    hydrateEntityById
  }
}
