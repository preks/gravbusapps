import { useState, useEffect } from 'react';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface EmployeeInfo {
  id: string;
  businessKey?: string;
  firstName?: string;
  lastName?: string;
}

export interface UseEmployeeDetailsProps extends BusinessAppContextProps {
  employeeId?: string;
}

export interface UseEmployeeDetailsResult {
  employee: EmployeeInfo | null;
  isLoading: boolean;
  error: string | null;
}

const GET_EMPLOYEE_DETAILS_QUERY = `
  query GetEmployeeDetails($employeeId: uuid!) {
    Employee(where: { businessKey: { _eq: $employeeId } }) {
      id
      businessKey
      firstName
      lastName
    }
  }
`;

/**
 * Hook to fetch employee details by employee ID using GraphQL
 * Used to display real names instead of just employee IDs
 */
export const useEmployeeDetails = ({
  employeeId,
  accessToken,
}: UseEmployeeDetailsProps): UseEmployeeDetailsResult => {
  const [employee, setEmployee] = useState<EmployeeInfo | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const graphqlClient = useGraphqlClient(accessToken);

  useEffect(() => {
    const fetchEmployeeDetails = async () => {
      if (!employeeId || !accessToken) {
        setEmployee(null);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        console.log(`🔍 [useEmployeeDetails] Fetching details for employee: ${employeeId}`);
        
        const response = await graphqlClient.request(GET_EMPLOYEE_DETAILS_QUERY, {
          employeeId: employeeId
        });

        console.log(`📋 [useEmployeeDetails] GraphQL response:`, response);

        if (response?.Employee && response.Employee.length > 0) {
          const employeeData = response.Employee[0];
          setEmployee(employeeData);
          console.log(`✅ [useEmployeeDetails] Employee found: ${employeeData.firstName} ${employeeData.lastName}`);
        } else {
          console.log(`⚠️ [useEmployeeDetails] No employee found for ID: ${employeeId}`);
          setEmployee(null);
        }
        
      } catch (err) {
        console.error(`❌ [useEmployeeDetails] Error fetching employee details:`, err);
        setError(`Failed to fetch employee details: ${err instanceof Error ? err.message : 'Unknown error'}`);
        setEmployee(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEmployeeDetails();
  }, [employeeId, accessToken, graphqlClient]);

  return {
    employee,
    isLoading,
    error,
  };
};

/**
 * Get display name from employee info
 */
export const getEmployeeDisplayName = (employee: EmployeeInfo | null, fallback?: string): string => {
  if (!employee) return fallback || 'Unknown User';
  
  if (employee.firstName && employee.lastName) {
    return `${employee.firstName} ${employee.lastName}`;
  }
  
  if (employee.firstName) return employee.firstName;
  if (employee.lastName) return employee.lastName;
  if (employee.businessKey) return employee.businessKey;
  if (employee.id) return employee.id;
  
  return fallback || 'Unknown User';
};
