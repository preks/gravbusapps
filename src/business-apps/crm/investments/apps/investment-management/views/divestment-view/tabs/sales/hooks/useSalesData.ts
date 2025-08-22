import { useState, useCallback } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";

export interface SoldOpportunity {
  id: string;
  name: string;
  estimatedAmount: number;
  winningChance: number;
  closeDate: string;
  salesPipeline: {
    id: string;
    value: string;
    code: string;
    objectValue?: any;
  };
  salesPipelineStage: {
    id: string;
    value: string;
    code: string;
    objectValue?: any;
  };
  opportunityStatus: {
    id: string;
    value: string;
    code: string;
    objectValue?: any;
    displayValue: string; // Override for "Sold"
  };
  currency: {
    id: string;
    value: string;
    code: string;
    objectValue?: any;
  };
  account?: {
    id: string;
    name: string;
  };
  accountId: string;
  ownerEmployee?: {
    id: string;
    firstName: string;
    lastName: string;
    displayName: string;
    pictureThumbnail: string;
  };
  sourceApp: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesMetrics {
  totalSold: number;
  totalRevenue: number;
  averageRevenue: number;
  averageWinRate: number;
}

export interface UseSalesDataReturn {
  soldOpportunities: SoldOpportunity[];
  metrics: SalesMetrics | null;
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

interface UseSalesDataParams {
  search?: string;
  sortField: string;
  sortOrder: "ASC" | "DESC";
  context: BusinessAppContextProps;
}

const transformSoldOpportunityData = (apiOpportunity: any): SoldOpportunity => {
  return {
    id: apiOpportunity.id,
    name: apiOpportunity.name || "",
    estimatedAmount: apiOpportunity.estimatedAmount || 0,
    winningChance: apiOpportunity.winningChance || 0,
    closeDate: apiOpportunity.closeDate || "",
    salesPipeline: apiOpportunity.salesPipeline
      ? {
          id: apiOpportunity.salesPipeline.id,
          value: apiOpportunity.salesPipeline.value,
          code: apiOpportunity.salesPipeline.code,
          objectValue: apiOpportunity.salesPipeline.objectValue,
        }
      : { id: "", value: "", code: "", objectValue: undefined },
    salesPipelineStage: apiOpportunity.salesPipelineStage
      ? {
          id: apiOpportunity.salesPipelineStage.id,
          value: apiOpportunity.salesPipelineStage.value,
          code: apiOpportunity.salesPipelineStage.code,
          objectValue: apiOpportunity.salesPipelineStage.objectValue,
        }
      : { id: "", value: "", code: "", objectValue: undefined },
    opportunityStatus: apiOpportunity.opportunityStatus
      ? {
          id: apiOpportunity.opportunityStatus.id,
          value: apiOpportunity.opportunityStatus.value,
          code: apiOpportunity.opportunityStatus.code,
          objectValue: apiOpportunity.opportunityStatus.objectValue,
          // Override WON status to display as "Sold"
          displayValue: apiOpportunity.opportunityStatus.value === "WON" ? "Sold" : apiOpportunity.opportunityStatus.value,
        }
      : { id: "", value: "", code: "", objectValue: undefined, displayValue: "" },
    currency: apiOpportunity.currency
      ? {
          id: apiOpportunity.currency.id,
          value: apiOpportunity.currency.value,
          code: apiOpportunity.currency.code,
          objectValue: apiOpportunity.currency.objectValue,
        }
      : { id: "", value: "USD", code: "USD", objectValue: undefined },
    account: apiOpportunity.account
      ? {
          id: apiOpportunity.account.id,
          name: apiOpportunity.account.name,
        }
      : undefined,
    accountId: apiOpportunity.accountId || "",
    ownerEmployee: apiOpportunity.ownerEmployee
      ? {
          id: apiOpportunity.ownerEmployee.id,
          firstName: apiOpportunity.ownerEmployee.firstName || "",
          lastName: apiOpportunity.ownerEmployee.lastName || "",
          displayName:
            apiOpportunity.ownerEmployee.displayName ||
            `${apiOpportunity.ownerEmployee.firstName} ${apiOpportunity.ownerEmployee.lastName}`,
          pictureThumbnail: apiOpportunity.ownerEmployee.pictureThumbnail || "",
        }
      : undefined,
    sourceApp: apiOpportunity.sourceApp || "",
    createdAt: apiOpportunity.createdAt,
    updatedAt: apiOpportunity.updatedAt || "",
  };
};

export const useSalesData = (
  params: UseSalesDataParams
): UseSalesDataReturn => {
  const [soldOpportunities, setSoldOpportunities] = useState<SoldOpportunity[]>([]);
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const { request } = useGraphQLClient(params.context);

  const loadPage = useCallback(
    async (
      page: number,
      pageSize = 20,
      additionalFilters?: any,
      overrideSortField?: string,
      overrideSortOrder?: "ASC" | "DESC" | ""
    ) => {
      if (!params.context.accessToken) {
        console.warn("No access token provided for sales data loading");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const offset = (page - 1) * pageSize;

        // Build where conditions - filter for WON opportunities from divestments sourceApp
        const whereConditions: any[] = [
          { isDeleted: { _eq: false } },
          { sourceApp: { _eq: "divestments" } },
          { status: { _eq: "WON" } }
        ];

        // Add search functionality
        const search = additionalFilters?.search || params.search;
        if (search?.trim()) {
          const searchTerm = `%${search.trim()}%`;
          const isNumber = !isNaN(Number(search));

          const searchConditions: any[] = [
            { name: { _ilike: searchTerm } },
            { account: { name: { _ilike: searchTerm } } },
            { ownerEmployee: { firstName: { _ilike: searchTerm } } },
            { ownerEmployee: { lastName: { _ilike: searchTerm } } },
            { ownerEmployee: { displayName: { _ilike: searchTerm } } },
            { salesPipelineStage: { value: { _ilike: searchTerm } } },
            { salesPipeline: { value: { _ilike: searchTerm } } }
          ];

          // Add number-specific conditions if the search term can be parsed as a number
          if (isNumber) {
            const numericValue = Number(search);
            searchConditions.push({ estimatedAmount: { _eq: numericValue } });
            searchConditions.push({ winningChance: { _eq: numericValue } });
          }

          whereConditions.push({ _or: searchConditions });
        }

        // Combine all where conditions with _and
        const whereCondition = { _and: whereConditions };

        // Build order by condition
        let orderBy: any[] = [];
        const sortField = overrideSortField || params.sortField;
        const sortOrder = overrideSortOrder || params.sortOrder;

        if (sortField && sortField !== "") {
          const sortCondition: any = {};

          if (sortField === "name") {
            sortCondition.name = sortOrder === "ASC" ? "ASC_NULLS_LAST" : "DESC_NULLS_LAST";
          } else if (sortField === "estimatedAmount") {
            sortCondition.estimatedAmount = sortOrder === "ASC" ? "ASC_NULLS_LAST" : "DESC_NULLS_LAST";
          } else if (sortField === "winningChance") {
            sortCondition.winningChance = sortOrder === "ASC" ? "ASC_NULLS_LAST" : "DESC_NULLS_LAST";
          } else if (sortField === "closeDate") {
            sortCondition.closeDate = sortOrder === "ASC" ? "ASC_NULLS_LAST" : "DESC_NULLS_LAST";
          } else if (sortField === "createdAt") {
            sortCondition.createdAt = sortOrder === "ASC" ? "ASC_NULLS_LAST" : "DESC_NULLS_LAST";
          } else if (sortField === "ownerEmployeeId") {
            sortCondition.ownerEmployee = {
              displayName: sortOrder === "ASC" ? "ASC_NULLS_LAST" : "DESC_NULLS_LAST",
            };
          } else if (sortField === "stage") {
            sortCondition.salesPipelineStage = {
              value: sortOrder === "ASC" ? "ASC_NULLS_LAST" : "DESC_NULLS_LAST",
            };
          } else if (sortField === "pipeline") {
            sortCondition.salesPipeline = {
              value: sortOrder === "ASC" ? "ASC_NULLS_LAST" : "DESC_NULLS_LAST",
            };
          } else if (sortField === "accountId") {
            sortCondition.account = {
              name: sortOrder === "ASC" ? "ASC_NULLS_LAST" : "DESC_NULLS_LAST",
            };
          }

          if (Object.keys(sortCondition).length > 0) {
            orderBy = [sortCondition];
          }
        }

        // Default sorting if no specific sort is provided
        if (orderBy.length === 0) {
          orderBy = [{ closeDate: "DESC_NULLS_LAST" }];
        }

        const query = `
          query GetSoldOpportunities($offset: Int!, $limit: Int!, $where: OpportunityBoolExp!, $orderBy: [OpportunityOrderBy!]!) {
            Opportunity(offset: $offset, limit: $limit, where: $where, orderBy: $orderBy) {
              id
              name
              estimatedAmount
              winningChance
              closeDate
              status
              sourceApp
              createdAt
              updatedAt
              accountId
              salesPipeline {
                id
                value
                code
                objectValue
              }
              salesPipelineStage {
                id
                value
                code
                objectValue
              }
              opportunityStatus {
                id
                value
                code
                objectValue
              }
              currency {
                id
                value
                code
                objectValue
              }
              account {
                id
                name
              }
              ownerEmployee {
                id
                firstName
                lastName
                displayName
                pictureThumbnail
              }
            }
            OpportunityAggregate(where: $where) {
              aggregate {
                count
                sum {
                  estimatedAmount
                }
                avg {
                  estimatedAmount
                  winningChance
                }
              }
            }
          }
        `;

        const result = await request(query, {
          offset,
          limit: pageSize,
          where: whereCondition,
          orderBy,
        });

        if (result?.Opportunity) {
          const transformedOpportunities = result.Opportunity.map(transformSoldOpportunityData);
          setSoldOpportunities(transformedOpportunities);

          const aggregateData = result.OpportunityAggregate?.aggregate;
          const totalCount = aggregateData?.count || 0;
          setTotal(totalCount);
          setHasMore(offset + pageSize < totalCount);

          // Calculate metrics for sold opportunities
          if (aggregateData) {
            const metricsData: SalesMetrics = {
              totalSold: totalCount,
              totalRevenue: aggregateData.sum?.estimatedAmount || 0,
              averageRevenue: aggregateData.avg?.estimatedAmount || 0,
              averageWinRate: aggregateData.avg?.winningChance || 0,
            };
            setMetrics(metricsData);
          }
        }
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to load sales data")
        );
        console.error("Error loading sales data:", err);
      } finally {
        setLoading(false);
      }
    },
    [
      request,
      params.search,
      params.sortField,
      params.sortOrder,
      params.context.accessToken,
    ]
  );

  const loadMore = useCallback(() => {
    console.log("Load more sales data requested");
    // Implementation for infinite scroll if needed
  }, []);

  const retry = useCallback(() => {
    console.log("Retrying sales data load");
    // Will be implemented with actual retry logic
  }, []);

  return {
    soldOpportunities,
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
