import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface ConcentrationData {
  role: string
  count: number
  totalValuation: number
  averageValuation: number
}

/**
 * Build GraphQL query to fetch concentration by role data
 */
const BUILD_CONCENTRATION_QUERY = (currency: string): string => {
  return `
    query GetConcentrationData {
      Investment(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } } }
            { currency: { code: { _eq: "${currency}" } } }
          ]
        }
      ) {
        id
        investmentMarketValue
        investmentRole(where: { isDeleted: { _eq: false } }, orderBy: { displayOrder: ASC_NULLS_LAST }) {
          investmentRole {
            value
          }
        }
      }
    }
  `
}

/**
 * Hook to fetch concentration by role data
 */
export const useGetConcentrationData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchConcentrationData = useCallback(
    async (currency: string): Promise<ConcentrationData[]> => {
      const result = await graphqlClient.request<{
        Investment: Array<{
          id: string
          investmentMarketValue: number | null
          investmentRole: Array<{
            investmentRole: {
              value: string | null
            } | null
          }>
        }>
      }>(BUILD_CONCENTRATION_QUERY(currency))

      // Transform concentration data (group by role)
      const roleGroups: Record<string, { count: number; totalValuation: number; valuations: number[] }> = {}

      for (const inv of result.Investment) {
        const roles = inv.investmentRole || []
        const role = roles.length > 0 && roles[0]?.investmentRole?.value ? roles[0].investmentRole.value : 'Unknown'

        if (!roleGroups[role]) {
          roleGroups[role] = {
            count: 0,
            totalValuation: 0,
            valuations: []
          }
        }

        roleGroups[role].count += 1
        roleGroups[role].totalValuation += inv.investmentMarketValue || 0
        roleGroups[role].valuations.push(inv.investmentMarketValue || 0)
      }

      const concentrationData: ConcentrationData[] = Object.entries(roleGroups).map(([role, data]) => ({
        role,
        count: data.count,
        totalValuation: data.totalValuation,
        averageValuation: data.totalValuation / data.count
      }))

      return concentrationData
    },
    [graphqlClient]
  )

  return { fetchConcentrationData }
}
