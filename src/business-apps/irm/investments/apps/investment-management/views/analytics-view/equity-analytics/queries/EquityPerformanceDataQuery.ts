import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

/**
 * Performance analysis data structures
 */
export interface StakeVsAmountData {
  id: string
  company: string
  stake: number
  investmentAmount: number
}

export interface RoleVsAmountData {
  id: string
  company: string
  role: string
  roleScore: number
  investmentAmount: number
}

export interface ConcentrationData {
  role: string
  count: number
  totalValuation: number
  averageValuation: number
}

export interface PerformanceDataResult {
  stakeVsAmountData: StakeVsAmountData[]
  roleVsAmountData: RoleVsAmountData[]
  concentrationData: ConcentrationData[]
}

/**
 * Build GraphQL query to fetch stake vs amount correlation data
 */
const BUILD_STAKE_VS_AMOUNT_QUERY = (currency: string): string => {
  return `
    query GetStakeVsAmountData {
      Investment(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } } }
            { currency: { code: { _eq: "${currency}" } } }
            { stakePercentage: { _isNull: false } }
            { totalInvestmentAmount: { _gt: 0 } }
          ]
        }
      ) {
        id
        name
        code
        stakePercentage
        totalInvestmentAmount
      }
    }
  `
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
 * Hook to fetch all performance analysis data with optimized GraphQL queries
 */
export const useGetEquityPerformanceData = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchPerformanceData = useCallback(
    async (currency: string): Promise<PerformanceDataResult> => {
      // Fetch all three queries in parallel
      const [stakeVsAmountResult, roleVsAmountResult, concentrationResult] = await Promise.all([
        graphqlClient.request<{
          Investment: Array<{
            id: string
            name: string | null
            code: string | null
            stakePercentage: number | null
            totalInvestmentAmount: number | null
          }>
        }>(BUILD_STAKE_VS_AMOUNT_QUERY(currency)),

        graphqlClient.request<{
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
        }>(BUILD_ROLE_VS_AMOUNT_QUERY(currency)),

        graphqlClient.request<{
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
      ])

      const stakeVsAmountData: StakeVsAmountData[] = stakeVsAmountResult.Investment.filter(
        inv => inv.stakePercentage && inv.totalInvestmentAmount
      ).map(inv => ({
        id: inv.id,
        company: inv.name || inv.code || 'Unknown',
        stake: inv.stakePercentage!,
        investmentAmount: inv.totalInvestmentAmount!
      }))

      // Transform role vs amount data
      const roleVsAmountData: RoleVsAmountData[] = roleVsAmountResult.Investment.filter(
        inv => inv.totalInvestmentAmount
      ).map(inv => {
        const roles = inv.investmentRole || []
        const role = roles.length > 0 && roles[0]?.investmentRole?.value ? roles[0].investmentRole.value : 'Unknown'

        // Map role to score for visualization (simple default)
        const roleScore = 3 // Default to Lead Investor score

        return {
          id: inv.id,
          company: inv.name || inv.code || 'Unknown',
          role,
          roleScore,
          investmentAmount: inv.totalInvestmentAmount!
        }
      })

      // Transform concentration data (group by role)
      const roleGroups: Record<string, { count: number; totalValuation: number; valuations: number[] }> = {}

      for (const inv of concentrationResult.Investment) {
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

      return {
        stakeVsAmountData,
        roleVsAmountData,
        concentrationData
      }
    },
    [graphqlClient]
  )

  return { fetchPerformanceData }
}
