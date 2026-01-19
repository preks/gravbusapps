import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetJobProfileData, JobProfileDataVariables } from '../queries/JobProfileQueries'
import { JobFunction, JobProfile } from '../types'
import { useGetJobFunctionData } from '../queries/JobFunctionQueries'

export const useJobProfiles = (context: BusinessAppContextProps) => {
  const [jobProfiles, setJobProfiles] = useState<JobProfile[]>([])
  const [jobFunctions, setJobFunctions] = useState<JobFunction[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { fetchJobProfileData } = useGetJobProfileData(context)
  const { fetchJobFunctionData } = useGetJobFunctionData(context)

  const loadJobFunctions = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const jobFunctions = await fetchJobFunctionData()
      const transformedJobFunctions = (jobFunctions.jobFunctions || []).map(jobFunction => ({
        ...jobFunction,
        displayName: jobFunction.name || jobFunction.code || 'Unknown Function',
        isActive: true // Assuming active since it's not deleted
      })) as JobFunction[]

      setJobFunctions(transformedJobFunctions)
      setTotalCount(jobFunctions.JobFunctionAggregate.aggregate.count)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error loading job functions:', err)
    } finally {
      setIsLoading(false)
    }
  }, [fetchJobFunctionData])

  const loadData = useCallback(
    async (variables?: JobProfileDataVariables) => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetchJobProfileData(variables)
        // Transform the data to ensure displayName and isActive are set
        const transformedJobProfiles = (response.jobProfiles || []).map(jobProfile => ({
          ...jobProfile,
          displayName: jobProfile.name || jobProfile.code || 'Unknown Profile',
          isActive: jobProfile.recordState === 'active'
        })) as JobProfile[]

        setJobProfiles(transformedJobProfiles)
        setTotalCount(response.JobProfileAggregate.aggregate.count)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        setError(errorMessage)
        console.error('Error loading job profiles:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [fetchJobProfileData]
  )

  const refetch = useCallback(
    (variables?: JobProfileDataVariables) => {
      return loadData(variables)
    },
    [loadData]
  )

  // Helper functions
  const getJobProfileById = useCallback(
    (profileId: string): JobProfile | undefined => {
      return jobProfiles.find(profile => profile.id === profileId)
    },
    [jobProfiles]
  )

  const getJobProfilesByJobFunction = useCallback(
    (jobFunctionId: string): JobProfile[] => {
      return jobProfiles.filter(
        profile => profile.jobFunctionId === jobFunctionId || profile.jobFunction?.id === jobFunctionId
      )
    },
    [jobProfiles]
  )

  const getJobProfilesByJobLevel = useCallback(
    (jobLevelId: string): JobProfile[] => {
      return jobProfiles.filter(profile => profile.jobLevelId === jobLevelId || profile.jobLevel?.id === jobLevelId)
    },
    [jobProfiles]
  )

  const getJobProfilesByContractType = useCallback(
    (contractTypeRef: string): JobProfile[] => {
      return jobProfiles.filter(
        profile => profile.contractTypeRef === contractTypeRef || profile.contractType?.id === contractTypeRef
      )
    },
    [jobProfiles]
  )

  const getJobProfilesByEmploymentType = useCallback(
    (employmentTypeRef: string): JobProfile[] => {
      return jobProfiles.filter(
        profile => profile.employmentTypeRef === employmentTypeRef || profile.employmentType?.id === employmentTypeRef
      )
    },
    [jobProfiles]
  )

  const searchJobProfiles = useCallback(
    (query: string): JobProfile[] => {
      const searchTerm = query.toLowerCase()
      return jobProfiles.filter(
        profile =>
          profile.name.toLowerCase().includes(searchTerm) ||
          (profile.code && profile.code.toLowerCase().includes(searchTerm)) ||
          (profile.description && profile.description.toLowerCase().includes(searchTerm)) ||
          (profile.jobFunction?.name && profile.jobFunction.name.toLowerCase().includes(searchTerm)) ||
          (profile.jobLevel?.name && profile.jobLevel.name.toLowerCase().includes(searchTerm))
      )
    },
    [jobProfiles]
  )

  // Load data on mount and when access token changes
  useEffect(() => {
    if (context.accessToken) {
      loadData()
      loadJobFunctions()
    }
  }, [context.accessToken, loadData])

  return {
    // Data
    jobProfiles,
    jobFunctions,
    totalCount,

    // State
    isLoading,
    error,

    // Actions
    refetch,

    // Helper functions
    getJobProfileById,
    getJobProfilesByJobFunction,
    getJobProfilesByJobLevel,
    getJobProfilesByContractType,
    getJobProfilesByEmploymentType,
    searchJobProfiles,

    // Raw fetch function for advanced usage
    fetchJobProfileData
  }
}
