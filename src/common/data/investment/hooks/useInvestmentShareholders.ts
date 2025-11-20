import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GET_INVESTMENT_SHAREHOLDERS_BY_INVESTMENT_ID } from '../queries/investmentQueries'

export interface InvestmentShareholder {
  id: string
  name: string | null
  description: string | null
  stakePercentage: number | null
  activeFrom: string | null
  activeTo: string | null
  investmentId: string
  businessKey: string | null
  createdAt: string
  updatedAt: string
  version: number
  isDeleted: boolean
}

export interface InvestmentShareholdersResponse {
  InvestmentShareholder: InvestmentShareholder[]
}

export interface InvestmentShareholdersData {
  shareholders: InvestmentShareholder[]
}

// Hook for getting investment shareholders by investment ID
export const useGetInvestmentShareholdersByInvestmentId = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchInvestmentShareholders = useCallback(
    async (investmentId: string): Promise<InvestmentShareholdersData> => {
      const query = GET_INVESTMENT_SHAREHOLDERS_BY_INVESTMENT_ID(investmentId)
      try {
        const result = await graphqlClient.request<InvestmentShareholdersResponse>(query)
        return {
          shareholders: result?.InvestmentShareholder || []
        }
      } catch (error) {
        console.error('Error fetching investment shareholders:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchInvestmentShareholders }
}
