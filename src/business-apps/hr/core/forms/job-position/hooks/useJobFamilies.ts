import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { fetchJobFamilyCatalogEntries } from '@/common/data/catalog/fetchJobFamilyCatalogEntries'
import type { CatalogEntry } from '@/common/data/catalog/types/catalogTypes'
import { SelectOption } from '../types'

export interface JobFamilyData {
  id: string
  name: string
  code: string
  description?: string
  parentEntryId?: string
  isActive: boolean
  translations?: { [key: string]: string }
}

const jobFamiliesToSelectOptions = (families: JobFamilyData[]): SelectOption[] =>
  families.map(family => ({
    id: family.id,
    name: family.name,
    label: family.name,
    value: family.id
  }))

const transformJobFamily = (catalogEntry: CatalogEntry): JobFamilyData => {
  const translationsObj: { [key: string]: string } = {}
  catalogEntry.translations?.forEach(translation => {
    if (translation.localeCode && translation.value) {
      translationsObj[translation.localeCode] = translation.value
    }
  })

  return {
    id: catalogEntry.id,
    name: (catalogEntry.value || catalogEntry.code || 'Unknown').trim(),
    code: catalogEntry.code || catalogEntry.id,
    description:
      typeof catalogEntry.objectValue === 'object' && catalogEntry.objectValue !== null
        ? (catalogEntry.objectValue as { description?: string })?.description
        : undefined,
    parentEntryId: catalogEntry.parentEntryId,
    isActive: true,
    translations: Object.keys(translationsObj).length > 0 ? translationsObj : undefined
  }
}

export const useJobFamilies = (context: BusinessAppContextProps) => {
  const [jobFamilies, setJobFamilies] = useState<SelectOption[]>([])
  const [allJobFamilies, setAllJobFamilies] = useState<JobFamilyData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchJobFamilies = useCallback(
    async (
      params: {
        limit?: number
        offset?: number
        search?: string
        reset?: boolean
      } = {}
    ) => {
      const { limit = 100, offset = 0, search = '', reset = false } = params

      if (reset) {
        setJobFamilies([])
        setAllJobFamilies([])
      }

      setLoading(true)
      setError(null)

      try {
        const { entries, totalCount } = await fetchJobFamilyCatalogEntries(graphqlClient, {
          limit,
          offset,
          search
        })

        const transformedData = entries.map(transformJobFamily)
        const nextEnd = offset + transformedData.length
        setHasMore(nextEnd < totalCount)

        if (reset || offset === 0) {
          setAllJobFamilies(transformedData)
          setJobFamilies(jobFamiliesToSelectOptions(transformedData))
        } else {
          setAllJobFamilies(prev => [...prev, ...transformedData])
          setJobFamilies(prev => [...prev, ...jobFamiliesToSelectOptions(transformedData)])
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch job families'
        setError(errorMessage)
        console.error('Error fetching job families:', err)
        setHasMore(false)
      } finally {
        setLoading(false)
      }
    },
    [graphqlClient]
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
