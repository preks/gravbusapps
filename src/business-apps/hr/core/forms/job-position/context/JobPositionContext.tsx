import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { JobPositionFormValues, SelectOption, JobPositionContextState } from '../types';
import { useJobProfiles } from '../hooks/useJobProfiles';
import { useOrganizationalUnits } from '../hooks/useOrganizationalUnits';
import { useJobFamilies } from '../hooks/useJobFamilies';
import { useJobFunctions } from '../hooks/useJobFunctions';
import { useJobLevelGroups } from '../hooks/useJobLevelGroups';
import { useJobLevels } from '../hooks/useJobLevels';
import { useEmploymentTypes } from '../hooks/useEmploymentTypes';
import { useContractTypes } from '../hooks/useContractTypes';

const JobPositionContext = createContext<JobPositionContextState | undefined>(undefined);

export const useJobPositionContext = () => {
  const ctx = useContext(JobPositionContext);
  if (!ctx) throw new Error('useJobPositionContext must be used within JobPositionProvider');
  return ctx;
};

export const JobPositionProvider: React.FC<{
  initialValues?: Partial<JobPositionFormValues>;
  isEdit?: boolean;
  accessToken: string;
  structureId: string;
  children: React.ReactNode;
}> = ({ initialValues = {}, isEdit = false, accessToken, structureId, children }) => {
  const [formValues, setFormValuesState] = useState<JobPositionFormValues>({
    name: '',
    jobProfileId: '',
    jobFamilyId: '',
    jobFunctionId: '',
    jobLevelGroupId: '',
    jobLevelId: '',
    organizationalUnitId: '',
    employmentTypeId: '',
    contractTypeId: '',
    ...initialValues,
  });
  
  // State for managing job profile search
  const [jobProfileSearch, setJobProfileSearch] = useState<string | undefined>(undefined);
  
  // State for managing organizational unit search
  const [organizationalUnitSearch, setOrganizationalUnitSearch] = useState<string | undefined>(undefined);
  
  // Use the job profiles hook with search parameter
  const {
    jobProfiles,
    allJobProfiles,
    loading: jobProfilesLoading,
    error: jobProfilesError,
    hasMore: hasMoreJobProfiles,
    loadMore: loadMoreJobProfiles,
    searchProfiles: searchJobProfilesInternal
  } = useJobProfiles({ accessToken, search: jobProfileSearch });

  // Use the organizational units hook with search parameter
  const {
    organizationalUnits,
    loading: organizationalUnitsLoading,
    error: organizationalUnitsError,
    hasMore: hasMoreOrganizationalUnits,
    loadMore: loadMoreOrganizationalUnits,
    searchUnits: searchOrganizationalUnitsInternal,
    retry: retryOrganizationalUnits
  } = useOrganizationalUnits({ accessToken, structureId, search: organizationalUnitSearch });

  // Debug organizational units in context
  useEffect(() => {
    console.log('JobPositionContext - Organizational Units State:', {
      accessToken: !!accessToken,
      structureId,
      organizationalUnitSearch,
      organizationalUnits,
      organizationalUnitsLoading,
      organizationalUnitsError,
      hasMoreOrganizationalUnits
    });
  }, [accessToken, structureId, organizationalUnitSearch, organizationalUnits, organizationalUnitsLoading, organizationalUnitsError, hasMoreOrganizationalUnits]);

  // Wrapper function for job profile search that updates the search state
  const searchJobProfiles = useCallback((searchTerm?: string) => {
    console.log('Searching job profiles with term:', searchTerm);
    setJobProfileSearch(searchTerm);
    searchJobProfilesInternal(searchTerm);
  }, [searchJobProfilesInternal]);

  // Wrapper function for organizational unit search that updates the search state
  const searchOrganizationalUnits = useCallback((searchTerm?: string) => {
    console.log('Searching organizational units with term:', searchTerm);
    setOrganizationalUnitSearch(searchTerm);
    searchOrganizationalUnitsInternal(searchTerm);
  }, [searchOrganizationalUnitsInternal]);

  // Use real hooks for job families, functions, level groups, and levels
  const {
    jobFamilies,
    loading: jobFamiliesLoading,
    error: jobFamiliesError,
    hasMore: hasMoreJobFamilies,
    searchJobFamilies: searchJobFamiliesInternal,
    loadMoreJobFamilies
  } = useJobFamilies({ accessToken });

  const {
    jobFunctions,
    allJobFunctions,
    loading: jobFunctionsLoading,
    error: jobFunctionsError,
    hasMore: hasMoreJobFunctions,
    searchJobFunctions: searchJobFunctionsInternal,
    loadMoreJobFunctions,
    fetchJobFunctionsByFamily
  } = useJobFunctions({ accessToken });

  const {
    jobLevelGroups,
    loading: jobLevelGroupsLoading,
    error: jobLevelGroupsError,
    hasMore: hasMoreJobLevelGroups,
    searchJobLevelGroups: searchJobLevelGroupsInternal,
    loadMoreJobLevelGroups
  } = useJobLevelGroups({ accessToken });

  const {
    jobLevels,
    allJobLevels,
    loading: jobLevelsLoading,
    error: jobLevelsError,
    hasMore: hasMoreJobLevels,
    searchJobLevels: searchJobLevelsInternal,
    loadMoreJobLevels,
    fetchJobLevelsByGroup
  } = useJobLevels({ accessToken });

  const {
    employmentTypes,
    loading: employmentTypesLoading,
    error: employmentTypesError,
    hasMore: hasMoreEmploymentTypes,
    searchEmploymentTypes: searchEmploymentTypesInternal,
    loadMoreEmploymentTypes
  } = useEmploymentTypes(accessToken);

  const {
    contractTypes,
    loading: contractTypesLoading,
    error: contractTypesError,
    hasMore: hasMoreContractTypes,
    searchContractTypes: searchContractTypesInternal,
    loadMoreContractTypes
  } = useContractTypes(accessToken);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wrapper functions for the new search methods
  const searchJobFamilies = useCallback((searchTerm: string) => {
    searchJobFamiliesInternal(searchTerm);
  }, [searchJobFamiliesInternal]);

  const searchJobFunctions = useCallback((searchTerm: string) => {
    searchJobFunctionsInternal(searchTerm);
  }, [searchJobFunctionsInternal]);

  const searchJobLevelGroups = useCallback((searchTerm: string) => {
    searchJobLevelGroupsInternal(searchTerm);
  }, [searchJobLevelGroupsInternal]);

  const searchJobLevels = useCallback((searchTerm: string) => {
    searchJobLevelsInternal(searchTerm);
  }, [searchJobLevelsInternal]);

  const searchEmploymentTypes = useCallback((searchTerm: string) => {
    searchEmploymentTypesInternal(searchTerm);
  }, [searchEmploymentTypesInternal]);

  const searchContractTypes = useCallback((searchTerm: string) => {
    searchContractTypesInternal(searchTerm);
  }, [searchContractTypesInternal]);



  // Auto-fill fields when job profile is selected
  useEffect(() => {
    if (formValues.jobProfileId) {
      const selectedProfile = allJobProfiles.find(profile => profile.id === formValues.jobProfileId);
      if (selectedProfile) {
        console.log('Selected job profile:', selectedProfile);
        
        // Auto-fill based on job profile data
        const updates: Partial<JobPositionFormValues> = {};
        
        // Set job level and job level group based on the selected profile
        if (selectedProfile.jobLevel) {
          updates.jobLevelId = selectedProfile.jobLevel.id;
          
          if (selectedProfile.jobLevel.jobLevelGroup) {
            updates.jobLevelGroupId = selectedProfile.jobLevel.jobLevelGroup.id;
          }
        }
        
        // Set job function and job family based on the selected profile
        if (selectedProfile.jobFunction) {
          updates.jobFunctionId = selectedProfile.jobFunction.id;
          
          if (selectedProfile.jobFunction.jobFamily) {
            updates.jobFamilyId = selectedProfile.jobFunction.jobFamily.id;
          }
          
          // Also set job level group from job function if not already set from job level
          if (!updates.jobLevelGroupId && selectedProfile.jobFunction.jobLevelGroup) {
            updates.jobLevelGroupId = selectedProfile.jobFunction.jobLevelGroup.id;
          }
        }
        
        // Set employment type and contract type based on the selected profile
        if (selectedProfile.employmentType) {
          updates.employmentTypeId = selectedProfile.employmentType.id;
        }
        
        if (selectedProfile.contractType) {
          updates.contractTypeId = selectedProfile.contractType.id;
        }
        
        setFormValuesState(prev => ({ ...prev, ...updates }));
      }
    }
  }, [formValues.jobProfileId, allJobProfiles]);

  // Fetch job functions when job family changes
  const fetchJobFunctions = useCallback((jobFamilyId: string) => {
    if (jobFamilyId) {
      fetchJobFunctionsByFamily(jobFamilyId);
    } else {
      // Load all job functions when no family filter
      searchJobFunctionsInternal('');
    }
  }, [fetchJobFunctionsByFamily, searchJobFunctionsInternal]);

  // Fetch job levels when job level group changes
  const fetchJobLevels = useCallback((jobLevelGroupId: string) => {
    if (jobLevelGroupId) {
      fetchJobLevelsByGroup(jobLevelGroupId);
    } else {
      // Load all job levels when no group filter
      searchJobLevelsInternal('');
    }
  }, [fetchJobLevelsByGroup, searchJobLevelsInternal]);

  // Initial load of all job functions and job levels
  useEffect(() => {
    if (accessToken) {
      searchJobFunctionsInternal('');
      searchJobLevelsInternal('');
    }
  }, [accessToken, searchJobFunctionsInternal, searchJobLevelsInternal]);

  // Update form values
  const setFormValues = (values: Partial<JobPositionFormValues>) => {
    setFormValuesState((prev) => ({ ...prev, ...values }));
  };

  // Submit handler (create or update)
  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      // TODO: Replace with real API call
      console.log('Submitting job position:', formValues);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      // Success logic here
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Combine errors from different sources
  const combinedError = error || jobProfilesError || organizationalUnitsError || jobFamiliesError || jobFunctionsError || jobLevelGroupsError || jobLevelsError || 
    employmentTypesError || contractTypesError;

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
        loading: loading || jobProfilesLoading || organizationalUnitsLoading || jobFamiliesLoading || jobFunctionsLoading || jobLevelGroupsLoading || jobLevelsLoading || employmentTypesLoading || contractTypesLoading,
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
        contractTypesLoading,
      }}
    >
      {children}
    </JobPositionContext.Provider>
  );
}; 