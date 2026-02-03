import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react'
import { EmployeeFormValues, EmployeeContextState } from '../types'
import { useOrganizationalUnits } from '../hooks/useOrganizationalUnits'
import { useJobPositions } from '../hooks/useJobPositions'
import { useEmploymentTypes } from '../hooks/useEmploymentTypes'
import { useContractTypes } from '../hooks/useContractTypes'

const EmployeeContext = createContext<EmployeeContextState | undefined>(undefined)

export const useEmployeeContext = () => {
  const context = useContext(EmployeeContext)
  if (!context) {
    throw new Error('useEmployeeContext must be used within an EmployeeProvider')
  }
  return context
}

export const EmployeeProvider: React.FC<{
  initialValues?: Partial<EmployeeFormValues>
  isEdit?: boolean
  accessToken: string
  structureId: string
  children: React.ReactNode
}> = ({ initialValues = {}, isEdit = false, accessToken, structureId, children }) => {
  // Form state
  const [formValuesState, setFormValuesState] = useState<EmployeeFormValues>({
    firstName: '',
    lastName: '',
    email: '',
    organizationalUnitId: '',
    jobPositionId: '',
    preferredName: '',
    employmentTypeId: '',
    contractTypeId: '',
    hireDate: '',
    fixedTermUntil: '',
    fixedTermReason: '',
    ...initialValues
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Search states
  const [organizationalUnitSearch, setOrganizationalUnitSearch] = useState<string | undefined>(undefined)
  const [jobPositionSearch, setJobPositionSearch] = useState<string | undefined>(undefined)

  // Refs to track current values to avoid infinite loops
  const currentOrgUnitRef = useRef<string | undefined>()
  const currentJobPositionRef = useRef<string | undefined>()

  // Organizational units hook
  const {
    organizationalUnits,
    loading: organizationalUnitsLoading,
    error: organizationalUnitsError,
    hasMore: hasMoreOrganizationalUnits,
    loadMore: loadMoreOrganizationalUnits,
    searchUnits: searchOrganizationalUnitsInternal
  } = useOrganizationalUnits({ accessToken, structureId, search: organizationalUnitSearch })

  // Job positions hook - filtered by organizational unit
  const {
    jobPositions,
    allJobPositions,
    loading: jobPositionsLoading,
    error: jobPositionsError,
    hasMore: hasMoreJobPositions,
    loadMore: loadMoreJobPositions,
    searchPositions: searchJobPositionsInternal,
    refetch: refetchJobPositions
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

  // Debug logging
  useEffect(() => {
    console.log('EmployeeForm - Form Values:', formValuesState)
    console.log('EmployeeForm - Organizational Units:', {
      organizationalUnits,
      organizationalUnitsLoading,
      organizationalUnitsError,
      hasMoreOrganizationalUnits
    })
    console.log('EmployeeForm - Job Positions:', {
      jobPositions,
      jobPositionsLoading,
      jobPositionsError,
      hasMoreJobPositions,
      organizationalUnitId: formValuesState.organizationalUnitId
    })
  }, [
    formValuesState,
    organizationalUnits,
    organizationalUnitsLoading,
    organizationalUnitsError,
    hasMoreOrganizationalUnits,
    jobPositions,
    jobPositionsLoading,
    jobPositionsError,
    hasMoreJobPositions
  ])

  // Search handlers
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

  // Auto-select organizational unit when job position is selected (only if no org unit is currently selected)
  useEffect(() => {
    const jobPositionId = formValuesState.jobPositionId
    const organizationalUnitId = formValuesState.organizationalUnitId

    // Only auto-select if job position changed and no org unit is selected
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
            console.log('Auto-selecting organizational unit:', orgUnit)
            // Find the org unit in the list to get the proper SelectOption format
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

        // Auto-select employment type if available and not already set
        if (selectedJobPosition.employmentType && !formValuesState.employmentTypeId) {
          updates.employmentTypeId = selectedJobPosition.employmentType.id
        }

        // Auto-select contract type if available and not already set
        if (selectedJobPosition.contractType && !formValuesState.contractTypeId) {
          updates.contractTypeId = selectedJobPosition.contractType.id
        }

        // Apply updates if any
        if (Object.keys(updates).length > 0) {
          console.log('Auto-selecting employment/contract types:', updates)
          setFormValuesState(prev => ({ ...prev, ...updates }))
        }
      }
    }
  }, [formValuesState.jobPositionId, formValuesState.employmentTypeId, formValuesState.contractTypeId, allJobPositions])

  // Clear job position when organizational unit is manually cleared
  useEffect(() => {
    const organizationalUnitId = formValuesState.organizationalUnitId
    const jobPositionId = formValuesState.jobPositionId

    // Only clear if org unit changed
    if (currentOrgUnitRef.current !== organizationalUnitId) {
      currentOrgUnitRef.current = organizationalUnitId

      // If org unit is cleared and there's a job position, clear the job position
      if (!organizationalUnitId && jobPositionId) {
        console.log('Clearing job position because organizational unit was cleared')
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
          console.log('Clearing job position as it does not belong to selected organizational unit')
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
      // Success logic here
    } catch (e: any) {
      setError(e.message || 'Unknown error')
    } finally {
      setLoading(false)
    }
  }, [formValuesState])

  // Combine errors from different sources
  const combinedError =
    error || organizationalUnitsError || jobPositionsError || employmentTypesError || contractTypesError

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
        loading:
          loading ||
          organizationalUnitsLoading ||
          jobPositionsLoading ||
          employmentTypesLoading ||
          contractTypesLoading,
        error: combinedError,
        submit,
        isEdit,
        accessToken,
        structureId,
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
