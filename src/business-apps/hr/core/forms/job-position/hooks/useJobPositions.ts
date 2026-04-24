import {
  Department,
  JobPosition,
  JobPositionFormValues,
  SiteLocation
} from '@/business-apps/hr/core/forms/job-position/utils/JobPosition.types.ts'
import { useJobFamilyQueries } from '@/business-apps/mdm/apps/job-structure-data/queries/useJobFamilyQueries.ts'
import { useJobLevelQueries } from '@/business-apps/mdm/apps/job-structure-data/queries/useJobLevelQueries.ts'
import { JobFamily, transformJobFamilyRow } from '@/business-apps/mdm/apps/job-structure-data/utils/JobFamily.types.ts'
import { JobFunction } from '@/business-apps/mdm/apps/job-structure-data/utils/JobFunction.types.ts'
import { JobLevel, transformJobLevelRow } from '@/business-apps/mdm/apps/job-structure-data/utils/JobLevel.types.ts'
import { JobProfile } from '@/business-apps/mdm/apps/job-structure-data/utils/JobProfile.types.ts'
import { BusinessAppContextProps } from '@/common/BusinessAppContext.ts'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils.ts'
import { toast } from '@newwork/nw-design-system'
import { useCallback, useEffect, useState } from 'react'
import { useJobPositionQueries } from '../queries/useJobPositionQueries.ts'

// ─── Types ────────────────────────────────────────────────────────────────────

/** Search handler signature: receives the debounced query from Combobox.onSearch */
type SearchHandler = (query: string) => void

/**
 * Search handler for fields that are filtered by a parent selection.
 * The component passes the current parent ID at call time so the handler
 * can combine it with the search term in a single fetch.
 */
type FilteredSearchHandler = (
  query: string,
  parentIds: { familyId?: string; functionId?: string; levelId?: string }
) => void

function createJobPositionPayload(
  data: JobPositionFormValues,
  structureId: string,
  mode: 'INSERT' | 'UPDATE',
  id?: string,
  version?: number
) {
  return {
    changeMode: mode,
    jobPosition: {
      name: data.name,
      jobFunction: data.jobFunction?.id || '',
      jobLevel: data.jobLevel?.id || '',
      jobProfile: data.jobProfile?.id || '',
      ...(id ? { id, version } : {})
    },
    jobPositionOrgUnit: {
      structureId,
      organizationalUnitId: data.department?.id || '',
      siteLocationId: data.siteLocation?.id
    }
  }
}

