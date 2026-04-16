import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'
import { JobPositionFormValues, JobPositionContextState, SelectOption } from '../types'
import { useJobProfiles } from '../hooks/useJobProfiles'
import { useOrganizationalUnits } from '../hooks/useOrganizationalUnits'
import { useJobFamilies } from '../hooks/useJobFamilies'
import { useJobFunctions } from '../hooks/useJobFunctions'
import { useJobLevelGroups } from '../hooks/useJobLevelGroups'
import { useJobLevels } from '../hooks/useJobLevels'
// import { useEmploymentTypes } from '../hooks/useEmploymentTypes';
// import { useContractTypes } from '../hooks/useContractTypes';
import { useGetJobPositionById } from '../queries/JobPositionQueries'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

const JobPositionContext = createContext<JobPositionContextState | undefined>(undefined)

export const useJobPositionContext = () => {
  const ctx = useContext(JobPositionContext)
  if (!ctx) throw new Error('useJobPositionContext must be used within JobPositionProvider')
  return ctx
}

export const JobPositionProvider: React.FC<{
  initialValues?: Partial<JobPositionFormValues>
  accessToken: string
  userInfo?: BusinessAppContextProps['userInfo']
  additionalData?: BusinessAppContextProps['additionalData']
  structureId: string
  children: React.ReactNode
}> = ({ initialValues = {}, accessToken, additionalData, structureId, children }) => {
  const [formValues, setFormValuesState] = useState<JobPositionFormValues>({
    name: '',
    jobProfileId: undefined, // Now optional
    jobFamilyId: '',
    jobFunctionId: '',
    jobLevelGroupId: undefined, // Made optional - auto-selected from job function
    jobLevelId: undefined, // Made optional - not shown in form
    organizationalUnitId: '',
    employmentTypeId: undefined, // Made optional - not shown in form
    contractTypeId: undefined, // Made optional - not shown in form
    ...initialValues
  })

  // State for managing job position loading
  const [isLoadingJobPosition, setIsLoadingJobPosition] = useState(false)
  const [loadedJobPositionId, setLoadedJobPositionId] = useState<string | null>(null)

  // State for managing job profile search
  const [jobProfileSearch, setJobProfileSearch] = useState<string | undefined>(undefined)

  // State for managing organizational unit search
  const [organizationalUnitSearch, setOrganizationalUnitSearch] = useState<string | undefined>(undefined)

  // Hook for fetching job position by ID
  const { fetchJobPosition } = useGetJobPositionById(accessToken)

  // Extract jobPositionId from flow context structure or direct prop
  const extractJobPositionIdFromContext = (data: any): string | null => {
    // Method 1: Direct ID in additionalData
    if (data?.id) {
      return data.id
    }

    // Method 2: Extract from Kogito task payload structure
    if (data?.psi_taskPayload?.psi_initialParameters?.jobPositionId) {
      return data.psi_taskPayload.psi_initialParameters.jobPositionId
    }

    // Method 3: Check if additionalData has the context data ID as a key (legacy flow context)
    if (data?.flowItems) {
      const saveFlow = data.flowItems.find(
        (item: any) => item.processName === 'saveJobPosition' && item.context?.contextName === 'jobPositionEntity'
      )

      if (saveFlow?.context?.contextData) {
        const jobPositionContext = saveFlow.context.contextData.find(
          (ctx: any) => ctx.contextDataName === 'jobPositionId' && ctx.mainContext === true
        )

        if (jobPositionContext?.id && data[jobPositionContext.id]) {
          return data[jobPositionContext.id]
        }
      }
    }

    return null
  }

  const jobPositionId = extractJobPositionIdFromContext(additionalData)
  const isEdit = !!jobPositionId

  // Use the job profiles hook with search parameter
  const {
    jobProfiles,
    allJobProfiles,
    loading: jobProfilesLoading,
    error: jobProfilesError,
    hasMore: hasMoreJobProfiles,
    loadMore: loadMoreJobProfiles,
    searchProfiles: searchJobProfilesInternal
  } = useJobProfiles({
    accessToken,
    search: jobProfileSearch,
    enabled: true,
    jobFunctionId: formValues.jobFunctionId || undefined
  })

  // Use the organizational units hook with search parameter
  const {
    organizationalUnits,
    loading: organizationalUnitsLoading,
    error: organizationalUnitsError,
    hasMore: hasMoreOrganizationalUnits,
    loadMore: loadMoreOrganizationalUnits
  } = useOrganizationalUnits({ accessToken, structureId, search: organizationalUnitSearch })

  // Debug logging removed for performance

  // Wrapper function for job profile search that updates the search state
  const searchJobProfiles = useCallback(
    (searchTerm?: string) => {
      setJobProfileSearch(searchTerm)
      searchJobProfilesInternal(searchTerm)
    },
    [searchJobProfilesInternal]
  )

  // Wrapper function for organizational unit search that updates the search state (hook refetches when `search` changes)
  const searchOrganizationalUnits = useCallback((searchTerm?: string) => {
    setOrganizationalUnitSearch(searchTerm)
  }, [])

  // Use real hooks for job families, functions, level groups, and levels
  const {
    jobFamilies,
    loading: jobFamiliesLoading,
    error: jobFamiliesError,
    hasMore: hasMoreJobFamilies,
    searchJobFamilies: searchJobFamiliesInternal,
    loadMoreJobFamilies
  } = useJobFamilies({ accessToken })

  const {
    jobFunctions,
    allJobFunctions,
    loading: jobFunctionsLoading,
    error: jobFunctionsError,
    hasMore: hasMoreJobFunctions,
    searchJobFunctions: searchJobFunctionsInternal,
    loadMoreJobFunctions,
    fetchJobFunctionsByFamily
  } = useJobFunctions({ accessToken })

  // Lazy load job level groups - only load if needed
  const {
    jobLevelGroups,
    loading: jobLevelGroupsLoading,
    error: jobLevelGroupsError,
    hasMore: hasMoreJobLevelGroups,
    searchJobLevelGroups: searchJobLevelGroupsInternal,
    loadMoreJobLevelGroups
  } = useJobLevelGroups({ accessToken })

  const {
    jobLevels,
    allJobLevels,
    loading: jobLevelsLoading,
    error: jobLevelsError,
    hasMore: hasMoreJobLevels,
    searchJobLevels: searchJobLevelsInternal,
    loadMoreJobLevels,
    fetchJobLevelsByGroup
  } = useJobLevels({ accessToken })

  // PERFORMANCE: Disabled - these fields are not displayed in the form UI
  // const {
  //   employmentTypes,
  //   loading: employmentTypesLoading,
  //   error: employmentTypesError,
  //   hasMore: hasMoreEmploymentTypes,
  //   searchEmploymentTypes: searchEmploymentTypesInternal,
  //   loadMoreEmploymentTypes
  // } = useEmploymentTypes(accessToken);

  // const {
  //   contractTypes,
  //   loading: contractTypesLoading,
  //   error: contractTypesError,
  //   hasMore: hasMoreContractTypes,
  //   searchContractTypes: searchContractTypesInternal,
  //   loadMoreContractTypes
  // } = useContractTypes(accessToken);

  // Default empty arrays for disabled hooks
  const employmentTypes: SelectOption[] = []
  const contractTypes: SelectOption[] = []
  const employmentTypesLoading = false
  const contractTypesLoading = false
  const employmentTypesError = null
  const contractTypesError = null
  const hasMoreEmploymentTypes = false
  const hasMoreContractTypes = false
  const searchEmploymentTypesInternal = () => {}
  const searchContractTypesInternal = () => {}
  const loadMoreEmploymentTypes = () => {}
  const loadMoreContractTypes = () => {}

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load existing job position data when jobPositionId is provided
  useEffect(() => {
    // Only load if we have a jobPositionId, accessToken, isEdit is true, and we haven't already loaded this specific job position
    if (jobPositionId && accessToken && isEdit && loadedJobPositionId !== jobPositionId) {
      setIsLoadingJobPosition(true)
      setError(null)

      fetchJobPosition(jobPositionId)
        .then(jobPositionData => {
          if (jobPositionData) {
            const updates: Partial<JobPositionFormValues> = {
              id: jobPositionData.id,
              name: jobPositionData.name,
              version: jobPositionData.version,
              jobProfileId: jobPositionData.jobProfile?.id || undefined, // Set to undefined if not present
              jobFunctionId: jobPositionData.jobFunction?.id || '',
              jobFamilyId: jobPositionData.jobFunction?.jobFamily?.id || '',
              jobLevelId: jobPositionData.jobLevel?.id || undefined, // Optional - not shown in form
              jobLevelGroupId: jobPositionData.jobLevel?.jobLevelGroup?.id || undefined, // Optional - auto-selected
              contractTypeId: jobPositionData.contractType?.id || undefined, // Optional - not shown in form
              employmentTypeId: jobPositionData.employmentType?.id || undefined, // Optional - not shown in form
              organizationalUnitId: jobPositionData.organizationalUnitEmployees?.[0]?.organizationalUnit?.id || ''
            }

            setFormValuesState(prev => ({ ...prev, ...updates }))
            setLoadedJobPositionId(jobPositionId) // Mark this job position as loaded
          }
        })
        .catch(err => {
          console.error('❌ Error loading job position:', err)
          setError('Failed to load job position data')
        })
        .finally(() => {
          setIsLoadingJobPosition(false)
        })
    } else if (!jobPositionId || !isEdit) {
      // Reset the loaded job position ID when not in edit mode or no job position ID
      setLoadedJobPositionId(null)
    }
  }, [jobPositionId, accessToken, isEdit, loadedJobPositionId])

  // Wrapper functions for the new search methods
  const searchJobFamilies = useCallback(
    (searchTerm: string) => {
      searchJobFamiliesInternal(searchTerm)
    },
    [searchJobFamiliesInternal]
  )

  const searchJobFunctions = useCallback(
    (searchTerm: string) => {
      searchJobFunctionsInternal(searchTerm)
    },
    [searchJobFunctionsInternal]
  )

  const searchJobLevelGroups = useCallback(
    (searchTerm: string) => {
      searchJobLevelGroupsInternal(searchTerm)
    },
    [searchJobLevelGroupsInternal]
  )

  const searchJobLevels = useCallback(
    (searchTerm: string) => {
      searchJobLevelsInternal(searchTerm)
    },
    [searchJobLevelsInternal]
  )

  const searchEmploymentTypes = useCallback(() => {
    searchEmploymentTypesInternal()
  }, [searchEmploymentTypesInternal])

  const searchContractTypes = useCallback(() => {
    searchContractTypesInternal()
  }, [searchContractTypesInternal])

  // Fetch job functions when job family changes
  const fetchJobFunctions = useCallback(
    (jobFamilyId: string) => {
      if (jobFamilyId) {
        fetchJobFunctionsByFamily(jobFamilyId)
      } else {
        // Load all job functions when no family filter
        searchJobFunctionsInternal('')
      }
    },
    [fetchJobFunctionsByFamily, searchJobFunctionsInternal]
  )

  // Fetch job levels when job level group changes
  const fetchJobLevels = useCallback(
    (jobLevelGroupId: string) => {
      if (jobLevelGroupId) {
        fetchJobLevelsByGroup(jobLevelGroupId)
      } else {
        // Load all job levels when no group filter
        searchJobLevelsInternal('')
      }
    },
    [fetchJobLevelsByGroup, searchJobLevelsInternal]
  )

  // Initial load only for job levels (job functions load when family is selected)
  useEffect(() => {
    if (accessToken) {
      searchJobLevelsInternal('')
    }
  }, [accessToken, searchJobLevelsInternal])

  // Fetch job functions when job family changes
  useEffect(() => {
    if (accessToken && formValues.jobFamilyId) {
      fetchJobFunctions(formValues.jobFamilyId)
    }
  }, [accessToken, formValues.jobFamilyId, fetchJobFunctions])

  // Update form values
  const setFormValues = (values: Partial<JobPositionFormValues>) => {
    setFormValuesState(prev => ({ ...prev, ...values }))
  }

  // Submit handler (create or update)
  const submit = async () => {
    setLoading(true)
    setError(null)
    try {
      // Just handle the loading state - the actual dispatch is handled by the form component

      // TODO: Replace with real API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      // Success logic here
    } catch (e: any) {
      setError(e.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  // Combine errors from different sources
  const combinedError =
    error ||
    jobProfilesError ||
    organizationalUnitsError ||
    jobFamiliesError ||
    jobFunctionsError ||
    jobLevelGroupsError ||
    jobLevelsError ||
    employmentTypesError ||
    contractTypesError

  return (
    <JobPositionContext.Provider
      value={{
        formValues,
        setFormValues,
        jobProfiles,
        allJobProfiles,
        jobFamilies,
        jobFunctions,
        allJobFunctions,
        jobLevelGroups,
        jobLevels,
        allJobLevels,
        organizationalUnits,
        employmentTypes,
        contractTypes,
        loading: useMemo(
          () =>
            loading ||
            isLoadingJobPosition ||
            organizationalUnitsLoading ||
            jobFamiliesLoading ||
            jobFunctionsLoading ||
            jobLevelGroupsLoading ||
            jobLevelsLoading,
          [
            loading,
            isLoadingJobPosition,
            organizationalUnitsLoading,
            jobFamiliesLoading,
            jobFunctionsLoading,
            jobLevelGroupsLoading,
            jobLevelsLoading
          ]
        ),
        error: combinedError,
        fetchJobFunctions,
        fetchJobLevels,
        submit,
        isEdit,
        accessToken,
        structureId,
        // Job profile specific methods
        searchJobProfiles,
        loadMoreJobProfiles,
        hasMoreJobProfiles,
        jobProfilesError,
        jobProfilesLoading,
        // Organizational unit specific methods
        searchOrganizationalUnits,
        loadMoreOrganizationalUnits,
        hasMoreOrganizationalUnits,
        organizationalUnitsError,
        organizationalUnitsLoading,
        // Job family specific methods
        searchJobFamilies,
        loadMoreJobFamilies,
        hasMoreJobFamilies,
        jobFamiliesError,
        jobFamiliesLoading,
        // Job function specific methods
        searchJobFunctions,
        loadMoreJobFunctions,
        hasMoreJobFunctions,
        jobFunctionsError,
        jobFunctionsLoading,
        // Job level group specific methods
        searchJobLevelGroups,
        loadMoreJobLevelGroups,
        hasMoreJobLevelGroups,
        jobLevelGroupsError,
        jobLevelGroupsLoading,
        // Job level specific methods
        searchJobLevels,
        loadMoreJobLevels,
        hasMoreJobLevels,
        jobLevelsError,
        jobLevelsLoading,
        // Employment type specific methods
        searchEmploymentTypes,
        loadMoreEmploymentTypes,
        hasMoreEmploymentTypes,
        employmentTypesError,
        employmentTypesLoading,
        // Contract type specific methods
        searchContractTypes,
        loadMoreContractTypes,
        hasMoreContractTypes,
        contractTypesError,
        contractTypesLoading
      }}
    >
      {children}
    </JobPositionContext.Provider>
  )
}
