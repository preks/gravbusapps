import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { SelectOption } from '../types';

export interface JobLevelData {
  id: string;
  name: string;
  code?: string;
  description?: string;
  jobLevelGroupRef?: string;
  isDeleted: boolean;
}

export interface QueryVariablesJobLevel {
  jobLevelId?: string;
  jobLevelGroupId?: string;
  offset?: number;
  limit?: number;
  search?: string;
}

const createSearchCondition = (search?: string, jobLevelId?: string): string => {
  if (jobLevelId) return '';
  if (!search) return '';
  return `
    , _or: [
      { name: { _ilike: "%${search}%" } },
      { code: { _ilike: "%${search}%" } }
    ]
  `;
};

export const GET_JOB_LEVEL_DATA = (variables: QueryVariablesJobLevel): string => {
  const { offset, limit, search, jobLevelId, jobLevelGroupId } = variables;
  const whereJobLevelGroup = jobLevelGroupId
    ? ` jobLevelGroupRef: { _eq: "${jobLevelGroupId}" }, isDeleted: { _eq: false} `
    : 'isDeleted: { _eq: false}';
  const whereCondition = jobLevelId ? `id: { _eq: "${jobLevelId}" }, isDeleted: { _eq: false} ` : whereJobLevelGroup;
  const searchCondition = createSearchCondition(search, jobLevelId);
  const whereClause = `${whereCondition} ${searchCondition}`;

  return `query getJobLevelData {
    jobLevels: JobLevel(
      limit: ${limit || 100},
      offset: ${offset || 0},
      where: { ${whereClause}}
    ) {
      id
      name
      code
      description
      jobLevelGroupRef
      isDeleted
    }
    JobLevelAggregate(
      limit: ${limit || 100},
      offset: ${offset || 0},
      where: { ${whereClause}}
    ) {
      aggregate {
        count
      }
    }
  }`;
};

export type JobLevelQueryData = {
  jobLevels: JobLevelData[];
  JobLevelAggregate: {
    aggregate: {
      count: number;
    };
  };
};

export const useJobLevels = (context: BusinessAppContextProps) => {
  const [jobLevels, setJobLevels] = useState<SelectOption[]>([]);
  const [allJobLevels, setAllJobLevels] = useState<JobLevelData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const graphqlClient = useGraphqlClient(context.accessToken);

  const fetchJobLevels = useCallback(async (params: {
    limit?: number;
    offset?: number;
    search?: string;
    jobLevelGroupId?: string;
    reset?: boolean;
  } = {}) => {
    const { limit = 20, offset = 0, search = '', jobLevelGroupId, reset = false } = params;
    
    if (reset) {
      setJobLevels([]);
      setAllJobLevels([]);
    }
    
    setLoading(true);
    setError(null);

    try {
      const query = GET_JOB_LEVEL_DATA({
        limit,
        offset,
        search,
        jobLevelGroupId
      });

      const result = await graphqlClient.request<JobLevelQueryData>(query);
      
      const selectOptions: SelectOption[] = result.jobLevels.map(level => ({
        id: level.id,
        name: level.name,
        label: level.name,
        value: level.id
      }));

      if (reset || offset === 0) {
        setJobLevels(selectOptions);
        setAllJobLevels(result.jobLevels);
      } else {
        setJobLevels(prev => [...prev, ...selectOptions]);
        setAllJobLevels(prev => [...prev, ...result.jobLevels]);
      }

      setHasMore(result.jobLevels.length === limit);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch job levels';
      setError(errorMessage);
      console.error('Error fetching job levels:', err);
    } finally {
      setLoading(false);
    }
  }, [context.accessToken, graphqlClient]);

  const searchJobLevels = useCallback((search: string) => {
    setSearchTerm(search);
    fetchJobLevels({ search, reset: true });
  }, [fetchJobLevels]);

  const loadMoreJobLevels = useCallback(() => {
    if (!loading && hasMore) {
      fetchJobLevels({ 
        search: searchTerm, 
        offset: jobLevels.length 
      });
    }
  }, [fetchJobLevels, loading, hasMore, searchTerm, jobLevels.length]);

  const fetchJobLevelsByGroup = useCallback((jobLevelGroupId: string) => {
    fetchJobLevels({ jobLevelGroupId, reset: true });
  }, [fetchJobLevels]);

  // Load initial data
  useEffect(() => {
    if (context.accessToken) {
      fetchJobLevels({ reset: true });
    }
  }, [context.accessToken, fetchJobLevels]);

  return {
    jobLevels,
    allJobLevels,
    loading,
    error,
    hasMore,
    searchJobLevels,
    loadMoreJobLevels,
    fetchJobLevelsByGroup,
    refetch: () => fetchJobLevels({ reset: true })
  };
}; 