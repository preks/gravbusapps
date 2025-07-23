import { useState, useEffect, useCallback } from "react";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";

export interface EmployeeByIdData {
  id: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  hireDate: string | null;
  employee: {
    id: string;
    displayName: string;
    picture: string | null;
    pictureThumbnail: string | null;
    userId: string | null;
  };
  jobPosition: {
    id: string;
    name: string;
    jobFunction: {
      name: string;
    } | null;
    jobLevel: {
      name: string;
    } | null;
  };
  organizationalUnit: {
    id: string;
    name: string;
    code: string | null;
    description: string;
  };
}

export interface EmployeeByIdResponse {
  EmployeePosition: EmployeeByIdData[];
}

export interface UseEmployeeByIdProps {
  accessToken: string;
  employeeId?: string;
}

export interface UseEmployeeByIdReturn {
  employee: EmployeeByIdData | null;
  loading: boolean;
  error: string | null;
  fetchEmployee: (id: string) => Promise<void>;
}

export const GET_EMPLOYEE_BY_ID = (employeeId: string): string => {
  return `
    query GetEmployeeById {
      EmployeePosition(
        where: { employeeId: { _eq: "${employeeId}" } }
        limit: 1
      ) {
        id
        employeeId
        firstName
        lastName
        hireDate
        employee {
          id
          displayName
          picture
          pictureThumbnail
          userId
        }
        jobPosition {
          id
          name
          jobFunction {
            name
          }
          jobLevel {
            name
          }
        }
        organizationalUnit {
          id
          name
          code
          description
        }
      }
    }
  `;
};

/**
 * Custom hook for fetching a single employee by ID
 */
export const useEmployeeById = ({ accessToken, employeeId }: UseEmployeeByIdProps): UseEmployeeByIdReturn => {
  const [employee, setEmployee] = useState<EmployeeByIdData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const graphqlClient = useGraphQLClient(accessToken);

  // Fetch employee by ID
  const fetchEmployee = useCallback(
    async (id: string) => {
      if (!accessToken || !graphqlClient) return;

      setLoading(true);
      setError(null);

      try {
        const query = GET_EMPLOYEE_BY_ID(id);
        const result = await graphqlClient.request<EmployeeByIdResponse>(query);

        const employeeData = result.EmployeePosition?.[0] || null;
        setEmployee(employeeData);

        if (!employeeData) {
          setError(`Employee with ID ${id} not found`);
        }
      } catch (err: any) {
        console.error("Error fetching employee by ID:", err);
        setError(err.message || "Failed to fetch employee");
        setEmployee(null);
      } finally {
        setLoading(false);
      }
    },
    [accessToken, graphqlClient]
  );

  // Auto-fetch if employeeId is provided
  useEffect(() => {
    if (employeeId) {
      fetchEmployee(employeeId);
    }
  }, [employeeId, fetchEmployee]);

  return {
    employee,
    loading,
    error,
    fetchEmployee,
  };
};
