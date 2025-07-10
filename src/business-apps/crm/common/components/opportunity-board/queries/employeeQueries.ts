import { useCallback } from 'react';
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
}

export interface UseEmployeesWithOpportunitiesReturn {
  fetchEmployeesWithOpportunities: (sourceApp?: string) => Promise<Employee[]>;
}

export const GET_EMPLOYEES_WITH_OPPORTUNITIES = `
  query GetEmployeesWithOpportunities($sourceApp: String, $limit: Int = 200) {
    Opportunity(
      where: { 
        isDeleted: { _eq: false },
        ownerEmployeeId: { _neq: null },
        sourceApp: { _eq: $sourceApp }
      },
      limit: $limit
    ) {
      ownerEmployee {
        id
        firstName
        lastName
        displayName
      }
      ownerEmployeeId
    }
  }
`;

export const useGetEmployeesWithOpportunities = (context: BusinessAppContextProps): UseEmployeesWithOpportunitiesReturn => {
  const graphqlClient = useGraphQLClient(context.accessToken);
  
  const fetchEmployeesWithOpportunities = useCallback(async (sourceApp?: string): Promise<Employee[]> => {
    try {
      const result = await graphqlClient.request<{
        Opportunity: Array<{
          ownerEmployee: Employee | null;
          ownerEmployeeId: string | null;
        }>;
      }>(GET_EMPLOYEES_WITH_OPPORTUNITIES, { sourceApp });
      
      if (!result?.Opportunity) {
        return [];
      }

      // De-duplicate employees by ID
      const employeeMap = new Map<string, Employee>();
      
      result.Opportunity.forEach(opportunity => {
        if (opportunity.ownerEmployee && opportunity.ownerEmployeeId) {
          employeeMap.set(opportunity.ownerEmployeeId, opportunity.ownerEmployee);
        }
      });
      
      // Convert map to array and sort by display name
      return Array.from(employeeMap.values()).sort((a, b) => 
        a.displayName.localeCompare(b.displayName)
      );
    } catch (error) {
      console.error('Error fetching employees with opportunities:', error);
      throw error;
    }
  }, [graphqlClient]);

  return { fetchEmployeesWithOpportunities };
}; 