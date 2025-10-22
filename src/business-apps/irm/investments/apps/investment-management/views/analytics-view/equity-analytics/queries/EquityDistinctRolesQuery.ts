import { useCallback, useRef, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface RoleInfo {
  roleRef: string
  roleId: string
  roleCode: string
  roleValue: string
}

interface DistinctRolesResponse {
  InvestmentRole: Array<{
    investmentRoleRef: string | null
    investmentRole: {
      id: string
      code: string
      value: string
    } | null
  }>
}

/**
 * Shared query for getting distinct equity roles (only roles actually in use)
 * Used by both count and amount distribution queries to avoid duplication
 */
const GET_DISTINCT_ROLES = (): string => {
  return `
    query GetDistinctEquityRoles {
      InvestmentRole(
        distinctOn: investmentRoleRef
        where: {
          isDeleted: { _eq: false }
          investment: {
            isDeleted: { _eq: false }
            investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } }
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

// In-memory cache for distinct roles (shared across all hook instances)
let rolesCache: RoleInfo[] | null = null
let cacheTimestamp: number = 0
let pendingRequest: Promise<RoleInfo[]> | null = null
const CACHE_DURATION = 5000 // 5 seconds cache

/**
 * Shared hook for fetching distinct roles with intelligent caching
 * When multiple hooks call this simultaneously (e.g., count and amount hooks),
 * only one network request is made and the result is shared
 */
export const useGetEquityDistinctRoles = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const isMountedRef = useRef(true)

  const fetchDistinctRoles = useCallback(async (): Promise<RoleInfo[]> => {
    // Check if we have a valid cache
    const now = Date.now()
    if (rolesCache && now - cacheTimestamp < CACHE_DURATION) {
      return rolesCache
    }

    // If there's already a pending request, wait for it instead of creating a new one
    if (pendingRequest) {
      return pendingRequest
    }

    // Create new request
    try {
      const distinctQuery = GET_DISTINCT_ROLES()

      // Store the promise so other concurrent calls can wait for it
      pendingRequest = graphqlClient
        .request<DistinctRolesResponse>(distinctQuery)
        .then(distinctResult => {
          if (!isMountedRef.current) {
            throw new Error('Component unmounted')
          }

          const rolesInfo: RoleInfo[] = distinctResult.InvestmentRole.filter(
            item => item.investmentRole && item.investmentRoleRef
          ).map(item => ({
            roleRef: item.investmentRoleRef!,
            roleId: item.investmentRole!.id,
            roleCode: item.investmentRole!.code,
            roleValue: item.investmentRole!.value
          }))

          // Update cache
          rolesCache = rolesInfo
          cacheTimestamp = Date.now()
          pendingRequest = null

          return rolesInfo
        })
        .catch(error => {
          pendingRequest = null
          throw error
        })

      return await pendingRequest
    } catch (error) {
      pendingRequest = null
      throw error
    }
  }, [graphqlClient])

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  return { fetchDistinctRoles }
}
