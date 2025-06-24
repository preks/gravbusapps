import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { SelectOption } from '../types';

export interface JobLevelGroupData {
  id: string;
  name: string;
  code: string;
  description?: string;
  category?: string;
  isActive: boolean;
}

export interface QueryVariablesJobLevelGroup {
  jobLevelGroupId?: string;
  offset?: number;
  limit?: number;
  search?: string;
}

const createSearchCondition = (search?: string, jobLevelGroupId?: string): string => {
  if (jobLevelGroupId) return '';
  if (!search) return '';
  return `
    , _or: [
      { name: { _ilike: "%${search}%" } },
      { code: { _ilike: "%${search}%" } }
    ]
  `;
};

export const GET_JOB_LEVEL_GROUP_DATA = (variables: QueryVariablesJobLevelGroup): string => {
  const { offset, limit, search, jobLevelGroupId } = variables;
  const whereCondition = jobLevelGroupId
    ? `id: { _eq: "${jobLevelGroupId}" }, isActive: { _eq: true } `
    : 'isActive: { _eq: true }';
  const searchCondition = createSearchCondition(search, jobLevelGroupId);
  const whereClause = `${whereCondition} ${searchCondition}`;

  return `query getJobLevelGroupData {
    jobLevelGroups: JobLevelGroup(
      limit: ${limit || 100},
      offset: ${offset || 0},
      where: { ${whereClause} }
    ) {
      id
      name
      code
      description
      category
      isActive
    }
    JobLevelGroupAggregate(
      limit: ${limit || 100},
      offset: ${offset || 0},
      where: { ${whereClause} }
    ) {
      aggregate {
        count
      }
    }
  }`;
};

export type JobLevelGroupQueryData = {
  jobLevelGroups: JobLevelGroupData[];
  JobLevelGroupAggregate: {
    aggregate: {
      count: number;
    };
  };
};

export const useJobLevelGroups = (context: BusinessAppContextProps) => {
  const [jobLevelGroups, setJobLevelGroups] = useState<SelectOption[]>([]);
  const [allJobLevelGroups, setAllJobLevelGroups] = useState<JobLevelGroupData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const graphqlClient = useGraphqlClient(context.accessToken);

  const fetchJobLevelGroups = useCallback(async (params: {
    limit?: number;
    offset?: number;
    search?: string;
    reset?: boolean;
  } = {}) => {
    const { limit = 20, offset = 0, search = '', reset = false } = params;
    
    if (reset) {
      setJobLevelGroups([]);
      setAllJobLevelGroups([]);
    }
    
    setLoading(true);
    setError(null);

    try {
      const query = GET_JOB_LEVEL_GROUP_DATA({
        limit,
        offset,
        search
      });

      const result = await graphqlClient.request<JobLevelGroupQueryData>(query);
      
      const selectOptions: SelectOption[] = result.jobLevelGroups.map(group => ({
        id: group.id,
        name: group.name,
        label: group.name,
        value: group.id
      }));

      if (reset || offset === 0) {
        setJobLevelGroups(selectOptions);
        setAllJobLevelGroups(result.jobLevelGroups);
      } else {
        setJobLevelGroups(prev => [...prev, ...selectOptions]);
        setAllJobLevelGroups(prev => [...prev, ...result.jobLevelGroups]);
      }

      setHasMore(result.jobLevelGroups.length === limit);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch job level groups';
      setError(errorMessage);
      console.error('Error fetching job level groups:', err);
    } finally {
      setLoading(false);
    }
  }, [context.accessToken, graphqlClient]);

  const searchJobLevelGroups = useCallback((search: string) => {
    setSearchTerm(search);
    fetchJobLevelGroups({ search, reset: true });
  }, [fetchJobLevelGroups]);

  const loadMoreJobLevelGroups = useCallback(() => {
    if (!loading && hasMore) {
      fetchJobLevelGroups({ 
        search: searchTerm, 
        offset: jobLevelGroups.length 
      });
    }
  }, [fetchJobLevelGroups, loading, hasMore, searchTerm, jobLevelGroups.length]);

  // Load initial data
  useEffect(() => {
    if (context.accessToken) {
      fetchJobLevelGroups({ reset: true });
    }
  }, [context.accessToken, fetchJobLevelGroups]);

  return {
    jobLevelGroups,
    allJobLevelGroups,
    loading,
    error,
    hasMore,
    searchJobLevelGroups,
    loadMoreJobLevelGroups,
    refetch: () => fetchJobLevelGroups({ reset: true })
  };
}; 