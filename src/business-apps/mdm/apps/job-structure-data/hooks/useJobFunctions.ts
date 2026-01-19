import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetJobFunctionData, JobFunctionDataVariables } from '../queries/JobFunctionQueries'
import { JobFamily, JobFunction, JobLevelGroup } from '../types'
import { useGetAllJobFamilies, useGetJobLevelGroups } from '../queries/JobFamiliesQueries'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'

export const useJobFunctions = (context: BusinessAppContextProps) => {
  const [jobFunctions, setJobFunctions] = useState<JobFunction[]>([])
  const [jobFamilies, setJobFamilies] = useState<JobFamily[]>([])
  const [jobLevelGroups, setJobLevelGroups] = useState<JobLevelGroup[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const catalogClient = useCatalogManagerClient(context.accessToken)

  const { fetchJobFunctionData } = useGetJobFunctionData(context)
  const { fetchJobLevelGroups } = useGetJobLevelGroups(catalogClient)
  const { fetchAllJobFamilies } = useGetAllJobFamilies(catalogClient)

  const loadJobFamilies = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const jobFamiliesResponse = await fetchAllJobFamilies()

      setJobFamilies(jobFamiliesResponse)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error loading job families:', err)
    } finally {
      setIsLoading(false)
    }
  }, [fetchAllJobFamilies])

  const loadJobLevelGroups = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const jobLevelGroupsResponse = await fetchJobLevelGroups()

      setJobLevelGroups(jobLevelGroupsResponse)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error loading job families:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const loadData = useCallback(
    async (variables?: JobFunctionDataVariables) => {
      setIsLoading(true)
      setError(null)

      try {
        const jobFunctionsResponse = await fetchJobFunctionData(variables)
        // Transform the data to ensure displayName and isActive are set
        const transformedJobFunctions = (jobFunctionsResponse.jobFunctions || []).map(jobFunction => ({
          ...jobFunction,
          displayName: jobFunction.name || jobFunction.code || 'Unknown Function',
          isActive: true // Assuming active since it's not deleted
        })) as JobFunction[]

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
    [fetchJobFunctionData]
  )

  const refetch = useCallback(
    (variables?: JobFunctionDataVariables) => {
      return loadData(variables)
    },
    [loadData]
  )

  // Helper functions
  const getJobFunctionById = useCallback(
    (functionId: string): JobFunction | undefined => {
      return jobFunctions.find(func => func.id === functionId)
    },
    [jobFunctions]
  )

  const getJobFunctionsByJobFamily = useCallback(
    (jobFamilyId: string): JobFunction[] => {
      return jobFunctions.filter(func => func.jobFamilyRef === jobFamilyId || func.jobFamily?.id === jobFamilyId)
    },
    [jobFunctions]
  )

  const getJobFunctionsByJobLevelGroup = useCallback(
    (jobLevelGroupId: string): JobFunction[] => {
      return jobFunctions.filter(
        func => func.jobLevelGroupRef === jobLevelGroupId || func.jobLevelGroup?.id === jobLevelGroupId
      )
    },
    [jobFunctions]
  )

  const searchJobFunctions = useCallback(
    (query: string): JobFunction[] => {
      const searchTerm = query.toLowerCase()
      return jobFunctions.filter(
        func =>
          func.name.toLowerCase().includes(searchTerm) ||
          (func.code && func.code.toLowerCase().includes(searchTerm)) ||
          (func.description && func.description.toLowerCase().includes(searchTerm))
      )
    },
    [jobFunctions]
  )

  // Load data on mount and when access token changes
  useEffect(() => {
    if (context.accessToken) {
      loadData()
      loadJobFamilies()
      loadJobLevelGroups()
    }
  }, [context.accessToken, loadData])

  return {
    // Data
    jobFunctions,
    jobFamilies,
    jobLevelGroups,
    totalCount,

    // State
    isLoading,
    error,

    // Actions
    refetch,

    // Helper functions
    getJobFunctionById,
    getJobFunctionsByJobFamily,
    getJobFunctionsByJobLevelGroup,
    searchJobFunctions,

    // Raw fetch function for advanced usage
    fetchJobFunctionData
  }
}
