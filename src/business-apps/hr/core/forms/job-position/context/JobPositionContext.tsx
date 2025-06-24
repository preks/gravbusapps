import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { JobPositionFormValues, SelectOption, JobPositionContextState } from '../types';
import { useJobProfiles } from '../hooks/useJobProfiles';
import { useOrganizationalUnits } from '../hooks/useOrganizationalUnits';
import { useJobFamilies } from '../hooks/useJobFamilies';
import { useJobFunctions } from '../hooks/useJobFunctions';
import { useJobLevelGroups } from '../hooks/useJobLevelGroups';
import { useJobLevels } from '../hooks/useJobLevels';

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
    loading: jobLevelsLoading,
    error: jobLevelsError,
    hasMore: hasMoreJobLevels,
    searchJobLevels: searchJobLevelsInternal,
    loadMoreJobLevels,
    fetchJobLevelsByGroup
  } = useJobLevels({ accessToken });

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
        
        // For now, we'll keep job family and function as mock data
        // In the next steps, we'll create proper queries for these
        // Based on the profile, you might want to set specific families/functions
        // This would require additional GraphQL queries to get the relationships
        
        setFormValuesState(prev => ({ ...prev, ...updates }));
      }
    }
  }, [formValues.jobProfileId, allJobProfiles]);

  // Fetch job functions when job family changes
  const fetchJobFunctions = useCallback((jobFamilyId: string) => {
    fetchJobFunctionsByFamily(jobFamilyId);
    setFormValuesState((prev) => ({ ...prev, jobFunctionId: '' }));
  }, [fetchJobFunctionsByFamily]);

  // Fetch job levels when job level group changes
  const fetchJobLevels = useCallback((jobLevelGroupId: string) => {
    fetchJobLevelsByGroup(jobLevelGroupId);
    setFormValuesState((prev) => ({ ...prev, jobLevelId: '' }));
  }, [fetchJobLevelsByGroup]);

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
  const combinedError = error || jobProfilesError || organizationalUnitsError || jobFamiliesError || jobFunctionsError || jobLevelGroupsError || jobLevelsError;

  return (
    <JobPositionContext.Provider
      value={{
        formValues,
        setFormValues,
        jobProfiles,
        allJobProfiles,
        jobFamilies,
        jobFunctions,
        jobLevelGroups,
        jobLevels,
        organizationalUnits,
        loading: loading || jobProfilesLoading || organizationalUnitsLoading || jobFamiliesLoading || jobFunctionsLoading || jobLevelGroupsLoading || jobLevelsLoading,
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
      }}
    >
      {children}
    </JobPositionContext.Provider>
  );
}; 