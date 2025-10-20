import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { useGetJobLevelData, JobLevelDataVariables } from '../queries/JobLevelQueries'
import { JobLevel, JobLevelGroup } from '../types'
import { useGetCompensationBandData } from '../../compensation-data'
import { CompensationBand } from '../../compensation-data/queries/CompensationBandQueries'
import { useGetJobLevelGroups } from '../queries/JobFamiliesQueries'

export const useJobLevels = (context: BusinessAppContextProps) => {
  const [jobLevelGroups, setJobLevelGroups] = useState<JobLevelGroup[]>([])
  const [jobLevels, setJobLevels] = useState<JobLevel[]>([])
  const [compensationBands, setCompensationBands] = useState<CompensationBand[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const catalogClient = useCatalogManagerClient(context.accessToken)
  const { fetchJobLevelData } = useGetJobLevelData(context)
  const { fetchCompensationBandData } = useGetCompensationBandData(context)
  const { fetchJobLevelGroups } = useGetJobLevelGroups(catalogClient)

  const transformJobLevel = (jobLevel: any): JobLevel => {
    return {
      id: jobLevel.id,
      name: jobLevel.name || 'Unknown Job Level',
      nameI18n: jobLevel.nameI18n,
      code: jobLevel.code,
      description: jobLevel.description,
      descriptionI18n: jobLevel.descriptionI18n,
      level: jobLevel.hierarchyOrder || 1,
      jobLevelGroupId: jobLevel.jobLevelGroupRef || '',
      compensationBandId: jobLevel.compensationBandId,
      compensationBand: jobLevel.compensationBand,
      version: jobLevel.version,
      displayName: jobLevel.name || jobLevel.code || 'Unknown',
      salaryGrade: jobLevel.compensationBand?.id ? parseInt(jobLevel.compensationBand.id) : undefined,
      experienceYears: jobLevel.additionalProperties?.additionalProp1
    }
  }

  const fetchJobLevels = async (variables?: JobLevelDataVariables) => {
    try {
      const response = await fetchJobLevelData({
        limit: 1000, // Get all job levels
        offset: 0,
        ...variables
      })

      return response.jobLevels?.map(transformJobLevel) || []
    } catch (error) {
      console.error('Error fetching job levels:', error)
      throw new Error('Failed to fetch job levels from GraphQL API')
    }
  }

  const loadData = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch both job level groups and job levels in parallel
      const [groupsData, levelsData] = await Promise.all([fetchJobLevelGroups(), fetchJobLevels()])

      // Combine the data - assign job levels to their respective groups
      const enhancedGroups = groupsData.map(group => {
        const groupJobLevels = levelsData.filter(level => level.jobLevelGroupId === group.id)
        return {
          ...group,
          jobLevels: groupJobLevels.sort((a, b) => a.level - b.level), // Sort by level
          jobLevelCount: groupJobLevels.length
        }
      })

      setJobLevelGroups(enhancedGroups)
      setJobLevels(levelsData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error loading job levels data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken])

  const loadCompensationBands = useCallback(async () => {
    try {
      const { compensationBands } = await fetchCompensationBandData({
        limit: 100,
        offset: 0
      })

      setCompensationBands(compensationBands ?? [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error loading compensation bands data:', err)
    } finally {
      setIsLoading(false)
    }
  }, [fetchCompensationBandData])

  const refetch = useCallback(() => {
    return loadData()
  }, [loadData])

  // Load data on mount and when access token changes
  useEffect(() => {
    if (context.accessToken) {
      loadData()
      loadCompensationBands()
    }
  }, [context.accessToken, loadData])

  // Helper functions
  const getJobLevelsByGroupId = (groupId: string): JobLevel[] => {
    return jobLevels.filter(level => level.jobLevelGroupId === groupId)
  }

  const getJobLevelById = (levelId: string): JobLevel | undefined => {
    return jobLevels.find(level => level.id === levelId)
  }

  const getJobLevelGroupById = (groupId: string): JobLevelGroup | undefined => {
    return jobLevelGroups.find(group => group.id === groupId)
  }

  return {
    // Data
    jobLevelGroups,
    jobLevels,
    compensationBands,

    // State
    isLoading,
    error,

    // Actions
    refetch,

    // Helper functions
    getJobLevelsByGroupId,
    getJobLevelById,
    getJobLevelGroupById,

    // Raw fetch functions for advanced usage
    fetchJobLevelGroups,
    fetchJobLevels
  }
}
