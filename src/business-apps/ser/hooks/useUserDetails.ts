import { useState, useEffect } from 'react';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';

export interface EmployeeInfo {
  id: string;
  businessKey?: string;
  firstName?: string;
  lastName?: string;
}

export interface UseUserDetailsProps extends BusinessAppContextProps {
  employeeId?: string;
}

export interface UseUserDetailsResult {
  employee: EmployeeInfo | null;
  isLoading: boolean;
  error: string | null;
}

const GET_EMPLOYEE_DETAILS_QUERY = `
  query GetEmployeeDetails($employeeId: uuid!) {
    Employee(where: { id: { _eq: $employeeId } }) {
      id
      businessKey
      firstName
      lastName
    }
  }
`;

const GET_USER_BY_USERID_QUERY = `
  query GetUserByUserId($userId: String!) {
    BusinessPartnerPerson(where: { userId: { _eq: $userId } }) {
      id
      firstName
      lastName
      preferredName
      userId
    }
  }
`;


/**
 * Hook to fetch user details by user ID/UUID using GraphQL
 * Tries Employee.id first, then BusinessPartnerPerson.userId as fallback
 * Used to display real names instead of just user IDs/UUIDs
 * 
 * TEMPORARY IMPLEMENTATION:
 * - Uses BusinessPartnerPerson table as fallback for user resolution
 * - Will be replaced with proper NEWWORK platform user management API
 * - Easy to swap out later when correct user service is provided
 */
export const useUserDetails = ({
  employeeId,
  accessToken,
}: UseUserDetailsProps): UseUserDetailsResult => {
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
        console.log(`🔍 [useUserDetails] Fetching user details for UUID: ${employeeId}`);
        
        // First try: Employee table lookup by ID
        const employeeResponse = await graphqlClient.request(GET_EMPLOYEE_DETAILS_QUERY, {
          employeeId: employeeId
        });

        console.log(`📋 [useUserDetails] Employee lookup response:`, employeeResponse);

        if (employeeResponse?.Employee && employeeResponse.Employee.length > 0) {
          const employeeData = employeeResponse.Employee[0];
          setEmployee(employeeData);
          console.log(`✅ [useUserDetails] Employee found by ID: ${employeeData.firstName} ${employeeData.lastName}`);
          return;
        }

        // Second try: BusinessPartnerPerson lookup by userId field
        console.log(`🔍 [useUserDetails] No Employee found, trying BusinessPartnerPerson.userId lookup...`);
        
        const userResponse = await graphqlClient.request(GET_USER_BY_USERID_QUERY, {
          userId: employeeId
        });

        console.log(`📋 [useUserDetails] BusinessPartnerPerson lookup response:`, userResponse);

        if (userResponse?.BusinessPartnerPerson && userResponse.BusinessPartnerPerson.length > 0) {
          const personData = userResponse.BusinessPartnerPerson[0];
          
          // Convert BusinessPartnerPerson to EmployeeInfo format
          const employeeData: EmployeeInfo = {
            id: personData.id,
            businessKey: personData.userId,
            firstName: personData.firstName,
            lastName: personData.lastName,
          };
          
          setEmployee(employeeData);
          console.log(`✅ [useUserDetails] User found via BusinessPartnerPerson: ${employeeData.firstName} ${employeeData.lastName}`);
          return;
        }

        console.log(`⚠️ [useUserDetails] No user found for UUID: ${employeeId} in Employee or BusinessPartnerPerson tables`);
        setEmployee(null);
        
      } catch (err) {
        console.error(`❌ [useUserDetails] Error fetching user details:`, err);
        setError(`Failed to fetch user details: ${err instanceof Error ? err.message : 'Unknown error'}`);
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
  if (!employee) {
    // Create readable fallback for UUIDs (temporary until proper user management)
    if (fallback && fallback.length === 36 && fallback.includes('-')) {
      return `User (${fallback.substring(0, 8)}...)`;
    }
    return fallback || 'Unknown User';
  }
  
  if (employee.firstName && employee.lastName) {
    return `${employee.firstName} ${employee.lastName}`;
  }
  
  if (employee.firstName) return employee.firstName;
  if (employee.lastName) return employee.lastName;
  if (employee.businessKey) return employee.businessKey;
  if (employee.id) return employee.id;
  
  return fallback || 'Unknown User';
};
