// Investment Document Search Hook - GraphQL-based search with debouncing
import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useDebounce } from '@/common/hooks/useDebounce'
import { INVESTMENT_DOCUMENT } from '../queries/fragments/investmentFragments'
import { toInvestmentDocument } from '../mappers/investmentRelatedEntityMappers'
import type { InvestmentDocument } from '../types/investmentDocumentTypes'

export interface InvestmentDocumentSearchVariables {
  opportunityId?: string
  leadId?: string
  contactId?: string
  accountId?: string
  investmentId?: string
  search?: string
  limit?: number
  offset?: number
}

export interface InvestmentDocumentSearchResponse {
  InvestmentDocument: InvestmentDocument[]
  InvestmentDocumentAggregate: {
    aggregate: {
      count: number
    }
  }
}

// Build GraphQL search query for investment documents
const buildInvestmentDocumentSearchQuery = (variables: InvestmentDocumentSearchVariables): string => {
  const { opportunityId, leadId, contactId, accountId, investmentId, search, limit = 50, offset = 0 } = variables

  // Build entity filter based on which ID is provided
  let entityFilter = ''
  if (opportunityId) {
    entityFilter = `opportunity: { id: { _eq: "${opportunityId}" } }`
  } else if (leadId) {
    entityFilter = `lead: { id: { _eq: "${leadId}" } }`
  } else if (contactId) {
    entityFilter = `contact: { id: { _eq: "${contactId}" } }`
  } else if (accountId) {
    entityFilter = `account: { id: { _eq: "${accountId}" } }`
  } else if (investmentId) {
    entityFilter = `investment: { id: { _eq: "${investmentId}" } }`
  }

  // Build search filter if search term is provided
  let searchFilter = ''
  if (search?.trim()) {
    const searchTerm = search.trim().replace(/"/g, '\\"') // Escape quotes
    searchFilter = `
      _or: [
        { name: { _ilike: "%${searchTerm}%" } },
        { documentType: { value: { _ilike: "%${searchTerm}%" } } },
        { documentGroup: { value: { _ilike: "%${searchTerm}%" } } },
        { mimeType: { _ilike: "%${searchTerm}%" } }
      ]
    `
  }

  // Combine filters
  const whereConditions = ['isDeleted: { _eq: false }', entityFilter, searchFilter].filter(Boolean)

  let whereClause
  if (whereConditions.length === 1) {
    whereClause = `where: { ${whereConditions[0]} }`
  } else {
    // Build proper _and array structure
    const andConditions = whereConditions.map(condition => `{ ${condition} }`).join(', ')
    whereClause = `where: { _and: [${andConditions}] }`
  }

  const query = `
    query SearchInvestmentDocuments {
      InvestmentDocument(
        ${whereClause}
        limit: ${limit}
        offset: ${offset}
        orderBy: [{ createdAt: DESC }]
      ) {
        ${INVESTMENT_DOCUMENT}
        
        # Entity references
        ${
          opportunityId
            ? `
        opportunity {
          id
          code
          name
        }
        `
            : ''
        }
        ${
          leadId
            ? `
        lead {
          id
          code
          firstName
          lastName
        }
        `
            : ''
        }
        ${
          contactId
            ? `
        contact {
          id
          code
          firstName
          lastName
          fullName
        }
        `
            : ''
        }
        ${
          accountId
            ? `
        account {
          id
          code
          name
        }
        `
            : ''
        }
        ${
          investmentId
            ? `
        investment {
          id
          code
          name
        }
        `
            : ''
        }
      }
      
      InvestmentDocumentAggregate(${whereClause}) {
        aggregate {
          count
        }
      }
    }
  `

  return query
}

export const useSearchInvestmentDocuments = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const [searchTerm, setSearchTerm] = useState('')
  const [documents, setDocuments] = useState<any[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentEntityVariables, setCurrentEntityVariables] = useState<Omit<
    InvestmentDocumentSearchVariables,
    'search'
  > | null>(null)

  // Debounce search term to avoid excessive API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 500)

  const searchInvestmentDocuments = useCallback(
    async (variables: InvestmentDocumentSearchVariables) => {
      if (!context.accessToken) {
        setError('No access token available')
        return { documents: [], totalCount: 0 }
      }

      setIsLoading(true)
      setError(null)

      try {
        const query = buildInvestmentDocumentSearchQuery(variables)
        const result = await graphqlClient.request<InvestmentDocumentSearchResponse>(query)
        // Transform base types to enhanced types using mapper
        const enhancedDocuments = result.InvestmentDocument.map(toInvestmentDocument)
        const count = result.InvestmentDocumentAggregate.aggregate.count

        setDocuments(enhancedDocuments)
        setTotalCount(count)

        return {
          documents: enhancedDocuments,
          totalCount: count
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to search documents'
        setError(errorMessage)
        setDocuments([])
        setTotalCount(0)

        return { documents: [], totalCount: 0 }
      } finally {
        setIsLoading(false)
      }
    },
    [graphqlClient, context.accessToken]
  )

  // Auto-search when debounced search term changes
  const performDebouncedSearch = useCallback(
    (entityVariables: Omit<InvestmentDocumentSearchVariables, 'search'>) => {
      // Store entity variables for auto-triggering when search term changes
      setCurrentEntityVariables(entityVariables)

      const searchVariables: InvestmentDocumentSearchVariables = {
        ...entityVariables,
        search: debouncedSearchTerm
      }

      return searchInvestmentDocuments(searchVariables)
    },
    [debouncedSearchTerm, searchInvestmentDocuments]
  )

  // Auto-trigger search when debounced search term changes
  useEffect(() => {
    if (currentEntityVariables && context.accessToken) {
      const searchVariables: InvestmentDocumentSearchVariables = {
        ...currentEntityVariables,
        search: debouncedSearchTerm
      }

      // Call the search function directly to avoid dependency issues
      const performSearch = async () => {
        setIsLoading(true)
        setError(null)

        try {
          const query = buildInvestmentDocumentSearchQuery(searchVariables)
          const result = await graphqlClient.request<InvestmentDocumentSearchResponse>(query)

          const enhancedDocuments = result.InvestmentDocument.map(toInvestmentDocument)
          const count = result.InvestmentDocumentAggregate.aggregate.count

          setDocuments(enhancedDocuments)
          setTotalCount(count)
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to search documents'
          setError(errorMessage)
          setDocuments([])
          setTotalCount(0)
        } finally {
          setIsLoading(false)
        }
      }

      performSearch()
    }
  }, [debouncedSearchTerm, currentEntityVariables, context.accessToken, graphqlClient])

  return {
    // State
    searchTerm,
    documents,
    totalCount,
    isLoading,
    error,

    // Actions
    setSearchTerm,
    searchInvestmentDocuments,
    performDebouncedSearch,

    // Computed
    hasSearchTerm: debouncedSearchTerm.trim().length > 0
  }
}
