import { useState, useCallback } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { Lead } from "@/business-apps/crm/customers/apps/customer-relations/views/lead-view/types";
import {
  useEmployeeLeadsQueries,
  EmployeeLeadsQueryVariables,
} from "../queries/EmployeeLeadsQueries";
import { enforceQueryLimit } from "@/business-apps/crm/common/utils/queryLimits";
import companyForm from "@/wrapped-entries/mdm/forms/company-form";

interface UseEmployeeLeadsDataProps {
  employeeId: string;
  search?: string;
  sortField?: string;
  sortOrder?: "ASC" | "DESC";
  accessToken: string;
  additionalFilters?: any;
}

interface UseEmployeeLeadsDataReturn {
  leads: Lead[];
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

export const useEmployeeLeadsData = ({
  employeeId,
  search = "",
  sortField = "createdAt",
  sortOrder = "DESC",
  accessToken,
  additionalFilters = {},
}: UseEmployeeLeadsDataProps): UseEmployeeLeadsDataReturn => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [hasMore, setHasMore] = useState(true);

  const { fetchEmployeeLeads } = useEmployeeLeadsQueries({
    accessToken,
  } as BusinessAppContextProps);

  const loadPage = useCallback(
    async (
      targetPage: number,
      newPageSize: number = pageSize,
      overrideFilters: any = undefined
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
            { companyEmail: { _ilike: `%${search}%` } },
            { companyWebsite: { _ilike: `%${search}%` } },
            { companyName: { _ilike: `%${search}%` } },
            { leadStatus: { value: { _ilike: `%${search}%` } } },
            { leadRating: { value: { _ilike: `%${search}%` } } },
            {
              _or: [
                { contact: { firstName: { _ilike: `%${search}%` } } },
                { contact: { lastName: { _ilike: `%${search}%` } } },
              ],
            },
            { contact: { email: { _ilike: `%${search}%` } } },
          ];
          conditions.push({ _or: searchConditions });
        }

        // Add additional filters
        const filtersToApply =
          overrideFilters !== undefined ? overrideFilters : additionalFilters;
        if (filtersToApply && Object.keys(filtersToApply).length > 0) {
          conditions.push(filtersToApply);
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
          if (sortField === "firstName") {
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
        const variables: EmployeeLeadsQueryVariables = {
          employeeId,
          offset,
          limit: safePageSize,
          orderBy: [orderBy],
          where,
        };

        const result = await fetchEmployeeLeads(variables);

        setLeads(result.Lead || []);
        setTotal(result.LeadAggregate?.aggregate?.count || 0);
        setCurrentPage(targetPage);
        setPageSize(safePageSize);
        setHasMore((result.Lead || []).length === safePageSize);
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to load employee leads")
        );
        setLeads([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [
      employeeId,
      fetchEmployeeLeads,
      search,
      pageSize,
      sortField,
      sortOrder,
      additionalFilters,
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
    leads,
    total,
    loading,
    error,
    hasMore,
    loadMore,
    loadPage,
    retry,
  };
};
