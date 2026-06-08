import { useState, useEffect, useCallback } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { CAMPAIGN_TYPE } from '@/common/data/customer/constants/customerCatalogs'

export interface CampaignCatalogOption {
  id: string
  label: string
  value: string
  code?: string
}

export type CampaignTypeOption = CampaignCatalogOption

const splitCatalogIdentifier = (catalogIdentifierWithVersion: string) => {
  const [catalogIdentifier, version = 'v1'] = catalogIdentifierWithVersion.split(':')
  return { catalogIdentifier, version }
}

export const useCampaignCatalogOptions = (
  context: BusinessAppContextProps,
  catalogIdentifierWithVersion: string,
  search: string = '',
  offset: number = 0,
  limit: number = 100
) => {
  const [options, setOptions] = useState<CampaignCatalogOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const catalogClient = useCatalogManagerClient(context.accessToken)
  const { catalogIdentifier, version } = splitCatalogIdentifier(catalogIdentifierWithVersion)

  const fetchOptions = useCallback(async () => {
    if (!context.accessToken) {
      setError(new Error('No access token available'))
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier,
          version
        },
        {
          limit,
          offset,
          returnTotalRecords: true,
          includeChildCatalogEntries: true,
          ...(search && { searchCriteria: search })
        }
      )

      interface CatalogEntry {
        id?: string
        value?: string
        code?: string
      }

      const catalogData: CatalogEntry[] = response.data || response.catalogEntries || []
      const nextOptions: CampaignCatalogOption[] = catalogData.map((entry: CatalogEntry) => ({
        id: entry.id || '',
        label: entry.value || entry.code || 'Unknown',
        value: entry.value || '',
        code: entry.code || ''
      }))

      setOptions(nextOptions)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch catalog options'))
      setOptions([])
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, catalogClient, catalogIdentifier, version, search, offset, limit])

  useEffect(() => {
    if (context.accessToken) {
      fetchOptions()
    }
  }, [context.accessToken, fetchOptions])

  return {
    options,
    isLoading,
    error,
    refetch: fetchOptions
  }
}

export const useCampaignTypes = (
  context: BusinessAppContextProps,
  search: string = '',
  offset: number = 0,
  limit: number = 100
) => {
  const result = useCampaignCatalogOptions(context, CAMPAIGN_TYPE, search, offset, limit)
  return {
    campaignTypeOptions: result.options,
    isLoading: result.isLoading,
    error: result.error,
    refetch: result.refetch
  }
}
