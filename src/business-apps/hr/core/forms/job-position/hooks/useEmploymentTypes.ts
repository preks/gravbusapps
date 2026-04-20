import { useState, useEffect, useCallback } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { isEmploymentTypeMarkedDeleted } from '@/business-apps/mdm/apps/employment-data/utils/catalogEntryMetadata'
import { SelectOption } from '../types'

export interface EmploymentTypeData {
  id: string
  name: string
  value: string
}

export const EMPLOYMENT_TYPE_CATALOG = 'EmploymentType'
export const EMPLOYMENT_TYPE_VERSION = 'v1'

export const useEmploymentTypes = (accessToken: string) => {
  const [employmentTypes, setEmploymentTypes] = useState<SelectOption[]>([])
  const [allEmploymentTypes, setAllEmploymentTypes] = useState<EmploymentTypeData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const catalogClient = useCatalogManagerClient(accessToken)

  const transformEmploymentType = (catalogEntry: any): EmploymentTypeData => {
    return {
      id: catalogEntry.id,
      name: catalogEntry.value || catalogEntry.code || 'Unknown',
      value: catalogEntry.value || catalogEntry.code || 'Unknown'
    }
  }

  const fetchEmploymentTypes = useCallback(
    async (
      params: {
        limit?: number
        offset?: number
        search?: string
        reset?: boolean
      } = {}
    ) => {
      const { limit = 20, offset = 0, search = '', reset = false } = params

      if (reset) {
        setEmploymentTypes([])
        setAllEmploymentTypes([])
      }

      setLoading(true)
      setError(null)

      try {
        const response = await catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: EMPLOYMENT_TYPE_CATALOG,
            version: EMPLOYMENT_TYPE_VERSION
          },
          {
            limit,
            offset,
            returnTotalRecords: true,
            includeChildCatalogEntries: true,
            ...(search && { searchCriteria: search })
          }
        )

        const transformedData = response.data
          .filter((entry: any) => !isEmploymentTypeMarkedDeleted(entry))
          .map(transformEmploymentType)
        const selectOptions: SelectOption[] = transformedData.map(type => ({
          id: type.id,
          name: type.name,
          label: type.name,
          value: type.id
        }))

        if (reset || offset === 0) {
          setEmploymentTypes(selectOptions)
          setAllEmploymentTypes(transformedData)
        } else {
          setEmploymentTypes(prev => [...prev, ...selectOptions])
          setAllEmploymentTypes(prev => [...prev, ...transformedData])
        }

        setHasMore(response.data.length === limit)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch employment types'
        setError(errorMessage)
        console.error('Error fetching employment types:', err)
      } finally {
        setLoading(false)
      }
    },
    [accessToken, catalogClient]
  )

  const searchEmploymentTypes = useCallback(
    (search: string) => {
      setSearchTerm(search)
      fetchEmploymentTypes({ search, reset: true })
    },
    [fetchEmploymentTypes]
  )

  const loadMoreEmploymentTypes = useCallback(() => {
    if (!loading && hasMore) {
      fetchEmploymentTypes({
        search: searchTerm,
        offset: employmentTypes.length
      })
    }
  }, [fetchEmploymentTypes, loading, hasMore, searchTerm, employmentTypes.length])

  // Load initial data
  useEffect(() => {
    if (accessToken) {
      fetchEmploymentTypes({ reset: true })
    }
  }, [accessToken, fetchEmploymentTypes])

  return {
    employmentTypes,
    allEmploymentTypes,
    loading,
    error,
    hasMore,
    searchEmploymentTypes,
    loadMoreEmploymentTypes,
    refetch: () => fetchEmploymentTypes({ reset: true })
  }
}
