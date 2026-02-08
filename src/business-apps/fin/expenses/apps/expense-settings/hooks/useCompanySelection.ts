import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

export interface CompanyOption {
  id: string
  value: string
  label: string
  name: string
  code?: string
  description?: string
}

export interface UseCompanySelectionParams {
  pageSize?: number
}

export interface UseCompanySelectionState {
  companies: CompanyOption[]
  isLoading: boolean
  error: string | null
  hasMore: boolean
  offset: number
  currentSearch: string
}

const GET_COMPANIES_QUERY = `
  query GetCompanies($where: CompanyBoolExp, $limit: Int, $offset: Int) {
    Company(
      where: $where
      limit: $limit
      offset: $offset
      orderBy: [{ name: ASC }]
    ) {
      id
      name
      code
      description
    }
  }
`

export const useCompanySelection = (
  context: BusinessAppContextProps,
  { pageSize = 20 }: UseCompanySelectionParams = {}
) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const [state, setState] = useState<UseCompanySelectionState>({
    companies: [],
    isLoading: false,
    error: null,
    hasMore: true,
    offset: 0,
    currentSearch: ''
  })

  const fetchCompanies = useCallback(
    async (search: string = '', offset: number = 0, append: boolean = false) => {
      if (!context.accessToken) {
        return
      }

      setState(prev => ({
        ...prev,
        isLoading: true,
        error: null,
        ...(append ? {} : { companies: [] })
      }))

      try {
        const structureId = getCurrentActiveStructureId()
        if (!structureId) {
          setState(prev => ({
            ...prev,
            isLoading: false,
            error: 'No active structure ID available.',
            hasMore: false,
            ...(append ? {} : { companies: [] })
          }))
          return
        }

        // Build where condition with required structureId filter (matching employee pattern)
        const whereCondition: any = {
          _and: [{ isDeleted: { _eq: false } }, { structureId: { _eq: structureId } }]
        }

        // Add search conditions
        if (search.trim()) {
          whereCondition._and.push({
            _or: [
              { name: { _ilike: `%${search.trim()}%` } },
              { code: { _ilike: `%${search.trim()}%` } },
              { description: { _ilike: `%${search.trim()}%` } }
            ]
          })
        }

        const variables = {
          where: whereCondition,
          limit: pageSize,
          offset
        }

        const response = await graphqlClient.request(GET_COMPANIES_QUERY, variables)

        const mappedCompanies: CompanyOption[] = response.Company.map((company: any) => ({
          id: company.id,
          value: company.id,
          label: company.name || 'Unnamed Company',
          name: company.name || 'Unnamed Company',
          code: company.code,
          description: company.description
        }))

        const hasMoreRecords = mappedCompanies.length === pageSize

        setState(prev => ({
          ...prev,
          companies: append ? [...prev.companies, ...mappedCompanies] : mappedCompanies,
          isLoading: false,
          hasMore: hasMoreRecords,
          currentSearch: search,
          offset: append ? prev.offset + mappedCompanies.length : mappedCompanies.length
        }))
      } catch (error) {
        console.error('Error fetching companies:', error)
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: error instanceof Error ? error.message : 'Failed to fetch companies',
          companies: append ? prev.companies : []
        }))
      }
    },
    [context.accessToken, graphqlClient, pageSize]
  )

  const loadMore = useCallback(() => {
    if (state.hasMore && !state.isLoading) {
      fetchCompanies(state.currentSearch, state.offset, true)
    }
  }, [fetchCompanies, state.hasMore, state.isLoading, state.currentSearch, state.offset])

  const search = useCallback(
    (searchTerm: string) => {
      fetchCompanies(searchTerm, 0, false)
    },
    [fetchCompanies]
  )

  const reset = useCallback(() => {
    setState({
      companies: [],
      isLoading: false,
      error: null,
      hasMore: true,
      offset: 0,
      currentSearch: ''
    })
  }, [])

  // Initial load
  useEffect(() => {
    if (context.accessToken) {
      fetchCompanies()
    }
  }, [context.accessToken, fetchCompanies])

  return {
    companies: state.companies,
    isLoading: state.isLoading,
    error: state.error,
    hasMore: state.hasMore,
    loadMore,
    search,
    reset
  }
}
