import { useCallback, useRef, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface StakeTypeInfo {
  stakeTypeRef: string
  stakeTypeId: string
  stakeTypeCode: string
  stakeTypeValue: string
}

interface DistinctStakeTypesResponse {
  Investment: Array<{
    investmentStakeTypeRef: string | null
    investmentStakeType: {
      id: string
      code: string
      value: string
    } | null
  }>
}

/**
 * Shared query for getting distinct equity stake types (only stake types actually in use)
 * Used by both count and amount distribution queries to avoid duplication
 */
const GET_DISTINCT_STAKE_TYPES = (): string => {
  return `
    query GetDistinctEquityStakeTypes {
      Investment(
        distinctOn: investmentStakeTypeRef
        where: {
          isDeleted: { _eq: false }
          investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } }
        }
      ) {
        investmentStakeTypeRef
        investmentStakeType {
          id
          code
          value
        }
      }
    }
  `
}

// In-memory cache for distinct stake types (shared across all hook instances)
let stakeTypesCache: StakeTypeInfo[] | null = null
let cacheTimestamp: number = 0
let pendingRequest: Promise<StakeTypeInfo[]> | null = null
const CACHE_DURATION = 5000 // 5 seconds cache

/**
 * Shared hook for fetching distinct stake types with intelligent caching
 * When multiple hooks call this simultaneously (e.g., count and amount hooks),
 * only one network request is made and the result is shared
 */
export const useGetEquityDistinctStakeTypes = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const isMountedRef = useRef(true)

  const fetchDistinctStakeTypes = useCallback(async (): Promise<StakeTypeInfo[]> => {
    // Check if we have a valid cache
    const now = Date.now()
    if (stakeTypesCache && now - cacheTimestamp < CACHE_DURATION) {
      return stakeTypesCache
    }

    // If there's already a pending request, wait for it instead of creating a new one
    if (pendingRequest) {
      return pendingRequest
    }

    // Create new request
    try {
      const distinctQuery = GET_DISTINCT_STAKE_TYPES()

      // Store the promise so other concurrent calls can wait for it
      pendingRequest = graphqlClient
        .request<DistinctStakeTypesResponse>(distinctQuery)
        .then(distinctResult => {
          if (!isMountedRef.current) {
            throw new Error('Component unmounted')
          }

          const stakeTypesInfo: StakeTypeInfo[] = distinctResult.Investment.filter(
            item => item.investmentStakeType && item.investmentStakeTypeRef
          ).map(item => ({
            stakeTypeRef: item.investmentStakeTypeRef!,
            stakeTypeId: item.investmentStakeType!.id,
            stakeTypeCode: item.investmentStakeType!.code,
            stakeTypeValue: item.investmentStakeType!.value
          }))

          // Update cache
          stakeTypesCache = stakeTypesInfo
          cacheTimestamp = Date.now()
          pendingRequest = null

          return stakeTypesInfo
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

  return { fetchDistinctStakeTypes }
}
