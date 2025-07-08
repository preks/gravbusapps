"use client";

import { useState, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetLeadStatuses } from './useGetLeadStatuses';
import { useGetLeadRatings } from './useGetLeadRatings';
import { useGetLeadSources } from './useGetLeadSources';
import { useGetIndustries } from './useGetIndustries';
import { useGetCompanySizes } from './useGetCompanySizes';

// DataFilter interfaces to match DataContainer expectations
export interface DataFilter {
  id: string;
  label: string;
  selected: boolean;
  count?: number;
}

export interface DataFilterGroup {
  id: string;
  title: string;
  filters: DataFilter[];
  backendSearch?: (search: string) => { filters: DataFilter[]; loading: boolean; error: any };
}

// Lead filter state interface
export interface LeadFilters {
  search: string;
  leadStatuses: string[];
  leadRatings: string[];
  leadSources: string[];
  industries: string[];
  companySizes: string[];
  createdAfter?: string;
  createdBefore?: string;
}

export const useLeadFilters = (context: BusinessAppContextProps) => {
  // Main search and filter state
  const [search, setSearch] = useState('');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  // Search state for each filter type (following employee pattern)
  const [leadStatusSearch, setLeadStatusSearch] = useState('');
  const [leadRatingSearch, setLeadRatingSearch] = useState('');
  const [leadSourceSearch, setLeadSourceSearch] = useState('');
  const [industrySearch, setIndustrySearch] = useState('');

  // Offset state for pagination (if needed later)
  const [leadStatusOffset] = useState(0);
  const [leadRatingOffset] = useState(0);
  const [leadSourceOffset] = useState(0);
  const [industryOffset] = useState(0);

  // Get catalog data with search parameters
  const { leadStatusOptions, isLoading: leadStatusLoading, error: leadStatusError } = 
    useGetLeadStatuses(context, leadStatusSearch, leadStatusOffset);
  const { leadRatingOptions, isLoading: leadRatingLoading, error: leadRatingError } = 
    useGetLeadRatings(context, leadRatingSearch, leadRatingOffset);
  const { leadSourceOptions, isLoading: leadSourceLoading, error: leadSourceError } = 
    useGetLeadSources(context, leadSourceSearch, leadSourceOffset);
  const { industryOptions, isLoading: industryLoading, error: industryError } = 
    useGetIndustries(context, industrySearch, industryOffset);
  const { companySizeOptions, isLoading: companySizeLoading, error: companySizeError } = 
    useGetCompanySizes(context);

  // Combined loading and error states
  const isLoading = leadStatusLoading || leadRatingLoading || leadSourceLoading || industryLoading || companySizeLoading;
  const error = leadStatusError || leadRatingError || leadSourceError || industryError || companySizeError;

  // Filter management functions
  const addFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => [...prev, filterId]);
  }, []);

  const removeFilter = useCallback((filterId: string) => {
    setSelectedFilters(prev => prev.filter(id => id !== filterId));
  }, []);

  const resetFilters = useCallback(() => {
    setSearch('');
    setSelectedFilters([]);
  }, []);

  // Backend search functions (following employee pattern)
  const getLeadStatusFilters = useCallback((search: string) => {
    setLeadStatusSearch(search);
    
    return {
      filters: leadStatusOptions.map(option => ({
        id: option.id,
        label: option.name,
        selected: selectedFilters.includes(option.id),
      })),
      loading: leadStatusLoading,
      error: leadStatusError
    };
  }, [leadStatusOptions, selectedFilters, leadStatusLoading, leadStatusError]);

  const getLeadRatingFilters = useCallback((search: string) => {
    setLeadRatingSearch(search);
    
    return {
      filters: leadRatingOptions.map(option => ({
        id: option.id,
        label: option.name,
        selected: selectedFilters.includes(option.id),
      })),
      loading: leadRatingLoading,
      error: leadRatingError
    };
  }, [leadRatingOptions, selectedFilters, leadRatingLoading, leadRatingError]);

  const getLeadSourceFilters = useCallback((search: string) => {
    setLeadSourceSearch(search);
    
    return {
      filters: leadSourceOptions.map(option => ({
        id: option.id,
        label: option.name,
        selected: selectedFilters.includes(option.id),
      })),
      loading: leadSourceLoading,
      error: leadSourceError
    };
  }, [leadSourceOptions, selectedFilters, leadSourceLoading, leadSourceError]);

  const getIndustryFilters = useCallback((search: string) => {
    setIndustrySearch(search);
    
    return {
      filters: industryOptions.map(option => ({
        id: option.id,
        label: option.name,
        selected: selectedFilters.includes(option.id),
      })),
      loading: industryLoading,
      error: industryError
    };
  }, [industryOptions, selectedFilters, industryLoading, industryError]);

  // Company size doesn't need backend search as it's predefined
  const getCompanySizeFilters = useCallback(() => {
    return {
      filters: companySizeOptions.map(option => ({
        id: option.id,
        label: option.name,
        selected: selectedFilters.includes(option.id),
      })),
      loading: companySizeLoading,
      error: companySizeError
    };
  }, [companySizeOptions, selectedFilters, companySizeLoading, companySizeError]);

  // Convert catalog options to filter options for static display
  const leadStatusFilterOptions: DataFilter[] = leadStatusOptions.map((option: any) => ({
    id: option.id,
    label: option.name,
    selected: selectedFilters.includes(option.id)
  }));

  const leadRatingFilterOptions: DataFilter[] = leadRatingOptions.map((option: any) => ({
    id: option.id,
    label: option.name,
    selected: selectedFilters.includes(option.id)
  }));

  const leadSourceFilterOptions: DataFilter[] = leadSourceOptions.map((option: any) => ({
    id: option.id,
    label: option.name,
    selected: selectedFilters.includes(option.id)
  }));

  const industryFilterOptions: DataFilter[] = industryOptions.map((option: any) => ({
    id: option.id,
    label: option.name,
    selected: selectedFilters.includes(option.id)
  }));

  const companySizeFilterOptions: DataFilter[] = companySizeOptions.map((option: any) => ({
    id: option.id,
    label: option.name,
    selected: selectedFilters.includes(option.id)
  }));

  // Debug logging
  console.log('Filter options debug:', {
    leadStatusOptions: leadStatusOptions.length,
    leadRatingOptions: leadRatingOptions.length,
    leadSourceOptions: leadSourceOptions.length,
    industryOptions: industryOptions.length,
    companySizeOptions: companySizeOptions.length
  });

  // Create filter groups with backend search functions
  const filterGroups: DataFilterGroup[] = [
    {
      id: 'leadStatuses',
      title: 'Lead Status',
      filters: leadStatusFilterOptions,
      backendSearch: getLeadStatusFilters
    },
    {
      id: 'leadRatings',
      title: 'Lead Rating', 
      filters: leadRatingFilterOptions,
      backendSearch: getLeadRatingFilters
    },
    {
      id: 'leadSources',
      title: 'Lead Source',
      filters: leadSourceFilterOptions,
      backendSearch: getLeadSourceFilters
    },
    {
      id: 'industries',
      title: 'Industry',
      filters: industryFilterOptions,
      backendSearch: getIndustryFilters
    },
    {
      id: 'companySizes',
      title: 'Company Size',
      filters: companySizeFilterOptions
      // No backend search for company sizes as they're predefined
    }
  ];

  console.log('Filter groups created:', filterGroups.map(g => ({ id: g.id, filterCount: g.filters.length })));

  // Create filter label map
  const filterLabelMap = {
    ...Object.fromEntries(leadStatusOptions.map(o => [o.id, o.name])),
    ...Object.fromEntries(leadRatingOptions.map(o => [o.id, o.name])),
    ...Object.fromEntries(leadSourceOptions.map(o => [o.id, o.name])),
    ...Object.fromEntries(industryOptions.map(o => [o.id, o.name])),
    ...Object.fromEntries(companySizeOptions.map(o => [o.id, o.name]))
  };

  // Get current filters for API calls
  const getFilters = useCallback((): LeadFilters => {
    const leadStatuses = selectedFilters.filter(f => leadStatusOptions.map(o => o.id).includes(f));
    const leadRatings = selectedFilters.filter(f => leadRatingOptions.map(o => o.id).includes(f));
    const leadSources = selectedFilters.filter(f => leadSourceOptions.map(o => o.id).includes(f));
    const industries = selectedFilters.filter(f => industryOptions.map(o => o.id).includes(f));
    const companySizes = selectedFilters.filter(f => companySizeOptions.map(o => o.id).includes(f));

    return {
      search,
      leadStatuses,
      leadRatings,
      leadSources,
      industries,
      companySizes
    };
  }, [search, selectedFilters, leadStatusOptions, leadRatingOptions, leadSourceOptions, industryOptions, companySizeOptions]);

  return {
    // Filter state
    search,
    selectedFilters,
    
    // Filter data
    filterGroups,
    filterLabelMap,
    
    // Filter actions
    setSearch,
    addFilter,
    removeFilter,
    resetFilters,
    getFilters,
    
    // Loading states
    isLoading,
    error
  };
}; 