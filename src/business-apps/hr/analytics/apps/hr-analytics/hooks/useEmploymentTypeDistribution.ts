import { useState, useEffect } from 'react';
import { useEmployeeCount } from './useEmployeeCount';
import { useGetEmploymentTypes } from '@/business-apps/hr/core/hooks/useGetEmploymentTypes';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { GET_EMPLOYMENT_TYPE_DISTRIBUTION } from '../queries/getEmploymentTypeDistribution';

export interface EmploymentTypeDistribution {
  id: string;
  name: string;
  count: number;
  percentage: number;
}

/**
 * Custom hook to fetch employment type distribution data including counts and percentages
 * @param accessToken User access token
 */
export function useEmploymentTypeDistribution(accessToken: string) {
  const [distribution, setDistribution] = useState<EmploymentTypeDistribution[]>([]);
  // We don't need a separate initialLoading state as we combine all loading states
  const [error, setError] = useState<Error | null>(null);
  const [employmentTypeDataLoading, setEmploymentTypeDataLoading] = useState<boolean>(false);
  const [employmentTypeDataError, setEmploymentTypeDataError] = useState<Error | null>(null);
  
  // GraphQL client for fetching data
  const graphqlClient = useGraphqlClient(accessToken);
  
  // Get all employment types (catalog entries)
  const { types: employmentTypes, loading: typesLoading, error: typesError } = 
    useGetEmploymentTypes(accessToken, '', 0); // The hook now fetches 100 items by default
  
  // Get total employee count
  const { count: totalEmployees, loading: countLoading, error: countError } = 
    useEmployeeCount(accessToken);
    
  // Fetch employment type distribution data from GraphQL
  useEffect(() => {
    if (typesLoading || countLoading || !employmentTypes.length || !graphqlClient) return;
    
    setEmploymentTypeDataLoading(true);
    
    if (!graphqlClient) {
      setEmploymentTypeDataError(new Error('GraphQL client not available'));
      setEmploymentTypeDataLoading(false);
      return;
    }
    
    graphqlClient.request(
      GET_EMPLOYMENT_TYPE_DISTRIBUTION
    )
    .then((response: any) => {
      const employeeWorkingConditions = response?.EmployeeWorkingCondition || [];
      
      // Count employees by employment type
      const typeCountMap = new Map<string, { id: string; name: string; count: number }>();
      
      // Initialize counters for all employment types
      employmentTypes.forEach(type => {
        typeCountMap.set(type.id, { id: type.id, name: type.name, count: 0 });
      });
      
      // Count employees by employment type
      employeeWorkingConditions.forEach((condition: any) => {
        if (condition.employmentType && condition.employmentType.id) {
          const typeId = condition.employmentType.id;
          const existingType = typeCountMap.get(typeId);
          
          if (existingType) {
            existingType.count += 1;
          } else {
            // This handles cases where we have data from GraphQL but not in our catalog list
            const typeName = condition.employmentType.value || 'Unknown';
            typeCountMap.set(typeId, {
              id: typeId,
              name: typeName,
              count: 1
            });
          }
        }
      });
      
      // Convert map to array and calculate percentages
      const totalCount = Math.max(totalEmployees, 1); // Prevent division by zero
      const distributionData: EmploymentTypeDistribution[] = Array.from(typeCountMap.values())
        .map(item => ({
          ...item,
          percentage: Math.round((item.count / totalCount) * 100)
        }))
        .sort((a, b) => b.count - a.count); // Sort by count descending
      
      setDistribution(distributionData);
      setEmploymentTypeDataLoading(false);
      setEmploymentTypeDataError(null);
    })
    .catch((err: Error) => {
      console.error('[useEmploymentTypeDistribution] Error fetching employment type distribution:', err);
      setEmploymentTypeDataError(err);
      setEmploymentTypeDataLoading(false);
      // Fall back to empty distribution data
      setDistribution([]);
    });
    
  }, [employmentTypes, typesLoading, countLoading, totalEmployees, graphqlClient]);
  
  // Combine errors if any occur
  useEffect(() => {
    if (typesError) {
      setError(typesError);
    } else if (countError) {
      setError(countError);
    } else if (employmentTypeDataError) {
      setError(employmentTypeDataError);
    } else {
      setError(null);
    }
  }, [typesError, countError, employmentTypeDataError]);
  
  // Determine overall loading state
  const isLoading = typesLoading || countLoading || employmentTypeDataLoading;
  
  return { 
    distribution, 
    loading: isLoading, 
    error, 
    totalCount: totalEmployees 
  };
}
