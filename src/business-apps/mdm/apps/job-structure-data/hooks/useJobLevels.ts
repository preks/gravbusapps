import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobLevelQueries, JobLevelQueryParameters } from '../queries/useJobLevelQueries.ts'
import { JobLevel, JobLevelDeletionPayload, transformJobLevelRow } from '../utils/JobLevel.types'

export function useJobLevels(context: BusinessAppContextProps) {
  const [jobLevels, setJobLevels] = useState<JobLevel[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { fetchJobLevels, deleteJobLevel } = useJobLevelQueries(context.accessToken)

  const loadData = useCallback(
    async (params: JobLevelQueryParameters = {}) => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetchJobLevels(params)
        const transformedJobLevels = (response.jobLevels || []).map(transformJobLevelRow)
        setJobLevels(transformedJobLevels)
        setTotalCount(response.JobLevelAggregate.aggregate.count)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        setError(errorMessage)
        console.error('Error loading job levels:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [fetchJobLevels]
  )

  const refetch = useCallback(() => {
    return loadData()
  }, [loadData])

  const removeJobLevel = useCallback(
    async (jobLevel: JobLevelDeletionPayload['jobLevel']) => {
      setDeleteLoading(true)
      setDeleteError(null)

      try {
        await deleteJobLevel({ changeMode: 'DELETE', jobLevel })
        await refetch()
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        setDeleteError(errorMessage)
        console.error('Error deleting job level:', err)
        throw err
      } finally {
        setDeleteLoading(false)
      }
    },
    [deleteJobLevel, refetch]
  )

  const getJobLevelById = useCallback(
    (levelId: string): JobLevel | undefined => {
      return jobLevels.find(level => level.id === levelId)
    },
    [jobLevels]
  )

  const searchJobLevels = useCallback(
    (query: string): JobLevel[] => {
      const term = query.toLowerCase()
      return jobLevels.filter(
        level =>
          level.name?.toLowerCase().includes(term) ||
          level.code?.toLowerCase().includes(term) ||
          level.description?.toLowerCase().includes(term)
      )
    },
    [jobLevels]
  )

  // Load data on mount and when access token changes
  useEffect(() => {
    if (context.accessToken) {
      loadData()
    }
  }, [context.accessToken, loadData])

  return {
    jobLevels,
    totalCount,

    // State
    isLoading: isLoading || deleteLoading,
    error: error || deleteError,

    // Actions
    refetch,
    removeJobLevel,
    deleteLoading,

    // Helper functions
    getJobLevelById,
    searchJobLevels,

    // Raw fetch function for advanced usage
    fetchJobLevels,
    loadData
  }
}
