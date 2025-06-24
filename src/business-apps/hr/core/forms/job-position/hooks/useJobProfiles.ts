import { useState, useCallback, useEffect } from 'react';
import { fetchJobProfileData, JobProfileItem, QueryVariablesJobProfile } from '../queries/JobProfileQueries';
import { SelectOption } from '../types';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';

const PROFILES_PER_PAGE = 20;

export interface UseJobProfilesProps {
  accessToken: string;
  search?: string;
}

export interface UseJobProfilesReturn {
  jobProfiles: SelectOption[];
  allJobProfiles: JobProfileItem[]; // Full data for auto-filling other fields
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  total: number;
  loadMore: () => void;
  searchProfiles: (searchTerm?: string) => void;
  retry: () => void;
}

/**
 * Custom hook for fetching job profiles with infinite scroll and search functionality
 */
export const useJobProfiles = ({ accessToken, search }: UseJobProfilesProps): UseJobProfilesReturn => {
  const client = useGraphqlClient(accessToken);
  const [jobProfiles, setJobProfiles] = useState<SelectOption[]>([]);
  const [allJobProfiles, setAllJobProfiles] = useState<JobProfileItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [currentSearch, setCurrentSearch] = useState<string | undefined>(search);

  // Convert JobProfileItem to SelectOption
  const convertToSelectOption = (profile: JobProfileItem): SelectOption => ({
    id: profile.id,
    name: profile.name,
    label: profile.name,
    value: profile.id
  });

  // Reset data when search changes
  useEffect(() => {
    if (currentSearch !== search) {
      setCurrentSearch(search);
      setJobProfiles([]);
      setAllJobProfiles([]);
      setOffset(0);
      setHasMore(true);
      setTotal(0);
      setError(null);
    }
  }, [search, currentSearch]);

  // Load more job profiles
  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !accessToken || !client) return;

    console.log('Loading job profiles with search:', currentSearch);
    setLoading(true);
    setError(null);

    try {
      const variables: QueryVariablesJobProfile = {
        offset,
        limit: PROFILES_PER_PAGE,
        search: currentSearch
      };

      console.log('Job profiles query variables:', variables);
      const data = await fetchJobProfileData(client, variables);
      console.log('Job profiles data received:', data);
      
      const newProfiles = data.JobProfile || [];
      const newSelectOptions = newProfiles.map(convertToSelectOption);

      // Append new data for infinite scroll
      setJobProfiles(prev => offset === 0 ? newSelectOptions : [...prev, ...newSelectOptions]);
      setAllJobProfiles(prev => offset === 0 ? newProfiles : [...prev, ...newProfiles]);
      
      setTotal(data.JobProfileAggregate.aggregate.count);
      setOffset(prev => prev + PROFILES_PER_PAGE);
      setHasMore(newProfiles.length === PROFILES_PER_PAGE && offset + PROFILES_PER_PAGE < data.JobProfileAggregate.aggregate.count);
    } catch (err: any) {
      console.error('Error loading job profiles:', err);
      setError(err.message || 'Failed to load job profiles');
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [client, loading, hasMore, offset, currentSearch, accessToken]);

  // Search profiles
  const searchProfiles = useCallback((searchTerm?: string) => {
    console.log('searchProfiles called with:', searchTerm);
    setCurrentSearch(searchTerm);
    setJobProfiles([]);
    setAllJobProfiles([]);
    setOffset(0);
    setHasMore(true);
    setTotal(0);
    setError(null);
  }, []);

  // Retry loading
  const retry = useCallback(() => {
    setError(null);
    setHasMore(true);
    loadMore();
  }, [loadMore]);

  // Initial load
  useEffect(() => {
    if (accessToken && client && jobProfiles.length === 0 && !loading && !error) {
      loadMore();
    }
  }, [accessToken, client, jobProfiles.length, loading, error, loadMore]);

  return {
    jobProfiles,
    allJobProfiles,
    loading,
    error,
    hasMore,
    total,
    loadMore,
    searchProfiles,
    retry
  };
}; 