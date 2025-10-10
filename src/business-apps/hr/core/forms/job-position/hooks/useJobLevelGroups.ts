import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useUserLocale } from '@/common/locale/useUserLocale'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { SelectOption } from '../types'

export interface JobLevelGroupData {
  id: string
  name: string
  code?: string
  description?: string
  category?: string
}

export const useJobLevelGroups = (context: BusinessAppContextProps) => {
  const [jobLevelGroups, setJobLevelGroups] = useState<SelectOption[]>([])
  const [allJobLevelGroups, setAllJobLevelGroups] = useState<JobLevelGroupData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const userLocale = useUserLocale() ?? 'en-US'
  const catalogClient = useCatalogManagerClient(context.accessToken)

  const fetchJobLevelGroups = useCallback(
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
        setJobLevelGroups([])
        setAllJobLevelGroups([])
      }

      setLoading(true)
      setError(null)

      try {
        const response = await catalogClient.getCatalogEntriesList(
          {
            catalogIdentifier: 'JobLevelGroup',
            version: 'v1'
          },
          {
            limit,
            offset,
            returnTotalRecords: true,
            includeChildCatalogEntries: true,
            localeCode: userLocale,
            ...(search ? { searchCriteria: search } : {})
          }
        )

        // Response has a data property containing the array of CatalogEntry
        const entries = response.data || []

        const transformedData = entries
          .filter((entry: any) => entry && (entry.id || entry._id))
          .map((entry: any) => ({
            id: entry.id || entry._id || '',
            name: entry.value || entry.name || entry.label || entry.id || '',
            code: entry.code || '',
            description: entry.description || '',
            category: entry.category || ''
          }))

        const selectOptions: SelectOption[] = transformedData.map((group: JobLevelGroupData) => ({
          id: group.id,
          name: group.name,
          label: group.name,
          value: group.id
        }))

        if (reset || offset === 0) {
          setJobLevelGroups(selectOptions)
          setAllJobLevelGroups(transformedData)
        } else {
          setJobLevelGroups(prev => [...prev, ...selectOptions])
          setAllJobLevelGroups(prev => [...prev, ...transformedData])
        }

        setHasMore(transformedData.length === limit)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch job level groups'
        setError(errorMessage)
        console.error('Error fetching job level groups:', err)
      } finally {
        setLoading(false)
      }
    },
    [context.accessToken, catalogClient, userLocale]
  )

  const searchJobLevelGroups = useCallback(
    (search: string) => {
      setSearchTerm(search)
      fetchJobLevelGroups({ search, reset: true })
    },
    [fetchJobLevelGroups]
  )

  const loadMoreJobLevelGroups = useCallback(() => {
    if (!loading && hasMore) {
      fetchJobLevelGroups({
        search: searchTerm,
        offset: jobLevelGroups.length
      })
    }
  }, [fetchJobLevelGroups, loading, hasMore, searchTerm, jobLevelGroups.length])

  // Load initial data
  useEffect(() => {
    if (context.accessToken) {
      fetchJobLevelGroups({ reset: true })
    }
  }, [context.accessToken, fetchJobLevelGroups])

  return {
    jobLevelGroups,
    allJobLevelGroups,
    loading,
    error,
    hasMore,
    searchJobLevelGroups,
    loadMoreJobLevelGroups,
    refetch: () => fetchJobLevelGroups({ reset: true })
  }
}
