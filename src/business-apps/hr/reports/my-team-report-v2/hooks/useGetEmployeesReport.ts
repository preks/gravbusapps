"use client";

import { useEffect, useState, useCallback } from 'react';
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient';

/**
 * Employee type definition for the directory.
 */
export interface Employee {
  startDate?: string;
  exitDate?: string | null;
  tenure?: string;
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  jobPosition: string;
  location: string;
  locationDetails?: {
    id?: string;
  };
  email: string;
  profilePicture: string;
  employmentType?: string;
  contractType?: string;
}

/**
 * Filters for the employee directory query.
 */

const EMPLOYEE_POSITION_QUERY = `
  query EmployeePositions($limit: Int!) {
    EmployeePosition(
      limit: $limit,
      orderBy: [{ firstName: ASC }, { lastName: ASC }],
      where: {
        _and: [
          { jobPositionId: { _isNull: false } },
          { employeeId: { _isNull: false } }
        ]
      }
    ) {
      employeeId
      userId
      supervisor {
        id
        firstName
        lastName
      }
      firstName
      lastName
      jobPosition {
        name
      }
      siteLocation {
        name
        id
      }
      organizationalUnit {
        name
        id
      }
      employee {
        id
        pictureThumbnail
        workingCondition {
          contractType {
            value
          }
          employmentType {
            value
          }
          hireDate
          exitDate
        }
      }
    }
  }
`;

/**
 * Helper function to calculate the tenure from start date to now or exit date
 * @param startDate The employee's start date
 * @param exitDate The employee's exit date (if any)
 * @returns A formatted string representing the tenure
 */
function calculateTenure(startDate: string | undefined, exitDate: string | null | undefined): string {
  if (!startDate) return '';
  
  const start = new Date(startDate);
  const end = exitDate ? new Date(exitDate) : new Date();
  
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';
  
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  let result = '';
  
  if (years > 0) {
    result += `${years} ${years === 1 ? 'year' : 'years'}`;
  }
  
  if (months > 0) {
    if (result) result += ', ';
    result += `${months} ${months === 1 ? 'month' : 'months'}`;
  }
  
  if (!result) {
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    result = `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`;
  }
  
  return result;
}

/**
 * Custom hook to fetch all employees for the report.
 * @param accessToken The access token for authentication.
 * @returns All employees, loading state, error, and a retry function.
 */
export function useGetEmployeesReport({ accessToken }: { accessToken: string; }) {
  const ALL_EMPLOYEES_LIMIT = 10000;
  const client = useGraphqlClient(accessToken);
  
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchEmployees = useCallback(() => {
    if (typeof window === 'undefined' || !client) return;

    setLoading(true);
    setError(null);

    const variables = {
      limit: ALL_EMPLOYEES_LIMIT,
    };

    client.request?.(EMPLOYEE_POSITION_QUERY, variables)
      .then((res: any) => {
        if (!res) {
          throw new Error('No response from GraphQL query');
        }
        const employeePositions = res.EmployeePosition ?? [];
        const newEmployees = employeePositions.map((ep: any) => {
          const workingCondition = ep.employee?.workingCondition?.[0];
          const startDate = workingCondition?.hireDate ?? '';
          const exitDate = workingCondition?.exitDate ?? null;
          
          return {
            id: ep.employeeId,
            userId: ep.userId,
            supervisor: ep.supervisor,
            firstName: ep.firstName,
            lastName: ep.lastName,
            jobPosition: ep.jobPosition?.name ?? '',
            location: ep.siteLocation?.name || ep.organizationalUnit?.name || '',
            locationDetails: {
              id: ep.siteLocation?.id
            },
            email: '',
            employmentType: workingCondition?.employmentType?.value ?? '',
            contractType: workingCondition?.contractType?.value ?? '',
            profilePicture: ep.employee?.pictureThumbnail ?? '',
            startDate,
            exitDate,
            tenure: calculateTenure(startDate, exitDate)
          };
        });
        setEmployees(newEmployees);
      })
      .catch((err: any) => {
        console.error('Error fetching employees:', err);
        setError(err);
        setEmployees([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [client]);

  useEffect(() => {
    if (accessToken) {
      fetchEmployees();
    }
  }, [accessToken, fetchEmployees]);

  const retry = useCallback(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  return { employees, loading, error, retry };
}
