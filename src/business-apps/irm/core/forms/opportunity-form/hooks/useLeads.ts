import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

const LEADS_PER_PAGE = 20

export interface LeadData {
  id: string
  name?: string
  firstName?: string
  lastName?: string
  companyName?: string
  businessKey?: string
  code?: string
  email?: string
  phoneNumber?: string
  position?: string
  account?: {
    id: string
    name: string
  }
  contact?: {
    id: string
    firstName?: string
    lastName?: string
    email?: string
  }
  leadStatus?: {
    value: string
    id: string
  }
  leadSource?: {
    value: string
    id: string
  }
  status?: {
    value: string
    id: string
  }
  ownerEmployee?: {
    firstName: string
    lastName: string
  }
}

export interface LeadResponse {
  Lead: LeadData[]
  LeadAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface LeadVariables {
  limit?: number
  offset?: number
  search?: string
}

export interface UseLeadsReturn {
  leads: LeadData[]
  loading: boolean
  error: string | null
  hasMore: boolean
  total: number
  loadMore: () => Promise<void>
  searchLeads: (searchTerm?: string) => void
  retry: () => void
}

export const GET_LEADS = (variables: LeadVariables): string => {
  const searchFilter = variables.search
    ? `, {
        _or: [
          { name: { _ilike: "%${variables.search}%" } }
          { firstName: { _ilike: "%${variables.search}%" } }
          { lastName: { _ilike: "%${variables.search}%" } }
          { companyName: { _ilike: "%${variables.search}%" } }
          { businessKey: { _ilike: "%${variables.search}%" } }
          { code: { _ilike: "%${variables.search}%" } }
          { email: { _ilike: "%${variables.search}%" } }
          { phoneNumber: { _ilike: "%${variables.search}%" } }
          { position: { _ilike: "%${variables.search}%" } }
          { account: { name: { _ilike: "%${variables.search}%" } } }
          { contact: { firstName: { _ilike: "%${variables.search}%" } } }
          { contact: { lastName: { _ilike: "%${variables.search}%" } } }
          { contact: { email: { _ilike: "%${variables.search}%" } } }
          { leadStatus: { value: { _ilike: "%${variables.search}%" } } }
          { leadSource: { value: { _ilike: "%${variables.search}%" } } }
          { status: { value: { _ilike: "%${variables.search}%" } } }
        ]
      }`
    : ''

  return `
    query GetLeads {
      Lead(
        limit: ${variables.limit || LEADS_PER_PAGE}
        offset: ${variables.offset || 0}
        where: {
          _and: [
            { isDeleted: { _eq: false } }${searchFilter}
          ]
        }
        orderBy: [
          { createdAt: DESC }
          { lastName: ASC }
          { firstName: ASC }
        ]
      ) {
        id
        name
        firstName
        lastName
        companyName
        businessKey
        code
        email
        phoneNumber
        position
        account {
          id
          name
        }
        contact {
          id
          firstName
          lastName
          email
        }
        leadStatus {
          id
          value
        }
        leadSource {
          id
          value
        }
        status {
          id
          value
        }
        ownerEmployee {
          firstName
          lastName
        }
      }

      LeadAggregate(
        where: {
          _and: [
            { isDeleted: { _eq: false } }${searchFilter}
          ]
        }
      ) {
        aggregate {
          count
        }
      }
    }
  `
}

export const useLeads = ({ accessToken }: { accessToken: string }): UseLeadsReturn => {
  const [leads, setLeads] = useState<LeadData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [currentSearch, setCurrentSearch] = useState<string>('')

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchLeads = useCallback(
    async (searchTerm: string = '', resetOffset: boolean = false) => {
      if (!accessToken) {
        setError('No access token available')
        return
      }

      try {
        setLoading(true)
        setError(null)

        const currentOffset = resetOffset ? 0 : offset
        const variables: LeadVariables = {
          limit: LEADS_PER_PAGE,
          offset: currentOffset,
          search: searchTerm.trim() || undefined
        }

        const query = GET_LEADS(variables)
        const response = await graphqlClient.request<LeadResponse>(query)

        if (response?.Lead && response?.LeadAggregate) {
          const newLeads = response.Lead
          const totalCount = response.LeadAggregate.aggregate.count

          setLeads(prevLeads => (resetOffset ? newLeads : [...prevLeads, ...newLeads]))
          setTotal(totalCount)
          setHasMore(newLeads.length === LEADS_PER_PAGE && currentOffset + newLeads.length < totalCount)
          setOffset(currentOffset + newLeads.length)
        } else {
          setError('Invalid response format')
        }
      } catch (err) {
        console.error('Error fetching leads:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch leads')
      } finally {
        setLoading(false)
      }
    },
    [accessToken, offset, graphqlClient]
  )

  const searchLeads = useCallback(
    (searchTerm: string = '') => {
      setCurrentSearch(searchTerm)
      setOffset(0)
      setLeads([])
      setHasMore(true)
      fetchLeads(searchTerm, true)
    },
    [fetchLeads]
  )

  const loadMore = useCallback(async () => {
    if (!loading && hasMore) {
      await fetchLeads(currentSearch, false)
    }
  }, [loading, hasMore, fetchLeads, currentSearch])

  const retry = useCallback(() => {
    setOffset(0)
    setLeads([])
    setHasMore(true)
    fetchLeads(currentSearch, true)
  }, [fetchLeads, currentSearch])

  // Initial load
  useEffect(() => {
    if (accessToken) {
      fetchLeads('', true)
    }
  }, [accessToken]) // Only run when accessToken changes

  return {
    leads,
    loading,
    error,
    hasMore,
    total,
    loadMore,
    searchLeads,
    retry
  }
}
