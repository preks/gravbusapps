import { useState, useEffect } from 'react';
import { useEmployeeCount } from './useEmployeeCount';
import { useGetContractTypes } from './useGetContractTypes';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { GET_CONTRACT_TYPE_DISTRIBUTION } from '../queries/getContractTypeDistribution';

export interface ContractTypeDistribution {
  id: string;
  name: string;
  count: number;
  percentage: number;
}

/**
 * Hook to fetch and calculate contract type distribution data
 * @param accessToken The access token for authentication
 * @returns Contract type distribution data with counts and percentages
 */
export function useContractTypeDistribution(accessToken: string) {
  const [distribution, setDistribution] = useState<ContractTypeDistribution[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [contractTypeDataLoading, setContractTypeDataLoading] = useState<boolean>(false);
  const [contractTypeDataError, setContractTypeDataError] = useState<Error | null>(null);
  
  // GraphQL client for fetching data
  const graphqlClient = useGraphqlClient(accessToken);
  
  // Get all contract types (catalog entries)
  const { types: contractTypes, loading: typesLoading, error: typesError } = 
    useGetContractTypes(accessToken, '', 0, 100); // Use limit of 100 to fetch all contract types
  
  // Get total employee count for percentage calculation
  const { count: totalEmployees, loading: countLoading, error: countError } = useEmployeeCount(accessToken);
  
  // Fetch contract type distribution data using GraphQL
  useEffect(() => {
    if (typesLoading || countLoading || !contractTypes.length || !graphqlClient) return;
    
    setContractTypeDataLoading(true);
    
    if (!graphqlClient) {
      setContractTypeDataError(new Error('GraphQL client not available'));
      setContractTypeDataLoading(false);
      return;
    }
    
    graphqlClient.request(
      GET_CONTRACT_TYPE_DISTRIBUTION
    )
    .then((result: any) => {
      setContractTypeDataLoading(false);
      
      // Get working conditions from result data
      const employeeWorkingConditions = result?.EmployeeWorkingCondition || [];
      
      // Count employees by contract type
      const contractTypeCounts = new Map<string, number>();
      
      // Initialize counts for all contract types to zero
      contractTypes.forEach(type => {
        contractTypeCounts.set(type.id, 0);
      });
      
      // Count employees for each contract type
      employeeWorkingConditions.forEach((condition: any) => {
        const contractTypeId = condition.contractType?.id;
        if (contractTypeId) {
          const currentCount = contractTypeCounts.get(contractTypeId) || 0;
          contractTypeCounts.set(contractTypeId, currentCount + 1);
        }
      });
      
      // Create distribution data with counts and percentages
      const distributionData: ContractTypeDistribution[] = [];
      
      contractTypes.forEach(type => {
        const count = contractTypeCounts.get(type.id) || 0;
        // Calculate percentage safely (avoid division by zero)
        const percentage = totalEmployees > 0 ? (count / totalEmployees) * 100 : 0;
        
        distributionData.push({
          id: type.id,
          name: type.name,
          count,
          percentage
        });
      });
      
      // Sort by count in descending order
      const sortedDistribution = distributionData.sort((a, b) => b.count - a.count);
      
      setDistribution(sortedDistribution);
    })
    .catch((err: any) => {
      console.error('[useContractTypeDistribution] Error fetching contract type distribution:', err);
      setContractTypeDataLoading(false);
      setContractTypeDataError(err);
    });
  }, [graphqlClient, contractTypes, totalEmployees, typesLoading]);
  
  // Combine all possible errors
  useEffect(() => {
    const finalError = typesError || countError || contractTypeDataError;
    setError(finalError);
  }, [typesError, countError, contractTypeDataError]);
  
  // Determine overall loading state
  const isLoading = typesLoading || countLoading || contractTypeDataLoading;
  
  return { 
    distribution, 
    loading: isLoading, 
    error 
  };
}
