/**
 * Hook for fetching filter data (organizational units and currencies)
 */

import { useState, useEffect, useCallback } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

import { GET_EXPENSE_CURRENCIES, GET_ORGANIZATIONAL_UNITS } from '../queries/filterData.queries'
import { extractCurrencyCode } from '../utils/sharedUtils'

// ⚡ SECURITY: Hash function for sensitive data in cache keys
const createHash = (input: string): string => {
  let hash = 0
  for (let i = 0; i < input.length; i++) {
    const char = input.codePointAt(i) ?? 0
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

export interface OrganizationalUnit {
  id: string
  name: string
  code?: string
  description?: string
  structureId?: string
  displayName?: string
  structureName?: string
  company?: {
    id: string
    name: string
    code?: string
  }
}

export interface Currency {
  code: string
  value: string
  currencyRef: string
}

interface UseFilterDataResult {
  organizationalUnits: OrganizationalUnit[]
  currencies: Currency[]
  mostUsedCurrency: string | null
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

// ⚡ PERFORMANCE OPTIMIZATION: Add simple cache to prevent refetching
const FILTER_DATA_CACHE = new Map<string, { data: any; timestamp: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export const useFilterData = ({ accessToken }: { accessToken: string | null | undefined }): UseFilterDataResult => {
  const [organizationalUnits, setOrganizationalUnits] = useState<OrganizationalUnit[]>([])
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [mostUsedCurrency, setMostUsedCurrency] = useState<string | null>(null)
  // Initialize loading as false when accessToken is undefined (parent provides data)
  const [loading, setLoading] = useState(!!accessToken)
  const [error, setError] = useState<Error | null>(null)

  // Type assertion - safe because parent component validates token before rendering
  const client = useGraphqlClient(accessToken as string)

  // Helper: Process organizational units (reduces cognitive complexity)
  const processOrganizationalUnits = useCallback((orgUnitsResponse: any, structureId: string | null) => {
    const allOrgUnits = new Map<string, any>()

    for (const orgUnit of orgUnitsResponse.OrganizationalUnit || []) {
      if (orgUnit && orgUnit.id) {
        allOrgUnits.set(orgUnit.id, {
          id: orgUnit.id,
          name: orgUnit.name || '',
          code: orgUnit.code || '',
          description: orgUnit.description || '',
          structureId: orgUnit.structureId || structureId,
          displayName: orgUnit.name || '',
          structureName: orgUnit.structureId || '',
          company: orgUnit.company || null
        })
      }
    }

    return Array.from(allOrgUnits.values()).sort((a, b) => a.name.localeCompare(b.name))
  }, [])

  // Helper: Process currencies (reduces cognitive complexity)
  const processCurrencies = useCallback((currenciesResponse: any) => {
    const allCurrencies = new Map<string, Currency>()
    const currencyCounts = new Map<string, number>()

    if (currenciesResponse?.ExpenseRequest) {
      currenciesResponse.ExpenseRequest.forEach((item: any) => {
        if (item.currency && item.currencyRef) {
          const currencyCode = item.currency.code || extractCurrencyCode(item.currencyRef)
          allCurrencies.set(item.currencyRef, {
            code: currencyCode,
            value: item.currency.value || currencyCode,
            currencyRef: item.currencyRef
          })

          const count = currencyCounts.get(item.currencyRef) || 0
          currencyCounts.set(item.currencyRef, count + 1)
        }
      })
    }

    const uniqueCurrencies = Array.from(allCurrencies.values()).sort((a, b) => a.code.localeCompare(b.code))
    const finalCurrencies =
      uniqueCurrencies.length > 0
        ? uniqueCurrencies
        : [
            { code: 'EUR', value: 'Euro', currencyRef: 'Currency:v1:EUR' },
            { code: 'USD', value: 'US Dollar', currencyRef: 'Currency:v1:USD' },
            { code: 'GBP', value: 'British Pound', currencyRef: 'Currency:v1:GBP' }
          ]

    // Find most used currency
    let maxCount = 0
    let mostUsed = null
    currencyCounts.forEach((count, currencyRef) => {
      if (count > maxCount) {
        maxCount = count
        mostUsed = currencyRef
      }
    })

    mostUsed ??= 'Currency:v1:EUR'

    return { currencies: finalCurrencies, mostUsedCurrency: mostUsed }
  }, [])

  const hasValidAccessToken = useCallback(
    (token: string | null | undefined): token is string =>
      Boolean(token && typeof token === 'string' && token.trim() !== ''),
    []
  )

  const fetchOrganizationalUnits = useCallback(
    async (structureId: string | null) => {
      if (!structureId) return { OrganizationalUnit: [] }
      try {
        return await client.request(GET_ORGANIZATIONAL_UNITS, { structureId })
      } catch {
        return { OrganizationalUnit: [] }
      }
    },
    [client]
  )

  const fetchFilterData = useCallback(async () => {
    // ⚡ CRITICAL: Early return when accessToken is invalid (prevents 401 errors)
    // Dashboard mounts before auth completes - must validate token before ANY requests
    if (!hasValidAccessToken(accessToken)) {
      setLoading(false)
      return
    }

    if (!client) {
      setLoading(false)
      return
    }

    // ⚡ SECURITY & PERFORMANCE: Get structureId early for cache key
    const structureId = getCurrentActiveStructureId()

    // ⚡ SECURITY: Use hashed access token AND structureId for cache key
    const cacheKey = `filter_data_${createHash(accessToken)}_${structureId || 'no_structure'}`
    const cached = FILTER_DATA_CACHE.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      setOrganizationalUnits(cached.data.orgUnits)
      setCurrencies(cached.data.currencies)
      setMostUsedCurrency(cached.data.mostUsedCurrency)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const orgUnitsResponse = await fetchOrganizationalUnits(structureId)
      const currenciesResponse = await client.request(GET_EXPENSE_CURRENCIES, {})

      // Process organizational units using helper function (empty fallback)
      const orgUnits = processOrganizationalUnits(orgUnitsResponse, structureId)
      setOrganizationalUnits(orgUnits)

      // Process currencies using helper function
      const { currencies: finalCurrencies, mostUsedCurrency: mostUsed } = processCurrencies(currenciesResponse)
      setCurrencies(finalCurrencies)
      setMostUsedCurrency(mostUsed)

      // ⚡ Store in cache
      FILTER_DATA_CACHE.set(cacheKey, {
        data: {
          orgUnits,
          currencies: finalCurrencies,
          mostUsedCurrency: mostUsed
        },
        timestamp: Date.now()
      })
    } catch (err) {
      // Error handling without logging sensitive details (per hook guidelines)

      // Reset state to empty arrays on failure (standard fallback behavior)
      setOrganizationalUnits([])
      setCurrencies([])
      setMostUsedCurrency(null)

      setError(err instanceof Error ? err : new Error('Failed to fetch filter data'))
    } finally {
      setLoading(false)
    }
  }, [
    accessToken,
    client,
    fetchOrganizationalUnits,
    hasValidAccessToken,
    processOrganizationalUnits,
    processCurrencies
  ])

  useEffect(() => {
    // ⚡ CRITICAL: Only fetch if accessToken is valid (prevents 401 errors)
    // Don't fetch when parent provides data or when auth is not ready
    if (accessToken && accessToken.trim() !== '') {
      fetchFilterData()
    }
  }, [fetchFilterData, accessToken])

  return {
    organizationalUnits,
    currencies,
    mostUsedCurrency,
    loading,
    error,
    refetch: fetchFilterData
  }
}

export default useFilterData
