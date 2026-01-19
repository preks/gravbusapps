import { useCallback, useRef, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface StatusInfo {
  statusRef: string
  statusId: string
  statusCode: string
  statusValue: string
}

interface DistinctStatusesResponse {
  Investment: Array<{
    investmentStatusRef: string | null
    investmentStatus: {
      id: string
      code: string
      value: string
    } | null
  }>
}

/**
 * Shared query for getting distinct equity statuses (only statuses actually in use)
 * Used by both count and amount distribution queries to avoid duplication
 */
const GET_DISTINCT_STATUSES = (): string => {
  return `
    query GetDistinctEquityStatuses {
      Investment(
        distinctOn: investmentStatusRef
        where: {
          isDeleted: { _eq: false }
          investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } }
        }
      ) {
        investmentStatusRef
        investmentStatus {
          id
          code
          value
        }
      }
    }
  `
}

// In-memory cache for distinct statuses (shared across all hook instances)
let statusesCache: StatusInfo[] | null = null
let cacheTimestamp: number = 0
let pendingRequest: Promise<StatusInfo[]> | null = null
const CACHE_DURATION = 5000 // 5 seconds cache

/**
 * Shared hook for fetching distinct statuses with intelligent caching
 * When multiple hooks call this simultaneously (e.g., count and amount hooks),
 * only one network request is made and the result is shared
 */
export const useGetEquityDistinctStatuses = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const isMountedRef = useRef(true)

  const fetchDistinctStatuses = useCallback(async (): Promise<StatusInfo[]> => {
    // Check if we have a valid cache
    const now = Date.now()
    if (statusesCache && now - cacheTimestamp < CACHE_DURATION) {
      return statusesCache
    }

    // If there's already a pending request, wait for it instead of creating a new one
    if (pendingRequest) {
      return pendingRequest
    }

    // Create new request
    try {
      const distinctQuery = GET_DISTINCT_STATUSES()

      // Store the promise so other concurrent calls can wait for it
      pendingRequest = graphqlClient
        .request<DistinctStatusesResponse>(distinctQuery)
        .then(distinctResult => {
          if (!isMountedRef.current) {
            throw new Error('Component unmounted')
          }

          const statusesInfo: StatusInfo[] = distinctResult.Investment.filter(
            item => item.investmentStatus && item.investmentStatusRef
          ).map(item => ({
            statusRef: item.investmentStatusRef!,
            statusId: item.investmentStatus!.id,
            statusCode: item.investmentStatus!.code,
            statusValue: item.investmentStatus!.value
          }))

          // Update cache
          statusesCache = statusesInfo
          cacheTimestamp = Date.now()
          pendingRequest = null

          return statusesInfo
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

  return { fetchDistinctStatuses }
}
