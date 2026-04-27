import { useCallback, useEffect, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { JobFamilyQueryParameters, useJobFamilyQueries } from '../queries/useJobFamilyQueries.ts'
import { JobFamily, JobFamilyDeletionPayload, transformJobFamilyRow } from '../utils/JobFamily.types'

export default function useJobFamilies(context: BusinessAppContextProps) {
  // ─── State Management ──────────────────────────────────────────────────────
  const [jobFamilies, setJobFamilies] = useState<JobFamily[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // ─── External Dependencies ─────────────────────────────────────────────────
  const { fetchJobFamilies, deleteJobFamily } = useJobFamilyQueries(context.accessToken)

  // ─── Data Loading Functions ───────────────────────────────────────────────
  const loadData = useCallback(
    async (params: JobFamilyQueryParameters = {}) => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetchJobFamilies(params)
        const transformedJobFamilies = (response.jobFamilies || []).map(transformJobFamilyRow)
        setJobFamilies(transformedJobFamilies)
        setTotalCount(response.JobFamilyAggregate.aggregate.count)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        setError(errorMessage)
        console.error('Error loading job families:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [fetchJobFamilies]
  )

  const refetch = useCallback(() => {
    return loadData()
  }, [loadData])

  const removeJobFamily = useCallback(
    async (jobFamily: JobFamilyDeletionPayload['jobFamily']) => {
      setDeleteLoading(true)
      setDeleteError(null)

      try {
        await deleteJobFamily({ jobFamily })
        await refetch()
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        setDeleteError(errorMessage)
        console.error('Error deleting job family:', err)
        throw err
      } finally {
        setDeleteLoading(false)
      }
    },
    [deleteJobFamily, refetch]
  )

  // ─── Helper Functions ──────────────────────────────────────────────────────
  const getJobFamilyById = useCallback(
    (id: string): JobFamily | undefined => {
      return jobFamilies.find(family => family.id === id)
    },
    [jobFamilies]
  )

  const searchJobFamilies = useCallback(
    (searchTerm: string): JobFamily[] => {
      if (!searchTerm) return jobFamilies
      const term = searchTerm.toLowerCase()
      return jobFamilies.filter(
        family =>
          family.name.toLowerCase().includes(term) ||
          family.code.toLowerCase().includes(term) ||
          family.description?.toLowerCase().includes(term)
      )
    },
    [jobFamilies]
  )

  useEffect(() => {
    if (context.accessToken) {
      loadData()
    }
  }, [context.accessToken, loadData])

  return {
    // Data
    jobFamilies,
    totalCount,
    isLoading: isLoading || deleteLoading,
    error: error || deleteError,

    // Actions
    refetch,
    removeJobFamily,
    deleteLoading,

    // Helper functions
    getJobFamilyById,
    searchJobFamilies,

    // Raw fetch function for advanced usage
    fetchJobFamilies,
    loadData
  }
}
