import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

export interface BrandOption {
  id: string
  value: string
  label: string
  code: string
}

const GET_ASSET_BRANDS = (activeUserLocale: string): string => {
  return `
    query GetAssetBrands {
      CatalogEntry(
        where: {
          catalog: { identifier: { _eq: "AssetBrand" }, version: { _eq: "v1" } }
          isDeleted: { _eq: false }
        }
        limit: 200
      ) {
        id
        code
        value
        translations(where: { localeCode: { _eq: "${activeUserLocale}" } }) {
          localeCode
          value
          objectValue
        }
      }
    }
  `
}

export const useBrandsCatalog = (context: BusinessAppContextProps) => {
  const [options, setOptions] = useState<BrandOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)
  const activeUserLocale = getCurrentActiveUserLocale()

  const fetchBrands = useCallback(async () => {
    if (!context.accessToken) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const query = GET_ASSET_BRANDS(activeUserLocale)
      const response = await graphqlClient.request<{
        CatalogEntry: Array<{
          id: string
          code?: string
          value?: string
          translations?: Array<{ localeCode: string; value: string; objectValue?: any }>
        }>
      }>(query)

      const brandOptions = (response.CatalogEntry || []).map(entry => {
        const translatedValue = entry.translations?.[0]?.value || entry.value || ''
        return {
          id: entry.id,
          value: entry.id,
          label: translatedValue,
          code: entry.code || ''
        }
      })

      setOptions(brandOptions)
    } catch (err) {
      console.error('Error fetching brands:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch brands')
      setOptions([])
    } finally {
      setIsLoading(false)
    }
  }, [graphqlClient, context.accessToken, activeUserLocale])

  useEffect(() => {
    fetchBrands()
  }, [fetchBrands])

  return {
    options,
    isLoading,
    error,
    refetch: fetchBrands
  }
}
