import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useGetJobFunctionData, JobFunctionDataVariables } from '../queries/JobFunctionQueries';
import { JobFunction } from '../types';

export const useJobFunctions = (context: BusinessAppContextProps) => {
  const [jobFunctions, setJobFunctions] = useState<JobFunction[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { fetchJobFunctionData } = useGetJobFunctionData(context);

  const loadData = useCallback(async (variables?: JobFunctionDataVariables) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetchJobFunctionData(variables);
      // Transform the data to ensure displayName and isActive are set
      const transformedJobFunctions = (response.jobFunctions || []).map(jobFunction => ({
        ...jobFunction,
        displayName: jobFunction.name || jobFunction.code || 'Unknown Function',
        isActive: true // Assuming active since it's not deleted
      })) as JobFunction[];
      
      setJobFunctions(transformedJobFunctions);
      setTotalCount(response.JobFunctionAggregate.aggregate.count);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Error loading job functions:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchJobFunctionData]);

  const refetch = useCallback((variables?: JobFunctionDataVariables) => {
    return loadData(variables);
  }, [loadData]);

  // Helper functions
  const getJobFunctionById = useCallback((functionId: string): JobFunction | undefined => {
    return jobFunctions.find(func => func.id === functionId);
  }, [jobFunctions]);

  const getJobFunctionsByJobFamily = useCallback((jobFamilyId: string): JobFunction[] => {
    return jobFunctions.filter(func => func.jobFamilyRef === jobFamilyId || func.jobFamily?.id === jobFamilyId);
  }, [jobFunctions]);

  const getJobFunctionsByJobLevelGroup = useCallback((jobLevelGroupId: string): JobFunction[] => {
    return jobFunctions.filter(func => func.jobLevelGroupRef === jobLevelGroupId || func.jobLevelGroup?.id === jobLevelGroupId);
  }, [jobFunctions]);

  const searchJobFunctions = useCallback((query: string): JobFunction[] => {
    const searchTerm = query.toLowerCase();
    return jobFunctions.filter(func =>
      func.name.toLowerCase().includes(searchTerm) ||
      (func.code && func.code.toLowerCase().includes(searchTerm)) ||
      (func.description && func.description.toLowerCase().includes(searchTerm))
    );
  }, [jobFunctions]);

  // Load data on mount and when access token changes
  useEffect(() => {
    if (context.accessToken) {
      loadData();
    }
  }, [context.accessToken, loadData]);

  return {
    // Data
    jobFunctions,
    totalCount,
    
    // State
    isLoading,
    error,
    
    // Actions
    refetch,
    
    // Helper functions
    getJobFunctionById,
    getJobFunctionsByJobFamily,
    getJobFunctionsByJobLevelGroup,
    searchJobFunctions,
    
    // Raw fetch function for advanced usage
    fetchJobFunctionData
  };
}; 