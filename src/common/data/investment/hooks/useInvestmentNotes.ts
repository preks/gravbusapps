import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { BaseInvestmentNote, InvestmentNote } from '../types'
import { GET_INVESTMENT_NOTE_BY_ID } from '../queries'
import { toInvestmentNote } from '../mappers'

// Response interfaces
export interface InvestmentNoteByIdData {
  note?: InvestmentNote
}

// Hook for getting investment note by ID
export const useGetInvestmentNoteById = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentNoteById = useCallback(
    async (id: string) => {
      const query = GET_INVESTMENT_NOTE_BY_ID(id)

      try {
        const result = await graphqlClient.request<{ InvestmentNote: BaseInvestmentNote[] }>(query)
        const baseNote = result.InvestmentNote[0]

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
