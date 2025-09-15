import { useState, useCallback } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGetInvestmentOpportunities } from "@/common/data/investment/hooks/useInvestmentOpportunities";
import type { InvestmentOpportunity } from "@/common/data/investment/types";
import type { InvestmentOpportunityQueryVariables } from "@/common/data/investment/queries/investmentOpportunityQueries";

// Use InvestmentOpportunity directly - no need for custom interface
export type ExitOpportunity = InvestmentOpportunity;

export interface ExitOpportunitiesMetrics {
  totalCount: number;
  totalValue: number;
  averageValue: number;
  averageWinRate: number;
  totalWonValue: number;
  wonCount: number;
}

export interface UseExitOpportunitiesDataReturn {
  opportunities: ExitOpportunity[];
  metrics: ExitOpportunitiesMetrics | null;
  total: number;
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadPage: (
    page: number,
    pageSize?: number,
    additionalFilters?: any,
    overrideSortField?: string,
    overrideSortOrder?: "ASC" | "DESC" | ""
  ) => Promise<void>;
  loadMore: () => void;
  retry: () => void;
}

interface UseExitOpportunitiesDataParams {
  search?: string;
  sortField: string;
  sortOrder: "ASC" | "DESC";
  context: BusinessAppContextProps;
  statusFilter?: "all" | "won" | "active";
}

// No transformation needed - using InvestmentOpportunity directly

export const useExitOpportunitiesData = (
  params: UseExitOpportunitiesDataParams
): UseExitOpportunitiesDataReturn => {
  const [opportunities, setOpportunities] = useState<ExitOpportunity[]>([]);
  const [metrics, setMetrics] = useState<ExitOpportunitiesMetrics | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const { fetchInvestmentOpportunities } = useGetInvestmentOpportunities(params.context);

  const loadPage = useCallback(
    async (
      page: number,
      pageSize = 20,
      additionalFilters?: {
        search?: string;
        ownerEmployeeIds?: string[];
        createdAfter?: string;
        createdBefore?: string;
      },
      overrideSortField?: string,
      overrideSortOrder?: "ASC" | "DESC" | ""
    ) => {
      if (!params.context.accessToken) {
        console.warn("No access token provided for exit opportunities data loading");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Build query variables for InvestmentOpportunity
        const variables: InvestmentOpportunityQueryVariables = {
          limit: pageSize,
          offset: (page - 1) * pageSize,
          dealType: "DIVESTMENT_DEAL", // Filter for divestment opportunities using dealType
          search: additionalFilters?.search || params.search,
          ownerEmployeeIds: additionalFilters?.ownerEmployeeIds,
          createdAfter: additionalFilters?.createdAfter,
          createdBefore: additionalFilters?.createdBefore,
        };

        // Add sorting
        const sortField = overrideSortField || params.sortField;
        const sortOrder = overrideSortOrder || params.sortOrder;
        
        if (sortField && sortField !== "" && sortOrder) {
          variables.orderBy = [{
            field: sortField,
            direction: sortOrder === "ASC" ? "ASC_NULLS_LAST" : "DESC_NULLS_LAST"
          }];
        }

        // Fetch using InvestmentOpportunity API
        const result = await fetchInvestmentOpportunities(variables);

        if (result?.InvestmentOpportunity) {
          setOpportunities(result.InvestmentOpportunity);
          
          const totalCount = result.InvestmentOpportunityAggregate?.aggregate?.count || 0;
          setTotal(totalCount);
          setHasMore((page * pageSize) < totalCount);

          // Calculate metrics from the data
          const opportunities = result.InvestmentOpportunity;
          const totalValue = opportunities.reduce((sum, opp) => sum + (opp.estimatedAmount || 0), 0);
          const averageValue = opportunities.length > 0 ? totalValue / opportunities.length : 0;
          
          // For won opportunities, we need to check status or other criteria
          const wonOpportunities = opportunities.filter(opp => 
            opp.opportunityStatus?.alternativeCode?.toUpperCase() === "WON" ||
            opp.opportunityStatus?.value?.toUpperCase() === "WON"
          );
          
          const metricsData: ExitOpportunitiesMetrics = {
            totalCount: totalCount,
            totalValue: totalValue,
            averageValue: averageValue,
            averageWinRate: opportunities.length > 0 ? 
              opportunities.reduce((sum, opp) => sum + (opp.probability || 0), 0) / opportunities.length : 0,
            wonCount: wonOpportunities.length,
            totalWonValue: wonOpportunities.reduce((sum, opp) => sum + (opp.estimatedAmount || 0), 0),
          };
          setMetrics(metricsData);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to load exit opportunities")
        );
        console.error("Error loading exit opportunities:", err);
      } finally {
        setLoading(false);
      }
    },
    [
      fetchInvestmentOpportunities,
      params.search,
      params.sortField,
      params.sortOrder,
      params.statusFilter,
      params.context.accessToken,
    ]
  );

  const loadMore = useCallback(() => {
    console.log("Load more exit opportunities requested");
    // Implementation for infinite scroll if needed
  }, []);

  const retry = useCallback(() => {
    console.log("Retrying exit opportunities data load");
    // Will be implemented with actual retry logic
  }, []);

  return {
    opportunities,
    metrics,
    total,
    loading,
    error,
    hasMore,
    loadMore,
    loadPage,
    retry,
  };
};
