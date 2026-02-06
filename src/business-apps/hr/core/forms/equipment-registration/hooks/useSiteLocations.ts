import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

export interface SiteLocationOption {
  id: string
  value: string
  label: string
  code: string
  country?: string
  region?: string
}

const ORGCHART_BASE_URL = `${env('NEXT_PUBLIC_ORGCHART_API_URL')}/orgchart/api/v1`

/** Same REST API and response shape as MDM organizational-data useSiteLocations. */
interface SiteLocationData {
  id: string
  structureId: string
  name: string
  code?: string
  locality?: string
  country_ref?: string
  region_ref?: string
}

interface PaginatedSiteLocations {
  data: SiteLocationData[]
  paging?: {
    offset: number
    totalRecords: number
    hasMore?: boolean
  }
}

export const useSiteLocations = (context: BusinessAppContextProps) => {
  const [options, setOptions] = useState<SiteLocationOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const structureIdRef = useRef<string>(
    getCurrentActiveStructureId() ?? context.additionalData?.structureId ?? 'active'
  )

  const restClient = useRestClient(ORGCHART_BASE_URL)

  const fetchSiteLocations = useCallback(async () => {
    if (!context.accessToken) {
      setIsLoading(false)
      return
    }

    const structureId =
      getCurrentActiveStructureId() ?? context.additionalData?.structureId ?? structureIdRef.current ?? 'active'
    structureIdRef.current = structureId

    setIsLoading(true)
    setError(null)

    try {
      // Same as MDM: resolve structure then fetch site-locations
      const getStructureResponse = await restClient.get<{ structure: { structureId: string } }>(
        `/structures/${structureId}`,
        {
          params: { nodeType: 'cost_center' },
          headers: { Authorization: `Bearer ${context.accessToken}` }
        }
      )
      structureIdRef.current = getStructureResponse.structure.structureId
      const resolvedStructureId = getStructureResponse.structure.structureId

      const allLocations: SiteLocationData[] = []
      let offset = 0
      let hasMore = true

      while (hasMore) {
        const response = await restClient.get<PaginatedSiteLocations>('/site-locations', {
          params: { structureId: resolvedStructureId, offset },
          headers: { Authorization: `Bearer ${context.accessToken}` }
        })

        if (response.data && response.paging) {
          allLocations.push(...response.data)
          const total = response.paging.totalRecords ?? 0
          offset += response.data.length
          hasMore = response.paging.hasMore === true || (total > 0 && offset < total && response.data.length > 0)
        } else {
          const legacy = response as unknown as SiteLocationData[]
          allLocations.push(...(Array.isArray(legacy) ? legacy : []))
          hasMore = false
        }
      }

      const locationOptions: SiteLocationOption[] = allLocations
        .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
        .map(location => ({
          id: location.id,
          value: location.id,
          label: location.name,
          code: location.code ?? '',
          country: undefined,
          region: undefined
        }))

      setOptions(locationOptions)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch site locations')
      setOptions([])
    } finally {
      setIsLoading(false)
    }
  }, [restClient, context.accessToken, context.additionalData?.structureId])

  useEffect(() => {
    fetchSiteLocations()
  }, [fetchSiteLocations])

  return {
    options,
    isLoading,
    error,
    refetch: fetchSiteLocations
  }
}
