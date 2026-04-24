import { useJobFamilyQueries } from '@/business-apps/mdm/apps/job-structure-data/queries/useJobFamilyQueries.ts'
import {
  JobFunctionQueryParameters,
  useJobFunctionQueries
} from '@/business-apps/mdm/apps/job-structure-data/queries/useJobFunctionQueries.ts'
import { JobFamily } from '@/business-apps/mdm/apps/job-structure-data/utils/JobFamily.types.ts'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCallback, useEffect, useState } from 'react'
import { JobFunction, JobFunctionDeletionPayload, transformJobFunctionRow } from '../utils/JobFunction.types'

export function useJobFunctions(context: BusinessAppContextProps) {
  const [jobFunctions, setJobFunctions] = useState<JobFunction[]>([])
  const [jobFamilies, setJobFamilies] = useState<JobFamily[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const { fetchJobFunctions, deleteJobFunction } = useJobFunctionQueries(context.accessToken)
  const { fetchJobFamilies } = useJobFamilyQueries(context.accessToken)

  const loadJobFamilies = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const jobFamiliesResponse = await fetchJobFamilies()
      setJobFamilies(jobFamiliesResponse.jobFamilies || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error loading job families:', err)
    } finally {
      setIsLoading(false)
    }
  }, [fetchJobFamilies])

  const loadData = useCallback(
    async (params?: JobFunctionQueryParameters) => {
      setIsLoading(true)
      setError(null)

      try {
        const jobFunctionsResponse = await fetchJobFunctions(params)
        const transformedJobFunctions = (jobFunctionsResponse.jobFunctions || []).map(transformJobFunctionRow)
        setJobFunctions(transformedJobFunctions)
        setTotalCount(jobFunctionsResponse.JobFunctionAggregate.aggregate.count)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        setError(errorMessage)
        console.error('Error loading job functions:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [fetchJobFunctions]
  )

  const refetch = useCallback(
    (params?: JobFunctionQueryParameters) => {
      return loadData(params)
    },
    [loadData]
  )

  const removeJobFunction = useCallback(
    async (jobFunction: JobFunctionDeletionPayload['jobFunction']) => {
      setDeleteLoading(true)
      setDeleteError(null)

      try {
        await deleteJobFunction({ changeMode: 'DELETE', jobFunction })
        await refetch()
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        setDeleteError(errorMessage)
        console.error('Error deleting job function:', err)
        throw err
      } finally {
        setDeleteLoading(false)
      }
    },
    [deleteJobFunction, refetch]
  )

  const getJobFunctionById = useCallback(
    (functionId: string): JobFunction | undefined => {
      return jobFunctions.find(func => func.id === functionId)
    },
    [jobFunctions]
  )

  const getJobFunctionsByJobFamily = useCallback(
    (jobFamilyId: string): JobFunction[] => {
      return jobFunctions.filter(func => func.jobFamily?.id === jobFamilyId)
    },
    [jobFunctions]
  )

  const searchJobFunctions = useCallback(
    (query: string): JobFunction[] => {
      const term = query.toLowerCase()
      return jobFunctions.filter(
        f =>
          f.name?.toLowerCase().includes(term) ||
          f.code?.toLowerCase().includes(term) ||
          f.description?.toLowerCase().includes(term) ||
          f.jobFamily?.name?.toLowerCase().includes(term) ||
          f.jobFamily?.code?.toLowerCase().includes(term)
      )
    },
    [jobFunctions]
  )

  useEffect(() => {
    if (context.accessToken) {
      loadData()
      loadJobFamilies()
    }
  }, [context.accessToken, loadData, loadJobFamilies])

  return {
    jobFunctions,
    jobFamilies,
    totalCount,

    // State
    isLoading: isLoading || deleteLoading,
    error: error || deleteError,

    // Actions
    refetch,
    removeJobFunction,
    deleteLoading,

    // Helper functions
    getJobFunctionById,
    getJobFunctionsByJobFamily,
    searchJobFunctions,

    // Raw fetch function for advanced usage
    fetchJobFunctions
  }
}
