// Investment Note hook - single note by ID with automatic state management
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { InvestmentNote } from '../types/investmentNoteTypes'
import { toInvestmentNote } from '../mappers/investmentRelatedEntityMappers'
import { buildInvestmentNoteByIdQuery } from '../queries/investmentNoteQueries'

export interface UseInvestmentNoteResult {
  note: InvestmentNote | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Declarative hook for fetching a single investment note by ID.
 * Automatically fetches data when component mounts or ID changes.
 *
 * @param context - Business app context with access token
 * @param id - Note ID to fetch
 *
 * @example
 * // Basic usage
 * const { note, loading, error } = useInvestmentNote(context, noteId)
 *
 * if (loading) return <Spinner />
 * if (error) return <Alert>{error}</Alert>
 *
 * return <div>{note?.title}</div>
 *
 * @example
 * // With refetch
 * const { note, loading, refetch } = useInvestmentNote(context, noteId)
 *
 * return (
 *   <div>
 *     <div>{note?.title}</div>
 *     <Button onClick={refetch}>Refresh</Button>
 *   </div>
 * )
 */
export function useInvestmentNote(context: BusinessAppContextProps, id: string | undefined): UseInvestmentNoteResult {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const [state, setState] = useState<Omit<UseInvestmentNoteResult, 'refetch'>>({
    note: null,
    loading: true,
    error: null
  })

  const fetchNote = useCallback(async () => {
    // Don't fetch if no ID or no access token
    if (!id || !context.accessToken) {
      setState(prev => ({ ...prev, loading: false }))
      return
    }

    setState(prev => ({ ...prev, loading: true, error: null }))

    try {
      // Build query
      const query = buildInvestmentNoteByIdQuery(undefined, id)

      // Execute query - InvestmentNoteByPk is the GraphQL entity name
      const result = await graphqlClient.request<{ InvestmentNoteByPk: InvestmentNote }>(query)

      const raw = result.InvestmentNoteByPk
      const note = raw ? toInvestmentNote(raw) : null

      setState({ note, loading: false, error: null })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch investment note'
      console.error('Error fetching investment note:', error)
      setState({ note: null, loading: false, error: errorMessage })
    }
  }, [id, context.accessToken, graphqlClient])

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchNote()
  }, [fetchNote])

  return {
    ...state,
    refetch: fetchNote
  }
}
