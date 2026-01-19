import { useCallback, useRef, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface InvestmentTypeInfo {
  investmentTypeRef: string
  investmentTypeId: string
  investmentTypeCode: string
  investmentTypeValue: string
}

interface DistinctInvestmentTypesResponse {
  Investment: Array<{
    investmentTypeRef: string | null
    investmentType: {
      id: string
      code: string
      value: string
    } | null
  }>
}

/**
 * Shared query for getting distinct equity investment types (only investment types actually in use)
 * Used by both count and amount distribution queries to avoid duplication
 */
const GET_DISTINCT_INVESTMENT_TYPES = (): string => {
  return `
    query GetDistinctEquityInvestmentTypes {
      Investment(
        distinctOn: investmentTypeRef
        where: {
          isDeleted: { _eq: false }
          investmentGroup: { id: { _eq: "InvestmentGroup:v1:EQUITY" } }
        }
      ) {
        investmentTypeRef
        investmentType {
          id
          code
          value
        }
      }
    }
  `
}

// In-memory cache for distinct investment types (shared across all hook instances)
let investmentTypesCache: InvestmentTypeInfo[] | null = null
let cacheTimestamp: number = 0
let pendingRequest: Promise<InvestmentTypeInfo[]> | null = null
const CACHE_DURATION = 5000 // 5 seconds cache

/**
 * Shared hook for fetching distinct investment types with intelligent caching
 * When multiple hooks call this simultaneously (e.g., count and amount hooks),
 * only one network request is made and the result is shared
 */
export const useGetEquityDistinctInvestmentTypes = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const isMountedRef = useRef(true)

  const fetchDistinctInvestmentTypes = useCallback(async (): Promise<InvestmentTypeInfo[]> => {
    // Check if we have a valid cache
    const now = Date.now()
    if (investmentTypesCache && now - cacheTimestamp < CACHE_DURATION) {
      return investmentTypesCache
    }

    // If there's already a pending request, wait for it instead of creating a new one
    if (pendingRequest) {
      return pendingRequest
    }

    // Create new request
    try {
      const distinctQuery = GET_DISTINCT_INVESTMENT_TYPES()

      // Store the promise so other concurrent calls can wait for it
      pendingRequest = graphqlClient
        .request<DistinctInvestmentTypesResponse>(distinctQuery)
        .then(distinctResult => {
          if (!isMountedRef.current) {
            throw new Error('Component unmounted')
          }

          const investmentTypesInfo: InvestmentTypeInfo[] = distinctResult.Investment.filter(
            item => item.investmentType && item.investmentTypeRef
          ).map(item => ({
            investmentTypeRef: item.investmentTypeRef!,
            investmentTypeId: item.investmentType!.id,
            investmentTypeCode: item.investmentType!.code,
            investmentTypeValue: item.investmentType!.value
          }))

          // Update cache
          investmentTypesCache = investmentTypesInfo
          cacheTimestamp = Date.now()
          pendingRequest = null

          return investmentTypesInfo
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

  return { fetchDistinctInvestmentTypes }
}
