"use client";

import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useJobProfileFilters, JobProfileFilterOption } from './useJobProfileFilters';
import { useJobFunctionFilters, JobFunctionFilterOption } from './useJobFunctionFilters';
import { useJobLevelFilters, JobLevelFilterOption } from './useJobLevelFilters';
import { useContractTypeFilters, ContractTypeFilterOption } from './useContractTypeFilters';
import { useEmploymentTypeFilters, EmploymentTypeFilterOption } from './useEmploymentTypeFilters';

/**
 * Filter option interface for consistent typing
 */
export interface FilterOption {
  id: string;
  label: string;
  selected: boolean;
}

/**
 * Filter group interface for use with DataContainer component
 */
export interface FilterGroup {
  id: string;
  title: string;
  filters?: FilterOption[];
  backendSearch?: (search: string) => { filters: FilterOption[]; loading: boolean; error: any };
}

/**
 * Job position filters interface for use with API calls
 */
export interface JobPositionFilters {
  search: string;
  jobProfiles: string[];
  jobFunctions: string[];
  jobLevels: string[];
  contractTypes: string[];
  employmentTypes: string[];
  vacant?: boolean;
}

/**
 * Custom hook to manage job position filters across components
 * @returns Filter state and utility functions
 */
export function useJobPositionFilters(accessToken: string) {
  const { t } = useTranslation();
  
  // Search and filter state
  const [search, setSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  // Individual filter search states
  const [jobProfileSearch, setJobProfileSearch] = useState('');
  const [jobFunctionSearch, setJobFunctionSearch] = useState('');
  const [jobLevelSearch, setJobLevelSearch] = useState('');
  const [contractTypeSearch, setContractTypeSearch] = useState('');
  const [employmentTypeSearch, setEmploymentTypeSearch] = useState('');

  // Individual filter hooks
  const { profiles: jobProfileOptions, loading: jobProfileLoading, error: jobProfileError } = 
    useJobProfileFilters(accessToken, jobProfileSearch);
  const { functions: jobFunctionOptions, loading: jobFunctionLoading, error: jobFunctionError } = 
    useJobFunctionFilters(accessToken, jobFunctionSearch);
  const { levels: jobLevelOptions, loading: jobLevelLoading, error: jobLevelError } = 
    useJobLevelFilters(accessToken, jobLevelSearch);
  const { types: contractTypeOptions, loading: contractTypeLoading, error: contractTypeError } = 
    useContractTypeFilters(accessToken, contractTypeSearch);
  const { types: employmentTypeOptions, loading: employmentTypeLoading, error: employmentTypeError } = 
    useEmploymentTypeFilters(accessToken, employmentTypeSearch);

  // Add a filter to the selected filters
  const addFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => [...prev, filterId]);
  }, []);

  // Remove a filter from the selected filters
  const removeFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => prev.filter(id => id !== filterId));
  }, []);

  // Get selected filter IDs by type
  const getSelectedFiltersByType = useCallback(() => {
    return {
      jobProfiles: selectedFilters.filter(f => 
        jobProfileOptions.map(p => p.id).includes(f)),
      jobFunctions: selectedFilters.filter(f => 
        jobFunctionOptions.map(fn => fn.id).includes(f)),
      jobLevels: selectedFilters.filter(f => 
        jobLevelOptions.map(l => l.id).includes(f)),
      contractTypes: selectedFilters.filter(f => 
        contractTypeOptions.map(t => t.id).includes(f)),
      employmentTypes: selectedFilters.filter(f => 
        employmentTypeOptions.map(t => t.id).includes(f))
    };
  }, [selectedFilters, jobProfileOptions, jobFunctionOptions, jobLevelOptions, contractTypeOptions, employmentTypeOptions]);

  // Backend search functions
  const getJobProfileFilters = useCallback((search: string) => {
    setJobProfileSearch(search);
    return {
      filters: jobProfileOptions.map(profile => ({
        id: profile.id,
        label: profile.name,
        selected: selectedFilters.includes(profile.id),
      })),
      loading: jobProfileLoading,
      error: jobProfileError
    };
  }, [jobProfileOptions, selectedFilters, jobProfileLoading, jobProfileError]);

  const getJobFunctionFilters = useCallback((search: string) => {
    setJobFunctionSearch(search);
    return {
      filters: jobFunctionOptions.map(func => ({
        id: func.id,
        label: func.name,
        selected: selectedFilters.includes(func.id),
      })),
      loading: jobFunctionLoading,
      error: jobFunctionError
    };
  }, [jobFunctionOptions, selectedFilters, jobFunctionLoading, jobFunctionError]);

  const getJobLevelFilters = useCallback((search: string) => {
    setJobLevelSearch(search);
    return {
      filters: jobLevelOptions.map(level => ({
        id: level.id,
        label: level.name,
        selected: selectedFilters.includes(level.id),
      })),
      loading: jobLevelLoading,
      error: jobLevelError
    };
  }, [jobLevelOptions, selectedFilters, jobLevelLoading, jobLevelError]);

  const getContractTypeFilters = useCallback((search: string) => {
    setContractTypeSearch(search);
    return {
      filters: contractTypeOptions.map(type => ({
        id: type.id,
        label: type.name,
        selected: selectedFilters.includes(type.id),
      })),
      loading: contractTypeLoading,
      error: contractTypeError
    };
  }, [contractTypeOptions, selectedFilters, contractTypeLoading, contractTypeError]);

  const getEmploymentTypeFilters = useCallback((search: string) => {
    setEmploymentTypeSearch(search);
    return {
      filters: employmentTypeOptions.map(type => ({
        id: type.id,
        label: type.name,
        selected: selectedFilters.includes(type.id),
      })),
      loading: employmentTypeLoading,
      error: employmentTypeError
    };
  }, [employmentTypeOptions, selectedFilters, employmentTypeLoading, employmentTypeError]);

  // Filter groups for DataContainer
  const filterGroups: FilterGroup[] = useMemo(() => [
    {
      id: 'jobProfiles',
      title: t('job_position.filter.job_profiles', 'Job Profiles'),
      backendSearch: getJobProfileFilters
    },
    {
      id: 'jobFunctions',
      title: t('job_position.filter.job_functions', 'Job Functions'),
      backendSearch: getJobFunctionFilters
    },
    {
      id: 'jobLevels',
      title: t('job_position.filter.job_levels', 'Job Levels'),
      backendSearch: getJobLevelFilters
    },
    {
      id: 'contractTypes',
      title: t('job_position.filter.contract_types', 'Contract Types'),
      backendSearch: getContractTypeFilters
    },
    {
      id: 'employmentTypes',
      title: t('job_position.filter.employment_types', 'Employment Types'),
      backendSearch: getEmploymentTypeFilters
    }
  ], [t, getJobProfileFilters, getJobFunctionFilters, getJobLevelFilters, getContractTypeFilters, getEmploymentTypeFilters]);

  // Filter label map for DataController
  const filterLabelMap = useMemo(() => {
    const labelMap: Record<string, string> = {};
    
    jobProfileOptions.forEach(profile => {
      labelMap[profile.id] = profile.name;
    });
    jobFunctionOptions.forEach(func => {
      labelMap[func.id] = func.name;
    });
    jobLevelOptions.forEach(level => {
      labelMap[level.id] = level.name;
    });
    contractTypeOptions.forEach(type => {
      labelMap[type.id] = type.name;
    });
    employmentTypeOptions.forEach(type => {
      labelMap[type.id] = type.name;
    });
    
    return labelMap;
  }, [jobProfileOptions, jobFunctionOptions, jobLevelOptions, contractTypeOptions, employmentTypeOptions]);

  // Get filters for API calls
  const getFilters = useCallback((): JobPositionFilters => {
    const filtersByType = getSelectedFiltersByType();
    return {
      search,
      jobProfiles: filtersByType.jobProfiles,
      jobFunctions: filtersByType.jobFunctions,
      jobLevels: filtersByType.jobLevels,
      contractTypes: filtersByType.contractTypes,
      employmentTypes: filtersByType.employmentTypes
    };
  }, [search, getSelectedFiltersByType]);

  return {
    search,
    setSearch,
    selectedFilters,
    setSelectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    getFilters
  };
} 