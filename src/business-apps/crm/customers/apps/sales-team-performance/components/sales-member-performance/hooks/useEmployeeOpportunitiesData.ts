import { useState, useCallback } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { CustomerOpportunity as Opportunity } from "@/common/data/customer/types/customerRelationTypes";
import {
  useEmployeeOpportunitiesQueries,
  EmployeeOpportunitiesQueryVariables,
} from "../queries/EmployeeOpportunitiesQueries";
import { enforceQueryLimit } from "@/business-apps/crm/common/utils/queryLimits";

interface UseEmployeeOpportunitiesDataProps {
  employeeId: string;
  search?: string;
  sortField?: string;
  sortOrder?: "ASC" | "DESC";
  accessToken: string;
}

interface UseEmployeeOpportunitiesDataReturn {
  opportunities: Opportunity[];
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

export const useEmployeeOpportunitiesData = ({
  employeeId,
  search = "",
  sortField = "createdAt",
  sortOrder = "DESC",
  accessToken,
}: UseEmployeeOpportunitiesDataProps): UseEmployeeOpportunitiesDataReturn => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [hasMore, setHasMore] = useState(true);

  const { fetchEmployeeOpportunities } = useEmployeeOpportunitiesQueries({
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
            { salesPipeline: { value: { _ilike: `%${search}%` } } },
            { salesPipelineStage: { value: { _ilike: `%${search}%` } } },
            { account: { name: { _ilike: `%${search}%` } } },
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

        let orderBy: any = {};
        if (sortField && sortField !== "") {
          if (sortField === "name") {
            orderBy = {
              name: sortOrder === "ASC" ? "ASC_NULLS_LAST" : "DESC_NULLS_LAST",
            };
          } else if (sortField === "stage") {
            orderBy = {
              salesPipelineStage: {
                value:
                  sortOrder === "ASC" ? "ASC_NULLS_LAST" : "DESC_NULLS_LAST",
              },
            };
          } else if (sortField === "pipeline") {
            orderBy = {
              salesPipeline: {
                value:
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

        const variables: EmployeeOpportunitiesQueryVariables = {
          employeeId,
          offset,
          limit: safePageSize,
          orderBy: [orderBy],
          where,
        };
        const result = await fetchEmployeeOpportunities(variables);

        setOpportunities(result.Opportunity || []);
        setTotal(result.OpportunityAggregate?.aggregate?.count || 0);
        setCurrentPage(targetPage);
        setPageSize(safePageSize);
        setHasMore((result.Opportunity || []).length === safePageSize);
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to load employee opportunities")
        );
        setOpportunities([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [
      employeeId,
      fetchEmployeeOpportunities,
      search,
      pageSize,
      sortField,
      sortOrder,
    ]
  );

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    loadPage(currentPage + 1);
  }, [hasMore, loading, currentPage, loadPage]);

  const retry = useCallback(() => {
    loadPage(currentPage);
  }, [currentPage, loadPage]);

  return {
    opportunities,
    total,
    loading,
    error,
    hasMore,
    loadMore,
    loadPage,
    retry,
  };
};
