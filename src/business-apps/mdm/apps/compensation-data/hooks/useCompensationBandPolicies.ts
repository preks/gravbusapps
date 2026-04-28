import { useCallback, useEffect, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useJobLevelQueries } from '../../job-structure-data/queries/useJobLevelQueries.ts'
import { useJobFamilyQueries } from '../../job-structure-data/queries/useJobFamilyQueries.ts'
import { useGeoZoneQueries } from '../../organizational-data/queries/useGeoZoneQueries.ts'
import { CompensationBandPolicy, CompensationBandPolicyDeletionPayload } from '../utils/CompensationBandPolicy.types'
import { CompensationBand, transformCompensationBandRow } from '../utils/CompensationBand.types'
import { JobLevel } from '../../job-structure-data/utils/JobLevel.types'
import { JobFamily } from '../../job-structure-data/utils/JobFamily.types'
import { GeoZone } from '../../organizational-data/types/GeoZone.types.ts'
import {
  CompensationBandPolicyQueryParameters,
  useCompensationBandPolicyQueries
} from '@/business-apps/mdm/apps/compensation-data/queries/CompensationBandPolicyQueries.ts'
import { useCompensationBandQueries } from '@/business-apps/mdm/apps/compensation-data/queries/CompensationBandQueries.ts'

export default function useCompensationBandPolicies(context: BusinessAppContextProps) {
  const [compensationBandPolicies, setCompensationBandPolicies] = useState<CompensationBandPolicy[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const [compensationBands, setCompensationBands] = useState<CompensationBand[]>([])
  const [jobLevels, setJobLevels] = useState<JobLevel[]>([])
  const [jobFamilies, setJobFamilies] = useState<JobFamily[]>([])
  const [geoZones, setGeoZones] = useState<GeoZone[]>([])
  const [referenceDataLoading, setReferenceDataLoading] = useState(true)

  // ─── External Dependencies ─────────────────────────────────────────────────
  const { fetchCompensationBandPolicies, deleteCompensationBandPolicy } = useCompensationBandPolicyQueries(
    context.accessToken
  )
  const { fetchCompensationBands } = useCompensationBandQueries(context.accessToken)
  const { fetchJobLevels } = useJobLevelQueries(context.accessToken)
  const { fetchJobFamilies } = useJobFamilyQueries(context.accessToken)
  const { fetchGeoZones } = useGeoZoneQueries(context.accessToken)

  // ─── Data Loading Functions ───────────────────────────────────────────────
  const loadData = useCallback(
    async (params: CompensationBandPolicyQueryParameters = {}) => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await fetchCompensationBandPolicies(params)
        // TODO: Consistently deal with null values coming from the db
        const transformedPolicies = (response.compensationBandPolicies || []).map(policyRow => ({
          ...policyRow,
          compensationBand: {
            id: policyRow.compensationBand?.id,
            name: policyRow.compensationBand?.name,
            description: policyRow.compensationBand?.description === null ? '' : policyRow.compensationBand?.description
          },
          isActive: true
        })) as CompensationBandPolicy[]
        setCompensationBandPolicies(transformedPolicies)
        setTotalCount(response.CompensationBandPolicyAggregate.aggregate.count)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        setError(errorMessage)
        console.error('Error loading compensation band policies:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [fetchCompensationBandPolicies]
  )

  // Load reference data
  const loadReferenceData = useCallback(async () => {
    setReferenceDataLoading(true)
    try {
      const [bandsResponse, levelsResponse, familiesResponse, zonesResponse] = await Promise.all([
        fetchCompensationBands(),
        fetchJobLevels(),
        fetchJobFamilies(),
        fetchGeoZones()
      ])

      setCompensationBands((bandsResponse.compensationBands || []).map(transformCompensationBandRow))

      setJobLevels(
        levelsResponse.jobLevels?.map(l => ({
          ...l,
          description: l.description || '',
          isActive: true
        })) || []
      )

      setJobFamilies(
        familiesResponse.jobFamilies?.map(f => ({
          ...f,
          description: f.description || '',
          isActive: true
        })) || []
      )

      setGeoZones(
        zonesResponse.geoZones?.map(z => ({
          ...z,
          isActive: true
        })) || []
      )
    } catch (err) {
      console.error('Error loading reference data:', err)
    } finally {
      setReferenceDataLoading(false)
    }
  }, [fetchCompensationBands, fetchJobLevels, fetchJobFamilies, fetchGeoZones])

  const refetch = useCallback(() => {
    return loadData()
  }, [loadData])

  const removeCompensationBandPolicy = useCallback(
    async (compensationBandPolicy: CompensationBandPolicyDeletionPayload['compensationBandPolicy']) => {
      setDeleteLoading(true)
      setDeleteError(null)

      try {
        await deleteCompensationBandPolicy({ changeMode: 'DELETE', compensationBandPolicy })
        await refetch()
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
        setDeleteError(errorMessage)
        console.error('Error deleting compensation band policy:', err)
        throw err
      } finally {
        setDeleteLoading(false)
      }
    },
    [deleteCompensationBandPolicy, refetch]
  )

  const getCompensationBandPolicyById = useCallback(
    (id: string): CompensationBandPolicy | undefined => {
      return compensationBandPolicies.find(policy => policy.id === id)
    },
    [compensationBandPolicies]
  )

  const searchCompensationBandPolicies = useCallback(
    (searchTerm: string): CompensationBandPolicy[] => {
      if (!searchTerm) return compensationBandPolicies
      const term = searchTerm.toLowerCase()
      return compensationBandPolicies.filter(
        policy =>
          policy.compensationBand?.name.toLowerCase().includes(term) ||
          policy.jobLevel?.name.toLowerCase().includes(term) ||
          policy.jobFamily?.name.toLowerCase().includes(term) ||
          policy.geoZone?.name.toLowerCase().includes(term) ||
          policy.priority.toString().includes(term)
      )
    },
    [compensationBandPolicies]
  )

  useEffect(() => {
    if (context.accessToken) {
      Promise.all([loadData(), loadReferenceData()])
    }
  }, [context.accessToken, loadData, loadReferenceData])

  return {
    // Data
    compensationBandPolicies,
    totalCount,

    // State
    isLoading: isLoading || deleteLoading,
    error: error || deleteError,

    // Reference data
    compensationBands,
    jobLevels,
    jobFamilies,
    geoZones,
    referenceDataLoading,

    // Actions
    refetch,
    removeCompensationBandPolicy,
    deleteLoading,

    // Helper functions
    getCompensationBandPolicyById,
    searchCompensationBandPolicies,

    // Raw fetch function for advanced usage
    fetchCompensationBandPolicies,
    loadData,
    loadReferenceData
  }
}
