import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { CatalogEntry } from '@/common/types/CatalogTypes'
import { SelectOption } from '../types'

const JOB_FAMILY_CATALOG = 'JobFamily'
const JOB_FAMILY_VERSION = 'v1'

export interface JobFamilyData {
  id: string
  name: string
  code: string
  description?: string
  parentEntryId?: string
  isActive: boolean
  translations?: { [key: string]: string }
}

export const useJobFamilies = (context: BusinessAppContextProps) => {
  const [jobFamilies, setJobFamilies] = useState<SelectOption[]>([])
  const [allJobFamilies, setAllJobFamilies] = useState<JobFamilyData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const catalogClient = useCatalogManagerClient(context.accessToken)

  const transformJobFamily = (catalogEntry: CatalogEntry): JobFamilyData => {
    const translationsObj: { [key: string]: string } = {}
    catalogEntry.translations?.forEach(translation => {
      if (translation.localeCode && translation.value) {
        translationsObj[translation.localeCode] = translation.value
      }
    })

    return {
      id: catalogEntry.id,
      name: catalogEntry.value || catalogEntry.code || 'Unknown',
      code: catalogEntry.code || catalogEntry.id,
      description:
        typeof catalogEntry.objectValue === 'object' && catalogEntry.objectValue !== null
          ? (catalogEntry.objectValue as any)?.description
          : undefined,
      parentEntryId: catalogEntry.parentEntryId,
      isActive: true,
      translations: translationsObj
    }
  }

  const fetchJobFamilies = useCallback(
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
        setJobFamilies([])
        setAllJobFamilies([])
      }

      setLoading(true)
      setError(null)

      try {
        const response = await catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: JOB_FAMILY_CATALOG,
            version: JOB_FAMILY_VERSION
          },
          {
            limit,
            offset,
            returnTotalRecords: true,
            includeChildCatalogEntries: true,
            ...(search && { searchCriteria: search })
          }
        )

        const transformedData = response.data.map(transformJobFamily)
        const selectOptions: SelectOption[] = transformedData.map(family => ({
          id: family.id,
          name: family.name,
          label: family.name,
          value: family.id
        }))

        if (reset || offset === 0) {
          setJobFamilies(selectOptions)
          setAllJobFamilies(transformedData)
        } else {
          setJobFamilies(prev => [...prev, ...selectOptions])
          setAllJobFamilies(prev => [...prev, ...transformedData])
        }

        setHasMore(response.data.length === limit)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch job families'
        setError(errorMessage)
        console.error('Error fetching job families:', err)
      } finally {
        setLoading(false)
      }
    },
    [context.accessToken, catalogClient]
  )

  const searchJobFamilies = useCallback(
    (search: string) => {
      setSearchTerm(search)
      fetchJobFamilies({ search, reset: true })
    },
    [fetchJobFamilies]
  )

  const loadMoreJobFamilies = useCallback(() => {
    if (!loading && hasMore) {
      fetchJobFamilies({
        search: searchTerm,
        offset: jobFamilies.length
      })
    }
  }, [fetchJobFamilies, loading, hasMore, searchTerm, jobFamilies.length])

  // Load initial data
  useEffect(() => {
    if (context.accessToken) {
      fetchJobFamilies({ reset: true })
    }
  }, [context.accessToken, fetchJobFamilies])

  return {
    jobFamilies,
    allJobFamilies,
    loading,
    error,
    hasMore,
    searchJobFamilies,
    loadMoreJobFamilies,
    refetch: () => fetchJobFamilies({ reset: true })
  }
}
