import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export type InvestmentGroupPermissionRecord = {
  investmentGroupRef: string
}

const GET_INVESTMENT_GROUP_PERMISSIONS = `
  query GetInvestmentGroupPermissions {
    InvestmentGroupPermission {
      investmentGroupRef
    }
  }
`

/**
 * Lightweight data hook that exposes a function-style API to fetch permissions map.
 * Mirrors the pattern of useCatalogEntries: no internal state, just a fetcher.
 */
export const useInvestmentGroupPermissions = (accessToken?: string) => {
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchInvestmentGroupPermissionsMap = useCallback(async () => {
    const res = await graphqlClient.request<{ InvestmentGroupPermission: any[] }>(GET_INVESTMENT_GROUP_PERMISSIONS)
    const rows = res?.InvestmentGroupPermission || []
    const map: Record<string, boolean> = {}
    for (const row of rows) {
      const rec: InvestmentGroupPermissionRecord = {
        investmentGroupRef: row.investmentGroupRef,
      }
      if (rec.investmentGroupRef) {
        map[rec.investmentGroupRef] = true
      }
    }
    return map
  }, [graphqlClient])

  return { fetchInvestmentGroupPermissionsMap }
}
