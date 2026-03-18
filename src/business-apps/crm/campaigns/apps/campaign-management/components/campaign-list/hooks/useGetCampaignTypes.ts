import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { CAMPAIGN_TYPE } from '@/common/data/customer/constants/customerCatalogs'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

export interface CampaignTypeOption {
  id: string
  label: string
  value: string
  code?: string
}

const [campaignTypeCatalogIdentifier, campaignTypeCatalogVersion = 'v1'] = CAMPAIGN_TYPE.split(':')

export const useGetCampaignTypes = (
  context: BusinessAppContextProps,
  search: string = '',
  offset: number = 0,
  limit: number = 100
) => {
  const [campaignTypeOptions, setCampaignTypeOptions] = useState<CampaignTypeOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const catalogClient = useCatalogManagerClient(context.accessToken)

  const fetchCampaignTypes = useCallback(async () => {
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
          catalogIdentifier: campaignTypeCatalogIdentifier,
          version: campaignTypeCatalogVersion
        },
        {
          limit,
          offset,
          returnTotalRecords: true,
          includeChildCatalogEntries: true,
          ...(search && { searchCriteria: search })
        }
      )

      // Handle response data - could be .data or .catalogEntries depending on API version
      interface CatalogEntry {
        id?: string
        value?: string
        code?: string
        parentId?: string
      }

      const catalogData: CatalogEntry[] = response.data || response.catalogEntries || []
      const options: CampaignTypeOption[] = catalogData.map((entry: CatalogEntry) => ({
        id: entry.id || '',
        label: entry.value || entry.code || 'Unknown',
        value: entry.value || '',
        code: entry.code || ''
      }))

      setCampaignTypeOptions(options)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch campaign types'))
      setCampaignTypeOptions([])
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, catalogClient, search, offset, limit])

  useEffect(() => {
    if (context.accessToken) {
      fetchCampaignTypes()
    }
  }, [context.accessToken, fetchCampaignTypes])

  return {
    campaignTypeOptions,
    isLoading,
    error,
    refetch: fetchCampaignTypes
  }
}
