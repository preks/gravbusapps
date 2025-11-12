import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

export interface AssetConditionOption {
  id: string
  value: string
  label: string
  code: string
}

const GET_ASSET_CONDITIONS = (activeUserLocale: string): string => {
  return `
    query GetAssetConditions {
      CatalogEntry(
        where: {
          catalog: { identifier: { _eq: "AssetCondition" }, version: { _eq: "v1" } }
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

export const useAssetConditionCatalog = (context: BusinessAppContextProps) => {
  const [options, setOptions] = useState<AssetConditionOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)
  const activeUserLocale = getCurrentActiveUserLocale()

  const fetchConditions = useCallback(async () => {
    if (!context.accessToken) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const query = GET_ASSET_CONDITIONS(activeUserLocale)
      const response = await graphqlClient.request<{
        CatalogEntry: Array<{
          id: string
          code?: string
          value?: string
          translations?: Array<{ localeCode: string; value: string; objectValue?: any }>
        }>
      }>(query)

      const conditionOptions = (response.CatalogEntry || []).map(entry => {
        const translatedValue = entry.translations?.[0]?.value || entry.value || ''
        return {
          id: entry.id,
          value: translatedValue,
          label: translatedValue,
          code: entry.code || ''
        }
      })

      setOptions(conditionOptions)
    } catch (err) {
      console.error('Error fetching asset conditions:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch asset conditions')
      setOptions([])
    } finally {
      setIsLoading(false)
    }
  }, [graphqlClient, context.accessToken, activeUserLocale])

  useEffect(() => {
    fetchConditions()
  }, [fetchConditions])

  return {
    options,
    isLoading,
    error,
    refetch: fetchConditions
  }
}
