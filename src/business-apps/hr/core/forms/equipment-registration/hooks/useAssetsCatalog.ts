import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

export interface AssetOption {
  id: string
  value: string
  label: string
  code: string
}

const GET_ASSET_CATEGORIES = (activeUserLocale: string): string => {
  return `
    query GetAssetCategories {
      CatalogEntry(
        where: {
          catalog: { identifier: { _eq: "AssetCategory" }, version: { _eq: "v1" } }
          isDeleted: { _eq: false }
        }
        limit: 100
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

export const useAssetsCatalog = (context: BusinessAppContextProps) => {
  const [options, setOptions] = useState<AssetOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)
  const activeUserLocale = getCurrentActiveUserLocale()

  const fetchAssets = useCallback(async () => {
    if (!context.accessToken) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const query = GET_ASSET_CATEGORIES(activeUserLocale)
      const response = await graphqlClient.request<{
        CatalogEntry: Array<{
          id: string
          code?: string
          value?: string
          translations?: Array<{ localeCode: string; value: string; objectValue?: any }>
        }>
      }>(query)

      const assetOptions = (response.CatalogEntry || []).map(entry => {
        const translatedValue = entry.translations?.[0]?.value || entry.value || ''
        return {
          id: entry.id,
          value: entry.id,
          label: translatedValue,
          code: entry.code || ''
        }
      })

      setOptions(assetOptions)
    } catch (err) {
      console.error('Error fetching asset categories:', err)
      const raw = err instanceof Error ? err.message : 'Failed to fetch asset categories'
      const message =
        raw === 'Failed to fetch' ? 'Network error. Check your connection and that the service is available.' : raw
      setError(message)
      setOptions([])
    } finally {
      setIsLoading(false)
    }
  }, [graphqlClient, context.accessToken, activeUserLocale])

  useEffect(() => {
    fetchAssets()
  }, [fetchAssets])

  return {
    options,
    isLoading,
    error,
    refetch: fetchAssets
  }
}
