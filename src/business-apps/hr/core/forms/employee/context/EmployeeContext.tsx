import React, { createContext, useContext, useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { EmployeeFormValues, EmployeeContextState } from '../types'
import { useOrganizationalUnits } from '../hooks/useOrganizationalUnits'
import { useOrgUnitById } from '../hooks/useOrgUnitById'
import { useJobPositions } from '../hooks/useJobPositions'
import { useEmploymentTypes } from '../hooks/useEmploymentTypes'
import { useContractTypes } from '../hooks/useContractTypes'
import { useLegalEntities } from '../hooks/useLegalEntities'
import { useSiteLocations } from '../hooks/useSiteLocations'
import { useCostCenters } from '../hooks/useCostCenters'

const EmployeeContext = createContext<EmployeeContextState | undefined>(undefined)

export const useEmployeeContext = () => {
  const context = useContext(EmployeeContext)
  if (!context) {
    throw new Error('useEmployeeContext must be used within an EmployeeProvider')
  }
  return context
}

export const EmployeeProvider: React.FC<{
  targetOrgUnitId?: string
  targetJobPositionId?: string
  initialValues?: Partial<EmployeeFormValues>
  isEdit?: boolean
  accessToken: string
  structureId: string
  children: React.ReactNode
}> = ({
  targetOrgUnitId,
  targetJobPositionId,
  initialValues = {},
  isEdit = false,
  accessToken,
  structureId,
  children
}) => {
  const [formValuesState, setFormValuesState] = useState<EmployeeFormValues>(() => ({
    firstName: '',
    lastName: '',
    email: '',
    legalEntityId: '',
    siteLocationId: '',
    costCenterId: '',
    organizationalUnitId: '',
    jobPositionId: '',
    preferredName: '',
    employmentTypeId: '',
    contractTypeId: '',
    hireDate: '',
    fixedTermUntil: '',
    fixedTermReason: '',
    ...initialValues,
    ...(targetOrgUnitId != null && targetOrgUnitId !== '' ? { organizationalUnitId: targetOrgUnitId } : {}),
    ...(targetJobPositionId != null && targetJobPositionId !== '' ? { jobPositionId: targetJobPositionId } : {})
  }))

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Search states
  const [organizationalUnitSearch, setOrganizationalUnitSearch] = useState<string | undefined>(undefined)
  const [jobPositionSearch, setJobPositionSearch] = useState<string | undefined>(undefined)
  const [legalEntitySearch, setLegalEntitySearch] = useState<string | undefined>(undefined)
  const [siteLocationSearch, setSiteLocationSearch] = useState<string | undefined>(undefined)
  const [costCenterSearch, setCostCenterSearch] = useState<string | undefined>(undefined)

  // Refs to track current values to avoid infinite loops
  const currentOrgUnitRef = useRef<string | undefined>()
  const currentJobPositionRef = useRef<string | undefined>()

  // Legal entities hook
  const {
    legalEntities,
    loading: legalEntitiesLoading,
    error: legalEntitiesError,
    hasMore: hasMoreLegalEntities,
    loadMore: loadMoreLegalEntities,
    searchLegalEntities: searchLegalEntitiesInternal
  } = useLegalEntities({ accessToken, structureId, search: legalEntitySearch })

  // Site locations hook — enabled only when a legal entity is selected
  const {
    siteLocations,
    loading: siteLocationsLoading,
    error: siteLocationsError,
    hasMore: hasMoreSiteLocations,
    loadMore: loadMoreSiteLocations,
    searchSiteLocations: searchSiteLocationsInternal
  } = useSiteLocations({
    accessToken,
    structureId,
    search: siteLocationSearch,
    enabled: !!formValuesState.legalEntityId
  })

  // Cost centers hook
  const {
    costCenters,
    loading: costCentersLoading,
    error: costCentersError,
    hasMore: hasMoreCostCenters,
    loadMore: loadMoreCostCenters,
    searchCostCenters: searchCostCentersInternal
  } = useCostCenters({ accessToken, structureId, search: costCenterSearch })

  // Organizational units hook
  const {
    organizationalUnits: organizationalUnitsFromHook,
    loading: organizationalUnitsLoading,
    error: organizationalUnitsError,
    hasMore: hasMoreOrganizationalUnits,
    loadMore: loadMoreOrganizationalUnits,
    searchUnits: searchOrganizationalUnitsInternal
  } = useOrganizationalUnits({ accessToken, structureId, search: organizationalUnitSearch })

  const { orgUnit: targetOrgUnitOption } = useOrgUnitById({
    accessToken,
    orgUnitId: targetOrgUnitId,
    structureId
  })

  const organizationalUnits = useMemo(() => {
    if (!targetOrgUnitOption?.id) return organizationalUnitsFromHook
    const alreadyInList = organizationalUnitsFromHook.some(u => u.id === targetOrgUnitOption.id)
    if (alreadyInList) return organizationalUnitsFromHook
    return [targetOrgUnitOption, ...organizationalUnitsFromHook]
  }, [organizationalUnitsFromHook, targetOrgUnitOption])

  const {
    jobPositions,
    allJobPositions,
    loading: jobPositionsLoading,
    error: jobPositionsError,
    hasMore: hasMoreJobPositions,
    loadMore: loadMoreJobPositions,
    searchPositions: searchJobPositionsInternal,
    refetch: refetchJobPositions,
    initialLoadDone: jobPositionsInitialLoadDone
  } = useJobPositions({
    accessToken,
    structureId,
    organizationalUnitId: formValuesState.organizationalUnitId || undefined,
    search: jobPositionSearch
  })

  // Employment types hook
  const {
    employmentTypes,
    loading: employmentTypesLoading,
    error: employmentTypesError,
    hasMore: hasMoreEmploymentTypes,
    searchEmploymentTypes: searchEmploymentTypesInternal,
    loadMoreEmploymentTypes
  } = useEmploymentTypes(accessToken)

  // Contract types hook
  const {
    contractTypes,
    loading: contractTypesLoading,
    error: contractTypesError,
    hasMore: hasMoreContractTypes,
    searchContractTypes: searchContractTypesInternal,
    loadMoreContractTypes
  } = useContractTypes(accessToken)

  // Search handlers
  const searchLegalEntities = useCallback(
    (searchTerm?: string) => {
      setLegalEntitySearch(searchTerm)
      searchLegalEntitiesInternal(searchTerm)
    },
    [searchLegalEntitiesInternal]
  )

  const searchSiteLocations = useCallback(
    (searchTerm?: string) => {
      setSiteLocationSearch(searchTerm)
      searchSiteLocationsInternal(searchTerm)
    },
    [searchSiteLocationsInternal]
  )

  const searchCostCenters = useCallback(
    (searchTerm?: string) => {
      setCostCenterSearch(searchTerm)
      searchCostCentersInternal(searchTerm)
    },
    [searchCostCentersInternal]
  )

  const searchOrganizationalUnits = useCallback(
    (searchTerm?: string) => {
      setOrganizationalUnitSearch(searchTerm)
      searchOrganizationalUnitsInternal(searchTerm)
    },
    [searchOrganizationalUnitsInternal]
  )

  const searchJobPositions = useCallback(
    (searchTerm?: string) => {
      setJobPositionSearch(searchTerm)
      searchJobPositionsInternal(searchTerm)
    },
    [searchJobPositionsInternal]
  )

  const searchEmploymentTypes = useCallback(
    (searchTerm?: string) => {
      searchEmploymentTypesInternal(searchTerm)
    },
    [searchEmploymentTypesInternal]
  )

  const searchContractTypes = useCallback(
    (searchTerm?: string) => {
      searchContractTypesInternal(searchTerm)
    },
    [searchContractTypesInternal]
  )

  // Clear site location when legal entity is cleared
  useEffect(() => {
    if (!formValuesState.legalEntityId && formValuesState.siteLocationId) {
      setFormValuesState(prev => ({ ...prev, siteLocationId: '' }))
    }
  }, [formValuesState.legalEntityId, formValuesState.siteLocationId])

  // Auto-select organizational unit when job position is selected (only if no org unit is currently selected)
  useEffect(() => {
    const jobPositionId = formValuesState.jobPositionId
    const organizationalUnitId = formValuesState.organizationalUnitId

    if (currentJobPositionRef.current !== jobPositionId) {
      currentJobPositionRef.current = jobPositionId

      if (jobPositionId && !organizationalUnitId) {
        const selectedJobPosition = allJobPositions.find(position => position.id === jobPositionId)
        if (
          selectedJobPosition &&
          selectedJobPosition.organizationalUnitEmployees &&
          selectedJobPosition.organizationalUnitEmployees.length > 0
        ) {
          const orgUnit = selectedJobPosition.organizationalUnitEmployees[0].organizationalUnit
          if (orgUnit) {
            const orgUnitOption = organizationalUnits.find(unit => unit.id === orgUnit.id)
            if (orgUnitOption) {
              setFormValuesState(prev => ({ ...prev, organizationalUnitId: orgUnit.id }))
            }
          }
        }
      }
    }
  }, [formValuesState.jobPositionId, formValuesState.organizationalUnitId, allJobPositions, organizationalUnits])

  // Auto-select employment type and contract type when job position is selected
  useEffect(() => {
    const jobPositionId = formValuesState.jobPositionId

    if (jobPositionId) {
      const selectedJobPosition = allJobPositions.find(position => position.id === jobPositionId)
      if (selectedJobPosition) {
        const updates: Partial<EmployeeFormValues> = {}

        if (selectedJobPosition.employmentType && !formValuesState.employmentTypeId) {
          updates.employmentTypeId = selectedJobPosition.employmentType.id
        }

        if (selectedJobPosition.contractType && !formValuesState.contractTypeId) {
          updates.contractTypeId = selectedJobPosition.contractType.id
        }

        if (Object.keys(updates).length > 0) {
          setFormValuesState(prev => ({ ...prev, ...updates }))
        }
      }
    }
  }, [formValuesState.jobPositionId, formValuesState.employmentTypeId, formValuesState.contractTypeId, allJobPositions])

  // Clear job position when organizational unit is manually cleared
  useEffect(() => {
    const organizationalUnitId = formValuesState.organizationalUnitId
    const jobPositionId = formValuesState.jobPositionId

    if (currentOrgUnitRef.current !== organizationalUnitId) {
      currentOrgUnitRef.current = organizationalUnitId

      if (!organizationalUnitId && jobPositionId) {
        setFormValuesState(prev => ({ ...prev, jobPositionId: '' }))
      }
    }
  }, [formValuesState.organizationalUnitId, formValuesState.jobPositionId])

  // Clear job position when organizational unit changes and the position doesn't belong to the new org unit
  useEffect(() => {
    const organizationalUnitId = formValuesState.organizationalUnitId
    const jobPositionId = formValuesState.jobPositionId

    if (organizationalUnitId && jobPositionId && allJobPositions.length > 0) {
      const selectedJobPosition = allJobPositions.find(position => position.id === jobPositionId)
      if (selectedJobPosition && selectedJobPosition.organizationalUnitEmployees) {
        const isPositionInOrgUnit = selectedJobPosition.organizationalUnitEmployees.some(
          (emp: any) => emp.organizationalUnit.id === organizationalUnitId
        )
        if (!isPositionInOrgUnit) {
          setFormValuesState(prev => ({ ...prev, jobPositionId: '' }))
        }
      }
    }
  }, [formValuesState.organizationalUnitId, formValuesState.jobPositionId, allJobPositions])

  // Update form values
  const setFormValues = useCallback((values: Partial<EmployeeFormValues>) => {
    setFormValuesState(prev => ({ ...prev, ...values }))
  }, [])

  // Submit handler (create or update)
  const submit = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      // TODO: Replace with real API call
      console.log('Submitting employee:', formValuesState)
      await new Promise(resolve => setTimeout(resolve, 1000))
    } catch (e: any) {
      setError(e.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [formValuesState])

  // Combine errors from different sources
  const combinedError =
    error ||
    legalEntitiesError ||
    siteLocationsError ||
    costCentersError ||
    organizationalUnitsError ||
    jobPositionsError ||
    employmentTypesError ||
    contractTypesError

  return (
    <EmployeeContext.Provider
      value={{
        formValues: formValuesState,
        setFormValues,
        organizationalUnits,
        jobPositions,
        allJobPositions,
        employmentTypes,
        contractTypes,
        legalEntities,
        siteLocations,
        costCenters,
        loading:
          loading ||
          legalEntitiesLoading ||
          siteLocationsLoading ||
          costCentersLoading ||
          organizationalUnitsLoading ||
          jobPositionsLoading ||
          employmentTypesLoading ||
          contractTypesLoading,
        error: combinedError,
        submit,
        isEdit,
        accessToken,
        structureId,
        // Legal entity specific methods
        searchLegalEntities,
        loadMoreLegalEntities,
        hasMoreLegalEntities,
        legalEntitiesError,
        legalEntitiesLoading,
        // Site location specific methods
        searchSiteLocations,
        loadMoreSiteLocations,
        hasMoreSiteLocations,
        siteLocationsError,
        siteLocationsLoading,
        // Cost center specific methods
        searchCostCenters,
        loadMoreCostCenters,
        hasMoreCostCenters,
        costCentersError,
        costCentersLoading,
        // Organizational unit specific methods
        searchOrganizationalUnits,
        loadMoreOrganizationalUnits,
        hasMoreOrganizationalUnits,
        organizationalUnitsError,
        organizationalUnitsLoading,
        // Job position specific methods
        searchJobPositions,
        loadMoreJobPositions,
        refetchJobPositions,
        hasMoreJobPositions,
        jobPositionsError,
        jobPositionsLoading,
        jobPositionsInitialLoadDone,
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
    </EmployeeContext.Provider>
  )
}
