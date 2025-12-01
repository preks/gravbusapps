import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { InvestmentNote } from '../types/investmentNoteTypes'
import { buildInvestmentNoteByIdQuery } from '../queries/investmentNoteQueries'
import { toInvestmentNote } from '../mappers/investmentRelatedEntityMappers'

// Response interfaces
export interface InvestmentNoteByIdData {
  note?: InvestmentNote
}

// Hook for getting investment note by ID
export const useGetInvestmentNoteById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentNoteById = useCallback(
    async (id: string) => {
      // Use new query builder with fields mapping
      const query = buildInvestmentNoteByIdQuery(undefined, id)

      try {
        const result = await graphqlClient.request<{ InvestmentNoteByPk: InvestmentNote }>(query)
        const baseNote = result.InvestmentNoteByPk

        return {
          note: baseNote ? toInvestmentNote(baseNote) : undefined
        } as InvestmentNoteByIdData
      } catch (error) {
        console.error('Error fetching investment note by ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentNoteById }
}
