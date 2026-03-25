import { useState, useEffect, useCallback, useRef } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { useOrgchartClient } from '@/common/network/orgchart/useOrgchartClient'

export interface SiteLocationOption {
  id: string
  value: string
  label: string
  code: string
  country?: string
  region?: string
}

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

export const useSiteLocations = (context: BusinessAppContextProps) => {
  const [options, setOptions] = useState<SiteLocationOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const structureIdRef = useRef<string>(
    getCurrentActiveStructureId() ?? context.additionalData?.structureId ?? 'active'
  )

  const orgchartClient = useOrgchartClient(context.accessToken)

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
      const getStructureResponse = await orgchartClient.getStructure(
        structureId,
        {
          nodeType: 'cost_center'
        },
        {
          headers: { Authorization: `Bearer ${context.accessToken}` }
        }
      )
      structureIdRef.current = getStructureResponse.structure.structureId
      const resolvedStructureId = getStructureResponse.structure.structureId

      const allLocations: SiteLocationData[] = []
      let offset = 0
      let hasMore = true

      while (hasMore) {
        const response = await orgchartClient.getSiteLocations(
          { structureId: resolvedStructureId, offset },
          {
            headers: { Authorization: `Bearer ${context.accessToken}` }
          }
        )

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
  }, [orgchartClient, context.accessToken, context.additionalData?.structureId])

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
