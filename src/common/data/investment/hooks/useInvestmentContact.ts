// Investment Contact hook - single contact by ID with automatic state management
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { toInvestmentContact, type InvestmentContact } from '../types/investmentContactTypes'
import { buildInvestmentContactByIdQuery } from '../queries/investmentContactQueries'

export interface UseInvestmentContactResult {
  contact: InvestmentContact | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Declarative hook for fetching a single investment contact by ID.
 * Automatically fetches data when component mounts or ID changes.
 *
 * @param accessToken - Access token for authentication
 * @param id - Contact ID to fetch
 *
 * @example
 * // Basic usage
 * const { contact, loading, error } = useInvestmentContact(accessToken, contactId)
 *
 * if (loading) return <Spinner />
 * if (error) return <Alert>{error}</Alert>
 *
 * return <div>{contact?.firstName} {contact?.lastName}</div>
 *
 * @example
 * // With refetch
 * const { contact, loading, refetch } = useInvestmentContact(accessToken, contactId)
 *
 * return (
 *   <div>
 *     <div>{contact?.firstName} {contact?.lastName}</div>
 *     <Button onClick={refetch}>Refresh</Button>
 *   </div>
 * )
 */
export function useInvestmentContact(accessToken: string, id: string | undefined): UseInvestmentContactResult {
  const graphqlClient = useGraphQLClient(accessToken)

  const [state, setState] = useState<Omit<UseInvestmentContactResult, 'refetch'>>({
    contact: null,
    loading: true,
    error: null
  })

  const fetchContact = useCallback(async () => {
    // Don't fetch if no ID or no access token
    if (!id || !accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Build query
      const query = buildInvestmentContactByIdQuery()

      // Execute query with ID as GraphQL variable
      const result = await graphqlClient.request<{ InvestmentContactByPk: InvestmentContact | null }>(query, {
        id
      })

      const raw = result.InvestmentContactByPk
      const contact = raw ? toInvestmentContact(raw) : null

      setState({ contact, loading: false, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch investment contact'
      console.error('Error fetching investment contact:', error)
      setState({ contact: null, loading: false, error: errorMessage })
    }
  }, [id, accessToken, graphqlClient])

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchContact()
  }, [fetchContact])

  return {
    ...state,
    refetch: fetchContact
  }
}
