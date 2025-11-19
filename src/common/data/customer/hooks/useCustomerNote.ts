// Customer Note hook - single note by ID with automatic state management
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { CustomerNote } from '../types/customerNoteTypes'
import { toCustomerNote } from '../mappers/customerRelatedEntityMappers'
import { buildCustomerNoteByIdQuery } from '../queries/customerNoteQueries'
import { CustomerNoteFields } from '../types/customerNoteTypes'

export interface UseCustomerNoteResult {
  note: CustomerNote | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Declarative hook for fetching a single customer note by ID.
 * Automatically fetches data when component mounts or ID changes.
 *
 * @param accessToken - Access token for authentication
 * @param id - Note ID to fetch
 *
 * @example
 * // Basic usage
 * const { note, loading, error } = useCustomerNote(accessToken, noteId)
 *
 * if (loading) return <Spinner />
 * if (error) return <Alert>{error}</Alert>
 *
 * return <div>{note?.title}</div>
 *
 * @example
 * // With refetch
 * const { note, loading, refetch } = useCustomerNote(accessToken, noteId)
 *
 * return (
 *   <div>
 *     <div>{note?.title}</div>
 *     <Button onClick={refetch}>Refresh</Button>
 *   </div>
 * )
 */
export function useCustomerNote(accessToken: string, id: string | undefined): UseCustomerNoteResult {
  const graphqlClient = useGraphQLClient(accessToken)

  const [state, setState] = useState<Omit<UseCustomerNoteResult, 'refetch'>>({
    note: null,
    loading: true,
    error: null
  })

  const fetchNote = useCallback(async () => {
    // Don't fetch if no ID or no access token
    if (!id || !accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Build query
      const query = buildCustomerNoteByIdQuery(CustomerNoteFields, id)

      // Execute query - CrmNoteByPk is the GraphQL entity name for CRM
      const result = await graphqlClient.request<{ CrmNoteByPk: any }>(query)

      const raw = result.CrmNoteByPk
      const note = raw ? toCustomerNote(raw) : null

      setState({ note, loading: false, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch customer note'
      console.error('Error fetching customer note:', error)
      setState({ note: null, loading: false, error: errorMessage })
    }
  }, [id, accessToken, graphqlClient])

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchNote()
  }, [fetchNote])

  return {
    ...state,
    refetch: fetchNote
  }
}
