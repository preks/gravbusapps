import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface RoleVsAmountData {
  id: string
  company: string
  role: string
  roleScore: number
  investmentAmount: number
}

/**
 * Build GraphQL query to fetch role vs amount data
 */
const BUILD_ROLE_VS_AMOUNT_QUERY = (currency: string): string => {
  return `
    query GetRoleVsAmountData {
      Investment(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } } }
            { currency: { code: { _eq: "${currency}" } } }
            { totalInvestmentAmount: { _gt: 0 } }
          ]
        }
      ) {
        id
        name
        code
        totalInvestmentAmount
        investmentRole(where: { isDeleted: { _eq: false } }, orderBy: { displayOrder: ASC_NULLS_LAST }) {
          investmentRole {
            id
            code
            value
          }
        }
      }
    }
  `
}

/**
 * Hook to fetch role vs amount data
 */
export const useGetRoleVsAmountData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchRoleVsAmountData = useCallback(
    async (currency: string): Promise<RoleVsAmountData[]> => {
      const result = await graphqlClient.request<{
        Investment: Array<{
          id: string
          name: string | null
          code: string | null
          totalInvestmentAmount: number | null
          investmentRole: Array<{
            investmentRole: {
              id: string
              code: string | null
              value: string | null
            } | null
          }>
        }>
      }>(BUILD_ROLE_VS_AMOUNT_QUERY(currency))

      // Transform data
      const roleVsAmountData: RoleVsAmountData[] = result.Investment.filter(
        inv => inv.totalInvestmentAmount && inv.investmentRole && inv.investmentRole.length > 0
      ).map(inv => {
        const roles = inv.investmentRole || []
        const roleValue = roles.length > 0 && roles[0]?.investmentRole?.value ? roles[0].investmentRole.value : ''
        const roleCode = roles.length > 0 && roles[0]?.investmentRole?.code ? roles[0].investmentRole.code : ''

        // Map role to score for visualization (1=Follow-on, 2=Co-Investor, 3=Lead)
        let roleScore = 2 // Default to Co-Investor
        const roleLower = (roleValue || roleCode || '').toLowerCase()

        if (roleLower.includes('follow') || roleLower.includes('follower')) {
          roleScore = 1
        } else if (roleLower.includes('lead') || roleLower.includes('leader')) {
          roleScore = 3
        }
        // else: roleScore remains 2 (Co-Investor) for all other cases including 'co-invest'/'coinvest'

        return {
          id: inv.id,
          company: inv.name || inv.code || 'Unknown',
          role: roleValue || roleCode || 'Co-Investor',
          roleScore,
          investmentAmount: inv.totalInvestmentAmount!
        }
      })

      return roleVsAmountData
    },
    [graphqlClient]
  )

  return { fetchRoleVsAmountData }
}
