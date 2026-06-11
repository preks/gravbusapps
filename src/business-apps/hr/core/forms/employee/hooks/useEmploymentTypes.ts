import { useState, useCallback, useEffect } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { isEmploymentTypeMarkedDeleted } from '@/business-apps/mdm/apps/employment-data/utils/catalogEntryMetadata'
import { getCatalogValue, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { SelectOption } from '../types'

const EMPLOYMENT_TYPE_CATALOG = 'EmploymentType'
const CATALOG_VERSION = 'v1'
const ITEMS_PER_PAGE = 20

export interface UseEmploymentTypesReturn {
  employmentTypes: SelectOption[]
  loading: boolean
  error: string | null
  hasMore: boolean
  searchEmploymentTypes: (searchTerm?: string) => void
  loadMoreEmploymentTypes: () => void
}

export const useEmploymentTypes = (accessToken: string): UseEmploymentTypesReturn => {
  const [employmentTypes, setEmploymentTypes] = useState<SelectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [initialLoadDone, setInitialLoadDone] = useState(false)

  const catalogClient = useCatalogManagerClient(accessToken)

  const fetchEmploymentTypes = useCallback(
    async (
      params: {
        limit?: number
        offset?: number
        search?: string
        reset?: boolean
      } = {}
    ) => {
      const { limit = ITEMS_PER_PAGE, offset = 0, search = '', reset = false } = params

      if (reset) {
        setEmploymentTypes([])
      }

      setLoading(true)
      setError(null)

      try {
        const response = await catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: EMPLOYMENT_TYPE_CATALOG,
            version: CATALOG_VERSION
          },
          {
            limit,
            offset,
            returnTotalRecords: true,
            includeChildCatalogEntries: true,
            includeTranslations: true,
            localeCode: getCurrentActiveUserLocale(),
            ...(search && { searchCriteria: search })
          }
        )

        const entries = (response.data || []).filter((entry: any) => !isEmploymentTypeMarkedDeleted(entry))
        const selectOptions: SelectOption[] = entries.map((entry: any) => {
          const label = getCatalogValue(entry) || entry.value || entry.code || 'Unknown'
          return {
            id: entry.id,
            name: label,
            label,
            value: entry.id,
            parentEntryId: entry.parentEntryId ?? null
          }
        })

        if (reset || offset === 0) {
          setEmploymentTypes(selectOptions)
        } else {
          setEmploymentTypes(prev => [...prev, ...selectOptions])
        }

        setHasMore(entries.length === limit)
        setInitialLoadDone(true)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch employment types'
        setError(errorMessage)
        console.error('Error fetching employment types:', err)
        setInitialLoadDone(true)
      } finally {
        setLoading(false)
      }
    },
    [accessToken, catalogClient]
  )

  const searchEmploymentTypes = useCallback(
    (search?: string) => {
      setSearchTerm(search || '')
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

  // Initial load
  useEffect(() => {
    if (accessToken && !initialLoadDone && !loading) {
      fetchEmploymentTypes({ reset: true })
    }
  }, [accessToken, fetchEmploymentTypes, initialLoadDone, loading])

  return {
    employmentTypes,
    loading,
    error,
    hasMore,
    searchEmploymentTypes,
    loadMoreEmploymentTypes
  }
}
