import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface RoleDistributionData {
  roleId: string
  roleCode: string
  roleValue: string
  count: number
}

/**
 * GraphQL query to get investment role distribution counts with currency filtering
 *
 * @param currency - Currency code (e.g., 'EUR', 'USD') or 'All' for no filter
 * @returns GraphQL query string
 */
export const GET_EQUITY_ROLE_DISTRIBUTION = (currency?: string): string => {
  // Build where condition for investment filter
  const currencyCondition = currency && currency !== 'All' ? `currency: { code: { _eq: "${currency}" } }` : ''

  const investmentConditions = [
    'isDeleted: { _eq: false }',
    'investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } }',
    currencyCondition
  ]
    .filter(Boolean)
    .join('\n            ')

  return `
    query GetEquityRoleDistribution {
      # Get all investment roles with their investments and currency filter
      InvestmentRole(
        where: {
          isDeleted: { _eq: false }
          investment: {
            ${investmentConditions}
          }
        }
      ) {
        investmentRoleRef
        investmentRole {
          id
          code
          value
        }
      }
    }
  `
}

export interface EquityRoleDistributionResponse {
  InvestmentRole: Array<{
    investmentRoleRef: string
    investmentRole: {
      id: string
      code: string
      value: string
    } | null
  }>
}

/**
 * Hook to fetch equity role distribution data
 */
export const useGetEquityRoleDistribution = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchRoleDistribution = async (currency?: string): Promise<RoleDistributionData[]> => {
    try {
      const query = GET_EQUITY_ROLE_DISTRIBUTION(currency)
      const result = await graphqlClient.request<EquityRoleDistributionResponse>(query)

      // Count roles manually (since GraphQL doesn't support groupBy with count)
      const roleCounts = new Map<string, RoleDistributionData>()

      for (const item of result.InvestmentRole) {
        if (item.investmentRole && item.investmentRoleRef) {
          const existing = roleCounts.get(item.investmentRoleRef)
          if (existing) {
            existing.count += 1
          } else {
            roleCounts.set(item.investmentRoleRef, {
              roleId: item.investmentRole.id,
              roleCode: item.investmentRole.code,
              roleValue: item.investmentRole.value,
              count: 1
            })
          }
        }
      }

      // Convert to array and sort by count descending
      return Array.from(roleCounts.values()).sort((a, b) => b.count - a.count)
    } catch (error) {
      console.error('Error fetching equity role distribution:', error)
      throw error
    }
  }

  return { fetchRoleDistribution }
}