export default function useJobPositions(context: BusinessAppContextProps) {
  const structureId = getCurrentActiveStructureId() ?? ''

  // ─── Reference Data State ──────────────────────────────────────────────────
  const [siteLocations, setSiteLocations] = useState<SiteLocation[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [jobFamilies, setJobFamilies] = useState<JobFamily[]>([])
  const [jobFunctions, setJobFunctions] = useState<JobFunction[]>([])
  const [jobProfiles, setJobProfiles] = useState<JobProfile[]>([])
  const [jobLevels, setJobLevels] = useState<JobLevel[]>([])
  const [referenceDataLoading, setReferenceDataLoading] = useState(true)
  const [mutationLoading, setMutationLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ─── External Dependencies ─────────────────────────────────────────────────
  const { fetchSiteLocations, fetchDepartments, fetchJobFunctions, fetchJobProfiles, saveJobPosition } =
    useJobPositionQueries(context.accessToken)

  const { fetchJobFamilies } = useJobFamilyQueries(context.accessToken)
  const { fetchJobLevels } = useJobLevelQueries(context.accessToken)

  // ─── Reference Data Loading ────────────────────────────────────────────────
  const loadReferenceData = useCallback(async () => {
    setReferenceDataLoading(true)
    setError(null)
    try {
      const [siteLocationsResponse, departmentsResponse, jobFamiliesResponse, jobFunctionsResponse, jobLevelsResponse] =
        await Promise.all([
          fetchSiteLocations({ structureId }),
          fetchDepartments({ structureId }),
          fetchJobFamilies(),
          fetchJobFunctions(),
          fetchJobLevels()
        ])

      setSiteLocations(siteLocationsResponse.siteLocations || [])

      setDepartments(departmentsResponse.departments || [])

      // Transform job families using MDM transform function
      const transformedJobFamilies = (jobFamiliesResponse.jobFamilies || []).map(transformJobFamilyRow)
      setJobFamilies(transformedJobFamilies)

      setJobFunctions(jobFunctionsResponse.jobFunctions || [])

      // Transform job levels using MDM transform function
      const transformedJobLevels = (jobLevelsResponse.jobLevels || []).map(transformJobLevelRow)
      setJobLevels(transformedJobLevels)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error loading reference data:', err)
    } finally {
      setReferenceDataLoading(false)
    }
  }, [fetchDepartments, fetchJobFamilies, fetchJobFunctions, fetchJobLevels])

  useEffect(() => {
    if (context.accessToken) {
      loadReferenceData()
    }
  }, [context.accessToken, loadReferenceData])

  // ─── Mutations (Business Logic Layer) ────────────────────────────────────────
  const createJobPosition = useCallback(
    async (data: JobPositionFormValues): Promise<JobPosition> => {
      setMutationLoading(true)
      try {
        const payload = createJobPositionPayload(data, structureId, 'INSERT')
        const result = (await saveJobPosition(payload)) as JobPosition
        toast.success('Job position created successfully!')
        return result
      } finally {
        setMutationLoading(false)
      }
    },
    [saveJobPosition, loadReferenceData]
  )

  const updateJobPosition = useCallback(
    async (data: JobPositionFormValues, id: string, version?: number): Promise<JobPosition> => {
      setMutationLoading(true)
      try {
        const payload = createJobPositionPayload(data, structureId, 'INSERT', id, version)
        const result = (await saveJobPosition(payload)) as JobPosition
        toast.success('Job position updated successfully!')
        return result
      } finally {
        setMutationLoading(false)
      }
    },
    [saveJobPosition, loadReferenceData]
  )

  const deleteJobPosition = useCallback(
    async (id: string, version?: number): Promise<void> => {
      setMutationLoading(true)
      try {
        const payload = {
          changeMode: 'DELETE' as const,
          jobPosition: { id, version }
        }

        await saveJobPosition(payload)
        toast.success('Job position deleted successfully!')
        loadReferenceData() // Refresh data after successful deletion
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to delete job position'
        toast.error(message)
        throw error
      } finally {
        setMutationLoading(false)
      }
    },
    [saveJobPosition, loadReferenceData]
  )

  // ─── Search Handlers ──────────────────────────────────────────────────────
  const handleSiteLocationSearch: SearchHandler = useCallback(
    (query: string) => {
      fetchSiteLocations({ search: query, structureId }).then(res => {
        setSiteLocations(res.siteLocations || [])
      })
    },
    [fetchSiteLocations]
  )

  const handleDepartmentSearch: SearchHandler = useCallback(
    (query: string) => {
      fetchDepartments({ search: query, structureId }).then(res => {
        setDepartments(res.departments || [])
      })
    },
    [fetchDepartments]
  )

  const handleJobFamilySearch: SearchHandler = useCallback(
    (query: string) => {
      fetchJobFamilies({ search: query }).then(res => {
        setJobFamilies(res.jobFamilies || [])
      })
    },
    [fetchJobFamilies]
  )

  /**
   * Job Function search combines the search term with the currently selected
   * Job Family ID so results stay scoped to the chosen family.
   * Return if there's no family id as it is mandatory for the search.
   */
  const handleJobFunctionSearch: FilteredSearchHandler = useCallback(
    (query: string, parentIds: { familyId?: string }) => {
      if (!parentIds.familyId) return

      const trimmed = query.trim()
      if (!trimmed) {
        setJobFunctions([])
      }

      fetchJobFunctions({ jobFamilyId: parentIds.familyId, search: query }).then(res =>
        setJobFunctions(res.jobFunctions || [])
      )
    },
    [fetchJobFunctions]
  )

  const clearJobProfiles = useCallback(() => {
    setJobProfiles([])
  }, [])

  /** Loads one profile by id into `jobProfiles` so the Job Profile combobox can show a label (options drive the trigger text). */
  const ensureJobProfileInOptions = useCallback(
    async (jobProfileId: string) => {
      const res = await fetchJobProfiles({ jobProfileId })
      const row = res.jobProfiles?.[0]
      if (!row) return
      setJobProfiles(prev => (prev.some(p => p.id === row.id) ? prev : [...prev, row]))
    },
    [fetchJobProfiles]
  )

  /** Searches by functionId if available, otherwise by familyId. Clears if neither is provided. */
  const handleJobProfileSearch: FilteredSearchHandler = useCallback(
    (query: string, parentIds: { familyId?: string; functionId?: string; levelId?: string }) => {
      const trimmed = query.trim()

      // If we have a function, filter by function (existing behavior)
      if (parentIds.functionId) {
        fetchJobProfiles({
          jobFunctionId: parentIds.functionId,
          jobLevelId: parentIds.levelId,
          search: trimmed || undefined
        }).then(res => setJobProfiles(res.jobProfiles || []))
        return
      }

      // If we have a family but no function, filter by family (new feature)
      if (parentIds.familyId) {
        fetchJobProfiles({
          jobFamilyId: parentIds.familyId,
          jobLevelId: parentIds.levelId,
          search: trimmed || undefined
        }).then(res => setJobProfiles(res.jobProfiles || []))
        return
      }

      // Neither function nor family - clear profiles
      setJobProfiles([])
    },
    [fetchJobProfiles]
  )

  // ─── Return API ────────────────────────────────────────────────────────────
  return {
    // Reference data
    siteLocations,
    departments,
    jobFamilies,
    jobFunctions,
    jobProfiles,
    jobLevels,
    referenceDataLoading,
    error,

    // Search handlers
    handleSiteLocationSearch,
    handleDepartmentSearch,
    handleJobFamilySearch,
    handleJobFunctionSearch,
    handleJobProfileSearch,
    clearJobProfiles,
    ensureJobProfileInOptions,

    // Fetch functions — used by JobPositionFormFields for reactive filtering
    fetchJobFunctions,
    fetchJobProfiles,

    // Mutations (Business Logic with built-in toasts and error handling)
    createJobPosition,
    updateJobPosition,
    deleteJobPosition,
    mutationLoading,

    refetch: loadReferenceData
  }
}
