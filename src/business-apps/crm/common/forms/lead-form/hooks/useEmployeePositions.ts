import { useState, useCallback, useEffect } from "react";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";

const EMPLOYEES_PER_PAGE = 20;

export interface EmployeePositionData {
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

export interface EmployeePositionResponse {
  EmployeePosition: EmployeePositionData[];
  EmployeePositionAggregate: {
    aggregate: {
      count: number;
    };
  };
}

export interface EmployeePositionVariables {
  limit?: number;
  offset?: number;
  search?: string;
}

export interface UseEmployeePositionsProps {
  accessToken: string;
  search?: string;
}

export interface UseEmployeePositionsReturn {
  employeePositions: EmployeePositionData[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  total: number;
  loadMore: () => Promise<void>;
  searchEmployees: (searchTerm?: string) => void;
  retry: () => void;
}

export const GET_EMPLOYEE_POSITIONS = (
  variables: EmployeePositionVariables
): string => {
  const searchFilter = variables.search
    ? `, {
        _or: [
          { firstName: { _ilike: "${variables.search}" } }
          { lastName: { _ilike: "${variables.search}" } }
          { employee: { displayName: { _ilike: "${variables.search}" } } }
        ]
      }`
    : "";

  return `
    query GetEmployeePositions {
      EmployeePosition(
        limit: ${variables.limit || EMPLOYEES_PER_PAGE}
        offset: ${variables.offset || 0}
        where: {
          _and: [
            { employee: { isDeleted: { _eq: false } } }${searchFilter}
          ]
        }
        orderBy: [
          { firstName: ASC }
          { lastName: ASC }
        ]
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

      EmployeePositionAggregate(
        where: {
          _and: [
            { employee: { isDeleted: { _eq: false } } }${searchFilter}
          ]
        }
      ) {
        aggregate {
          count
        }
      }
    }
  `;
};

/**
 * Custom hook for fetching employee positions with infinite scroll and search functionality
 */
export const useEmployeePositions = ({
  accessToken,
  search,
}: UseEmployeePositionsProps): UseEmployeePositionsReturn => {
  const [employeePositions, setEmployeePositions] = useState<
    EmployeePositionData[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [currentSearch, setCurrentSearch] = useState<string | undefined>(
    search
  );
  const [initialized, setInitialized] = useState(false);

  const graphqlClient = useGraphQLClient(accessToken);

  // Load more employee positions with proper useCallback
  const loadMore = useCallback(async () => {
    if (loading || !hasMore || !accessToken || !graphqlClient) return;

    setLoading(true);
    setError(null);

    try {
      const variables: EmployeePositionVariables = {
        offset,
        limit: EMPLOYEES_PER_PAGE,
        search: currentSearch ? `%${currentSearch}%` : undefined,
      };

      const query = GET_EMPLOYEE_POSITIONS(variables);
      const result = await graphqlClient.request<EmployeePositionResponse>(
        query
      );

      const newEmployees = result.EmployeePosition || [];
      const totalCount = result.EmployeePositionAggregate.aggregate.count;

      // Append new data for infinite scroll
      setEmployeePositions((prev) =>
        offset === 0 ? newEmployees : [...prev, ...newEmployees]
      );

      setTotal(totalCount);

      // Calculate the new offset value
      const newOffset = offset + EMPLOYEES_PER_PAGE;
      setOffset(newOffset);

      // Set hasMore to false if we got fewer items than requested OR if we've loaded all items
      const hasMoreItems =
        newEmployees.length === EMPLOYEES_PER_PAGE && newOffset < totalCount;
      setHasMore(hasMoreItems);

      // Mark as initialized
      if (!initialized) {
        setInitialized(true);
      }
    } catch (err: any) {
      console.error("Error loading employee positions:", err);
      setError(err.message || "Failed to load employee positions");
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [accessToken, graphqlClient, offset, currentSearch, initialized]);

  // Search employees
  const searchEmployees = useCallback(
    (searchTerm?: string) => {
      // Only reset if search actually changed
      if (currentSearch !== searchTerm) {
        setCurrentSearch(searchTerm);
        setEmployeePositions([]);
        setOffset(0);
        setHasMore(true);
        setTotal(0);
        setError(null);
        setInitialized(false);
      }
    },
    [currentSearch]
  );

  // Retry loading
  const retry = useCallback(() => {
    setError(null);
    setHasMore(true);
    loadMore();
  }, [loadMore]);

  // Load initial data - simple mounted effect
  useEffect(() => {
    if (accessToken && !initialized && !loading) {
      loadMore();
    }
  }, [accessToken, initialized, loading, loadMore]);

  return {
    employeePositions,
    loading,
    error,
    hasMore,
    total,
    loadMore,
    searchEmployees,
    retry,
  };
};

// Legacy compatibility - keep the old interface for backward compatibility
export const useEmployeePositionsLegacy = (
  context: BusinessAppContextProps
) => {
  const { employeePositions, searchEmployees } = useEmployeePositions({
    accessToken: context.accessToken,
  });

  const searchEmployeePositions = useCallback(
    async (searchTerm: string = "") => {
      searchEmployees(searchTerm);
      return employeePositions;
    },
    [searchEmployees, employeePositions]
  );

  const getAllEmployeePositions = useCallback(async () => {
    return employeePositions;
  }, [employeePositions]);

  return {
    searchEmployeePositions,
    getAllEmployeePositions,
  };
};
