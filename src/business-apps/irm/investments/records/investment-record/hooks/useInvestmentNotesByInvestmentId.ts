import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GET_INVESTMENT_NOTES_BY_INVESTMENT_ID } from '@/common/data/investment/queries/investmentNoteQueries'
import {
  buildInvestmentNoteWhereCondition,
  buildInvestmentNoteOrderBy
} from '@/common/data/investment/queries/investmentNoteQueries'
import type { BaseInvestmentNote, InvestmentNote } from '@/common/data/investment/types'
import { toInvestmentNote } from '@/common/data/investment/mappers'

interface InvestmentNotesByInvestmentIdResponse {
  InvestmentNote: BaseInvestmentNote[]
}

export const useGetInvestmentNotesByInvestmentId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentNotesByInvestmentId = useCallback(
    async (investmentId: string): Promise<InvestmentNote[]> => {
      const query = GET_INVESTMENT_NOTES_BY_INVESTMENT_ID()
      const whereCondition = buildInvestmentNoteWhereCondition(
        {},
        [],
        [{ investment: { id: { _eq: investmentId } }, isDeleted: { _eq: false } }]
      )
      const orderBy = buildInvestmentNoteOrderBy([])

      const graphQLVariables = {
        where: whereCondition,
        orderBy: orderBy
      }

      try {
        const result = await graphqlClient.request<InvestmentNotesByInvestmentIdResponse>(query, graphQLVariables)
        // Transform base types to enhanced types using mapper
        return result.InvestmentNote.map(toInvestmentNote)
      } catch (error) {
        console.error('Error fetching investment notes by investment ID:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentNotesByInvestmentId }
}
