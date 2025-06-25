import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { EmployeeFormValues, EmployeeContextState } from '../types';
import { useOrganizationalUnits } from '../hooks/useOrganizationalUnits';
import { useJobPositions } from '../hooks/useJobPositions';

const EmployeeContext = createContext<EmployeeContextState | undefined>(undefined);

export const useEmployeeContext = () => {
  const context = useContext(EmployeeContext);
  if (!context) {
    throw new Error('useEmployeeContext must be used within an EmployeeProvider');
  }
  return context;
};

export const EmployeeProvider: React.FC<{
  initialValues?: Partial<EmployeeFormValues>;
  isEdit?: boolean;
  accessToken: string;
  structureId: string;
  children: React.ReactNode;
}> = ({ initialValues = {}, isEdit = false, accessToken, structureId, children }) => {
  // Form state
  const [formValuesState, setFormValuesState] = useState<EmployeeFormValues>({
    firstName: '',
    lastName: '',
    email: '',
    organizationalUnitId: '',
    jobPositionId: '',
    ...initialValues,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search states
  const [organizationalUnitSearch, setOrganizationalUnitSearch] = useState<string | undefined>(undefined);
  const [jobPositionSearch, setJobPositionSearch] = useState<string | undefined>(undefined);

  // Refs to track current values to avoid infinite loops
  const currentOrgUnitRef = useRef<string | undefined>();
  const currentJobPositionRef = useRef<string | undefined>();

  // Organizational units hook
  const {
    organizationalUnits,
    loading: organizationalUnitsLoading,
    error: organizationalUnitsError,
    hasMore: hasMoreOrganizationalUnits,
    loadMore: loadMoreOrganizationalUnits,
    searchUnits: searchOrganizationalUnitsInternal,
    retry: retryOrganizationalUnits
  } = useOrganizationalUnits({ accessToken, structureId, search: organizationalUnitSearch });

  // Job positions hook - filtered by organizational unit
  const {
    jobPositions,
    allJobPositions,
    loading: jobPositionsLoading,
    error: jobPositionsError,
    hasMore: hasMoreJobPositions,
    loadMore: loadMoreJobPositions,
    searchPositions: searchJobPositionsInternal,
    retry: retryJobPositions
  } = useJobPositions({ 
    accessToken, 
    structureId, 
    organizationalUnitId: formValuesState.organizationalUnitId || undefined,
    search: jobPositionSearch 
  });

  // Debug logging
  useEffect(() => {
    console.log('EmployeeForm - Form Values:', formValuesState);
    console.log('EmployeeForm - Organizational Units:', {
      organizationalUnits,
      organizationalUnitsLoading,
      organizationalUnitsError,
      hasMoreOrganizationalUnits
    });
    console.log('EmployeeForm - Job Positions:', {
      jobPositions,
      jobPositionsLoading,
      jobPositionsError,
      hasMoreJobPositions,
      organizationalUnitId: formValuesState.organizationalUnitId
    });
  }, [formValuesState, organizationalUnits, organizationalUnitsLoading, organizationalUnitsError, hasMoreOrganizationalUnits, 
      jobPositions, jobPositionsLoading, jobPositionsError, hasMoreJobPositions]);

  // Search handlers
  const searchOrganizationalUnits = useCallback((searchTerm?: string) => {
    setOrganizationalUnitSearch(searchTerm);
    searchOrganizationalUnitsInternal(searchTerm);
  }, [searchOrganizationalUnitsInternal]);

  const searchJobPositions = useCallback((searchTerm?: string) => {
    setJobPositionSearch(searchTerm);
    searchJobPositionsInternal(searchTerm);
  }, [searchJobPositionsInternal]);

  // Auto-select organizational unit when job position is selected (only if no org unit is currently selected)
  useEffect(() => {
    const jobPositionId = formValuesState.jobPositionId;
    const organizationalUnitId = formValuesState.organizationalUnitId;
    
    // Only auto-select if job position changed and no org unit is selected
    if (currentJobPositionRef.current !== jobPositionId) {
      currentJobPositionRef.current = jobPositionId;
      
      if (jobPositionId && !organizationalUnitId) {
        const selectedJobPosition = allJobPositions.find(position => position.id === jobPositionId);
        if (selectedJobPosition && selectedJobPosition.organizationalUnitEmployees && selectedJobPosition.organizationalUnitEmployees.length > 0) {
          const orgUnit = selectedJobPosition.organizationalUnitEmployees[0].organizationalUnit;
          if (orgUnit) {
            console.log('Auto-selecting organizational unit:', orgUnit);
            // Find the org unit in the list to get the proper SelectOption format
            const orgUnitOption = organizationalUnits.find(unit => unit.id === orgUnit.id);
            if (orgUnitOption) {
              setFormValuesState(prev => ({ ...prev, organizationalUnitId: orgUnit.id }));
            }
          }
        }
      }
    }
  }, [formValuesState.jobPositionId, formValuesState.organizationalUnitId, allJobPositions, organizationalUnits]);

  // Clear job position when organizational unit is manually cleared
  useEffect(() => {
    const organizationalUnitId = formValuesState.organizationalUnitId;
    const jobPositionId = formValuesState.jobPositionId;
    
    // Only clear if org unit changed
    if (currentOrgUnitRef.current !== organizationalUnitId) {
      currentOrgUnitRef.current = organizationalUnitId;
      
      // If org unit is cleared and there's a job position, clear the job position
      if (!organizationalUnitId && jobPositionId) {
        console.log('Clearing job position because organizational unit was cleared');
        setFormValuesState(prev => ({ ...prev, jobPositionId: '' }));
      }
    }
  }, [formValuesState.organizationalUnitId, formValuesState.jobPositionId]);

  // Clear job position when organizational unit changes and the position doesn't belong to the new org unit
  useEffect(() => {
    const organizationalUnitId = formValuesState.organizationalUnitId;
    const jobPositionId = formValuesState.jobPositionId;
    
    if (organizationalUnitId && jobPositionId && allJobPositions.length > 0) {
      const selectedJobPosition = allJobPositions.find(position => position.id === jobPositionId);
      if (selectedJobPosition && selectedJobPosition.organizationalUnitEmployees) {
        const isPositionInOrgUnit = selectedJobPosition.organizationalUnitEmployees.some(
          (emp: any) => emp.organizationalUnit.id === organizationalUnitId
        );
        if (!isPositionInOrgUnit) {
          console.log('Clearing job position as it does not belong to selected organizational unit');
          setFormValuesState(prev => ({ ...prev, jobPositionId: '' }));
        }
      }
    }
  }, [formValuesState.organizationalUnitId, formValuesState.jobPositionId, allJobPositions]);

  // Update form values
  const setFormValues = useCallback((values: Partial<EmployeeFormValues>) => {
    setFormValuesState((prev) => ({ ...prev, ...values }));
  }, []);

  // Submit handler (create or update)
  const submit = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Replace with real API call
      console.log('Submitting employee:', formValuesState);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // Success logic here
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [formValuesState]);

  // Combine errors from different sources
  const combinedError = error || organizationalUnitsError || jobPositionsError;

  return (
    <EmployeeContext.Provider
      value={{
        formValues: formValuesState,
        setFormValues,
        organizationalUnits,
        jobPositions,
        allJobPositions,
        loading: loading || organizationalUnitsLoading || jobPositionsLoading,
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
        hasMoreJobPositions,
        jobPositionsError,
        jobPositionsLoading,
      }}
    >
      {children}
    </EmployeeContext.Provider>
  );
}; 