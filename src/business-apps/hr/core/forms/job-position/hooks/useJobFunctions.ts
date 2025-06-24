import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { SelectOption } from '../types';

export interface JobFunctionData {
  id: string;
  name: string;
  code: string;
  description?: string;
  category?: string;
  isActive: boolean;
  jobFamilyId?: string;
}

export interface QueryVariablesJobFunction {
  jobFunctionId?: string;
  jobFamilyId?: string;
  offset?: number;
  limit?: number;
  search?: string;
}

const createSearchCondition = (search?: string, jobFunctionId?: string): string => {
  if (jobFunctionId) return '';
  if (!search) return '';
  return `
    , _or: [
      { name: { _ilike: "%${search}%" } },
      { code: { _ilike: "%${search}%" } }
    ]
  `;
};

export const GET_JOB_FUNCTION_DATA = (variables: QueryVariablesJobFunction): string => {
  const { offset, limit, search, jobFunctionId, jobFamilyId } = variables;
  let whereCondition = jobFunctionId
    ? `id: { _eq: "${jobFunctionId}" }, isActive: { _eq: true } `
    : 'isActive: { _eq: true }';
  if (jobFamilyId) {
    whereCondition += `, jobFamilyId: { _eq: "${jobFamilyId}" }`;
  }
  const searchCondition = createSearchCondition(search, jobFunctionId);
  const whereClause = `${whereCondition} ${searchCondition}`;

  return `query getJobFunctionData {
    jobFunctions: JobFunction(
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
      jobFamilyId
    }
    JobFunctionAggregate(
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

export type JobFunctionQueryData = {
  jobFunctions: JobFunctionData[];
  JobFunctionAggregate: {
    aggregate: {
      count: number;
    };
  };
};

export const useJobFunctions = (context: BusinessAppContextProps) => {
  const [jobFunctions, setJobFunctions] = useState<SelectOption[]>([]);
  const [allJobFunctions, setAllJobFunctions] = useState<JobFunctionData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const graphqlClient = useGraphqlClient(context.accessToken);

  const fetchJobFunctions = useCallback(async (params: {
    limit?: number;
    offset?: number;
    search?: string;
    jobFamilyId?: string;
    reset?: boolean;
  } = {}) => {
    const { limit = 20, offset = 0, search = '', jobFamilyId, reset = false } = params;
    
    if (reset) {
      setJobFunctions([]);
      setAllJobFunctions([]);
    }
    
    setLoading(true);
    setError(null);

    try {
      const query = GET_JOB_FUNCTION_DATA({
        limit,
        offset,
        search,
        jobFamilyId
      });

      const result = await graphqlClient.request<JobFunctionQueryData>(query);
      
      const selectOptions: SelectOption[] = result.jobFunctions.map(func => ({
        id: func.id,
        name: func.name,
        label: func.name,
        value: func.id
      }));

      if (reset || offset === 0) {
        setJobFunctions(selectOptions);
        setAllJobFunctions(result.jobFunctions);
      } else {
        setJobFunctions(prev => [...prev, ...selectOptions]);
        setAllJobFunctions(prev => [...prev, ...result.jobFunctions]);
      }

      setHasMore(result.jobFunctions.length === limit);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch job functions';
      setError(errorMessage);
      console.error('Error fetching job functions:', err);
    } finally {
      setLoading(false);
    }
  }, [context.accessToken, graphqlClient]);

  const searchJobFunctions = useCallback((search: string) => {
    setSearchTerm(search);
    fetchJobFunctions({ search, reset: true });
  }, [fetchJobFunctions]);

  const loadMoreJobFunctions = useCallback(() => {
    if (!loading && hasMore) {
      fetchJobFunctions({ 
        search: searchTerm, 
        offset: jobFunctions.length 
      });
    }
  }, [fetchJobFunctions, loading, hasMore, searchTerm, jobFunctions.length]);

  const fetchJobFunctionsByFamily = useCallback((jobFamilyId: string) => {
    fetchJobFunctions({ jobFamilyId, reset: true });
  }, [fetchJobFunctions]);

  // Load initial data
  useEffect(() => {
    if (context.accessToken) {
      fetchJobFunctions({ reset: true });
    }
  }, [context.accessToken, fetchJobFunctions]);

  return {
    jobFunctions,
    allJobFunctions,
    loading,
    error,
    hasMore,
    searchJobFunctions,
    loadMoreJobFunctions,
    fetchJobFunctionsByFamily,
    refetch: () => fetchJobFunctions({ reset: true })
  };
}; 