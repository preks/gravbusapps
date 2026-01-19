import { useState, useEffect, useCallback } from 'react'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

export const JOB_FAMILY_CATALOG = 'JobFamily'
export const JOB_FAMILY_VERSION = 'v1'

export interface JobFamilyFilter {
  id: string
  label: string
  selected: boolean
}

export interface JobFamilyFilterOption {
  id: string
  name: string
}

export const useJobFamilyFilters = (accessToken: string, search: string = '', offset: number = 0) => {
  const catalogClient = useCatalogManagerClient(accessToken)
  const [jobFamilyOptions, setJobFamilyOptions] = useState<JobFamilyFilterOption[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchJobFamilies = useCallback(async () => {
    if (!accessToken) return

    setLoading(true)
    setError(null)

    try {
      const response = await catalogClient.getCatalogEntriesList(
        {
          catalogIdentifier: JOB_FAMILY_CATALOG,
          version: JOB_FAMILY_VERSION
        },
        {
          limit: 5,
          offset,
          returnTotalRecords: true,
          includeChildCatalogEntries: true,
          ...(search && { searchCriteria: search })
        }
      )

      const options: JobFamilyFilterOption[] = response.data
        .filter(entry => entry && entry.id)
        .map(entry => ({
          id: entry.id,
          name: entry.value || entry.code || 'Unknown'
        }))

      setJobFamilyOptions(options)
    } catch (err) {
      console.error('Error fetching job families:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch job families'))
    } finally {
      setLoading(false)
    }
  }, [accessToken, catalogClient, search, offset])

  // Load data when search or offset changes
  useEffect(() => {
    fetchJobFamilies()
  }, [fetchJobFamilies])

  return {
    families: jobFamilyOptions,
    loading,
    error
  }
}
