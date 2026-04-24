import { useCallback, useEffect, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { JobProfileQueryParameters, useJobProfileQueries } from '../queries/useJobProfileQueries.ts'
import { useJobFunctionQueries } from '../queries/useJobFunctionQueries.ts'
import { useJobLevelQueries } from '../queries/useJobLevelQueries.ts'
import { JobProfile, JobProfileDeletionPayload, transformJobProfileRow } from '../utils/JobProfile.types'
import { PartialJobFunction, transformJobFunctionRow } from '../utils/JobFunction.types'
import { JobLevel, transformJobLevelRow } from '../utils/JobLevel.types'

export function useJobProfiles(context: BusinessAppContextProps) {
  // ─── State Management ──────────────────────────────────────────────────────
  const [jobProfiles, setJobProfiles] = useState<JobProfile[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Reference data states
  const [jobFunctions, setJobFunctions] = useState<PartialJobFunction[]>([])
  const [jobLevels, setJobLevels] = useState<JobLevel[]>([])
  const [referenceDataLoading, setReferenceDataLoading] = useState(true)

  // ─── External Dependencies ─────────────────────────────────────────────────
  const { fetchJobProfiles, deleteJobProfile } = useJobProfileQueries(context.accessToken)
  const { fetchJobFunctions } = useJobFunctionQueries(context.accessToken)
  const { fetchJobLevels } = useJobLevelQueries(context.accessToken)

  // ─── Data Loading Functions ───────────────────────────────────────────────
  const loadData = useCallback(
    async (params: JobProfileQueryParameters = {}) => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetchJobProfiles(params)
        const transformedJobProfiles = (response.jobProfiles || []).map(transformJobProfileRow)
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
    [fetchJobProfiles]
  )

  // Load reference data (job functions and levels)
  const loadReferenceData = useCallback(async () => {
    setReferenceDataLoading(true)
    try {
      const [functionsResponse, levelsResponse] = await Promise.all([fetchJobFunctions(), fetchJobLevels()])

      setJobFunctions(
        functionsResponse.jobFunctions?.map(f => ({
          ...transformJobFunctionRow(f),
          jobFamily: f.jobFamily || { id: '', code: '', name: '' }
        })) || []
      )

      setJobLevels(levelsResponse.jobLevels?.map(transformJobLevelRow) || [])
    } catch (err) {
      console.error('Error loading reference data:', err)
    } finally {
      setReferenceDataLoading(false)
    }
  }, [fetchJobFunctions, fetchJobLevels])

  const refetch = useCallback(() => {
    return loadData()
  }, [loadData])

  const removeJobProfile = useCallback(
    async (jobProfile: JobProfileDeletionPayload['jobProfile']) => {
      setDeleteLoading(true)
      setDeleteError(null)

      try {
        await deleteJobProfile({ changeMode: 'DELETE', jobProfile })
        await refetch()
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        setDeleteError(errorMessage)
        console.error('Error deleting job profile:', err)
        throw err
      } finally {
        setDeleteLoading(false)
      }
    },
    [deleteJobProfile, refetch]
  )

  const getJobProfileById = useCallback(
    (id: string): JobProfile | undefined => {
      return jobProfiles.find(profile => profile.id === id)
    },
    [jobProfiles]
  )

  const searchJobProfiles = useCallback(
    (searchTerm: string): JobProfile[] => {
      if (!searchTerm) return jobProfiles
      const term = searchTerm.toLowerCase()
      return jobProfiles.filter(
        profile =>
          profile.name?.toLowerCase().includes(term) ||
          profile.code?.toLowerCase().includes(term) ||
          profile.description?.toLowerCase().includes(term) ||
          profile.jobFunction?.name?.toLowerCase().includes(term) ||
          profile.jobFunction?.code?.toLowerCase().includes(term) ||
          profile.jobLevel?.name?.toLowerCase().includes(term) ||
          profile.jobLevel?.code?.toLowerCase().includes(term) ||
          profile.jobProfileSkills?.some(skill => skill.skill?.name?.toLowerCase().includes(term))
      )
    },
    [jobProfiles]
  )

  useEffect(() => {
    if (context.accessToken) {
      Promise.all([loadData(), loadReferenceData()])
    }
  }, [context.accessToken, loadData, loadReferenceData])

  return {
    // Data
    jobProfiles,
    totalCount,
    jobFunctions,
    jobLevels,
    referenceDataLoading,

    // State
    isLoading: isLoading || deleteLoading,
    error: error || deleteError,

    // Actions
    refetch,
    removeJobProfile,
    deleteLoading,

    // Helper functions
    getJobProfileById,
    searchJobProfiles,

    // Raw fetch function for advanced usage
    fetchJobProfiles,
    loadData,
    loadReferenceData
  }
}
