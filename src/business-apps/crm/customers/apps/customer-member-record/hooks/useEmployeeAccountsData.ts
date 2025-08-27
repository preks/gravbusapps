import { useState, useCallback } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
// Account interface matching the GraphQL schema
interface EmployeeAccount {
  id: string;
  version?: number;
  name: string;
  website?: string;
  legalForm?: {
    value: string;
    code: string;
    id: string;
    objectValue?: any;
  };
  numberOfEmployees?: {
    value: string;
  };
  contact?: {
    id?: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  }[];
  addresses?: {
    city: string;
    country: {
      id: string;
      value: string;
      code: string;
    };
    region: {
      id: string;
      value: string;
      code: string;
    };
  }[];
  foundationDate?: string;
  industry?: {
    id: string;
    code: string;
    value: string;
    objectValue?: any;
  };
  ownerEmployee?: {
    id: string;
    lastName: string;
    firstName: string;
    pictureThumbnail?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}
import {
  useEmployeeAccountsQueries,
  EmployeeAccountsQueryVariables,
} from "../queries/EmployeeAccountsQueries";
import { enforceQueryLimit } from "@/business-apps/crm/common/utils/queryLimits";

interface UseEmployeeAccountsDataProps {
  employeeId: string;
  search?: string;
  sortField?: string;
  sortOrder?: "ASC" | "DESC";
  accessToken: string;
}

interface UseEmployeeAccountsDataReturn {
  accounts: EmployeeAccount[];
  total: number;
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  loadPage: (
    page: number,
    pageSize?: number,
    additionalFilters?: any
  ) => Promise<void>;
  retry: () => void;
}

export const useEmployeeAccountsData = ({
  employeeId,
  search = "",
  sortField = "createdAt",
  sortOrder = "DESC",
  accessToken,
}: UseEmployeeAccountsDataProps): UseEmployeeAccountsDataReturn => {
  const [accounts, setAccounts] = useState<EmployeeAccount[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [hasMore, setHasMore] = useState(true);

  const { fetchEmployeeAccounts } = useEmployeeAccountsQueries({
    accessToken,
  } as BusinessAppContextProps);

  const loadPage = useCallback(
    async (
      targetPage: number,
      newPageSize: number = pageSize,
      additionalFilters: any = {}
    ) => {
      if (!employeeId) {
        setError(new Error("Employee ID is required"));
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Enforce query limit to ensure optimal performance
        const safePageSize = enforceQueryLimit(newPageSize);
        const offset = (targetPage - 1) * safePageSize;

        // Build where clause for additional filters
        const conditions: any[] = [];

        // Add search conditions
        if (search) {
          const searchConditions = [
            { name: { _ilike: `%${search}%` } },
            { website: { _ilike: `%${search}%` } },
            { industry: { value: { _ilike: `%${search}%` } } },
            { legalForm: { value: { _ilike: `%${search}%` } } },
            { contact: { firstName: { _ilike: `%${search}%` } } },
            { contact: { lastName: { _ilike: `%${search}%` } } },
            { contact: { email: { _ilike: `%${search}%` } } },
            { contact: { phone: { _ilike: `%${search}%` } } },
          ];
          conditions.push({ _or: searchConditions });
        }

        // Add additional filters
        if (Object.keys(additionalFilters).length > 0) {
          conditions.push(additionalFilters);
        }

        const where =
          conditions.length === 0
            ? undefined
            : {
                _and: conditions,
              };

        // Build orderBy based on sortField and sortOrder
        let orderBy: any = {};
        if (sortField && sortField !== "") {
          if (sortField === "legalForm") {
            orderBy = {
              legalForm: {
                value:
                  sortOrder === "ASC" ? "ASC_NULLS_LAST" : "DESC_NULLS_LAST",
              },
            };
          } else if (sortField === "industry") {
            orderBy = {
              industry: {
                value:
                  sortOrder === "ASC" ? "ASC_NULLS_LAST" : "DESC_NULLS_LAST",
              },
            };
          } else if (sortField === "contact") {
            orderBy = {
              contact: {
                lastName:
                  sortOrder === "ASC" ? "ASC_NULLS_LAST" : "DESC_NULLS_LAST",
                firstName:
                  sortOrder === "ASC" ? "ASC_NULLS_LAST" : "DESC_NULLS_LAST",
              },
            };
          } else {
            orderBy[sortField] =
              sortOrder === "ASC" ? "ASC_NULLS_LAST" : "DESC_NULLS_LAST";
          }
        } else {
          // No sorting - use natural order (by ID)
          orderBy.id = "ASC_NULLS_LAST";
        }

        const variables: EmployeeAccountsQueryVariables = {
          employeeId,
          offset,
          limit: safePageSize,
          orderBy: [orderBy],
          where,
        };
        const result = await fetchEmployeeAccounts(variables);

        setAccounts(result.Account || []);
        setTotal(result.AccountAggregate?.aggregate?.count || 0);
        setCurrentPage(targetPage);
        setPageSize(safePageSize);
        setHasMore((result.Account || []).length === safePageSize);
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to load employee accounts")
        );
        setAccounts([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [employeeId, fetchEmployeeAccounts, search, pageSize, sortField, sortOrder]
  );

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    loadPage(currentPage + 1);
  }, [hasMore, loading, currentPage, loadPage]);

  const retry = useCallback(() => {
    loadPage(currentPage);
  }, [currentPage, loadPage]);

  return {
    accounts,
    total,
    loading,
    error,
    hasMore,
    loadMore,
    loadPage,
    retry,
  };
};
