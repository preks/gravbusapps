import { useState, useCallback } from "react";
import { Opportunity, UseOpportunityListDataReturn } from "../types";
import {
  useGetOpportunitiesData,
  OpportunityData,
} from "../queries/OpportunityQueries";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { enforceQueryLimit } from "../../../utils/queryLimits";

const temporaryMapToStage = (stage: string) => {
  return (
    {
      UNKNOWN_STAGE: "Unknown Stage",
      NEW_OPPORTUNITY: "New Opportunity",
      IN_QUALIFICATION: "In Qualification",
      PROPOSAL: "Proposal",
      PROPOSAL_IN_PROGRESS: "Proposal In Progress",
      NEGOTIATION: "Negotiation",
      CLOSED: "Closed",
    }[stage] || "Unknown Stage"
  );
};

interface UseOpportunityListDataParams {
  search?: string;
  sortField: string;
  sortOrder: "ASC" | "DESC";
  context: BusinessAppContextProps;
  sourceApp?: string;
  stages?: string[];
  winningChanceRanges?: Array<{ min?: number; max?: number }>;
  amountRanges?: Array<{ min?: number; max?: number }>;
  statuses?: string[];
  accounts?: string[];
  createdAfter?: string;
  createdBefore?: string;
  owners?: string[];
  pipelines?: string[];
}

const transformOpportunityData = (
  apiOpportunity: OpportunityData
): Opportunity => {
  return {
    id: apiOpportunity.id,
    name: apiOpportunity.name || "",
    description: "", // Field doesn't exist in API, set empty string
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
    salesOpportunityStatus: apiOpportunity.opportunityStatus
      ? {
          id: apiOpportunity.opportunityStatus.id,
          value: apiOpportunity.opportunityStatus.value,
          code: apiOpportunity.opportunityStatus.code,
          objectValue: apiOpportunity.opportunityStatus.objectValue,
        }
      : { id: "", value: "", code: "", objectValue: undefined },
    salesLeadSource: { id: "", value: "", code: "" }, // Field doesn't exist in API
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
    sourceApp: "",
    createdAt: apiOpportunity.createdAt,
    updatedAt: apiOpportunity.updatedAt || "",
  };
};

export const useOpportunityListData = (
  params: UseOpportunityListDataParams
): UseOpportunityListDataReturn => {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);

  const { fetchOpportunitiesData } = useGetOpportunitiesData(params.context);

  const loadPage = useCallback(
    async (
      page: number,
      pageSize = 20,
      additionalFilters?: any,
      overrideSortField?: string,
      overrideSortOrder?: "ASC" | "DESC" | "",
      showLoading: boolean = true
    ) => {
      if (!params.context.accessToken) {
        console.warn("No access token provided for opportunity data loading");
        return;
      }

      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      try {
        // Enforce query limit to ensure optimal performance
        const safePageSize = enforceQueryLimit(pageSize);
        const offset = (page - 1) * safePageSize;

        // Build where conditions - start with base condition
        const whereConditions: any[] = [{ isDeleted: { _eq: false } }];

        // Add search functionality - only search name and related fields that exist
        const search = additionalFilters?.search || params.search;
        if (search?.trim()) {
          const searchTerm = `%${search.trim()}%`;
          const isNumber = !isNaN(Number(search));

          const searchConditions: any[] = [{ name: { _ilike: searchTerm } }];

          // Add account name search
          searchConditions.push({
            account: {
              name: { _ilike: searchTerm },
            },
          });

          // Add owner employee search
          searchConditions.push({
            ownerEmployee: {
              firstName: { _ilike: searchTerm },
            },
          });
          searchConditions.push({
            ownerEmployee: {
              lastName: { _ilike: searchTerm },
            },
          });
          searchConditions.push({
            ownerEmployee: {
              displayName: { _ilike: searchTerm },
            },
          });

          // Add stage and pipeline search
          searchConditions.push({ stage: { _ilike: searchTerm } }); // Added: displayed in stage
          searchConditions.push({
            salesPipelineStage: { value: { _ilike: searchTerm } },
          }); // Added: displayed in stage
          searchConditions.push({
            pipeline: { value: { _ilike: searchTerm } },
          }); // Added: displayed in pipeline
          searchConditions.push({
            salesPipeline: { value: { _ilike: searchTerm } },
          }); // Added: displayed in pipeline

          // Add status search
          searchConditions.push({
            opportunityStatus: { value: { _ilike: searchTerm } },
          }); // Added: displayed in status

          // Add number-specific conditions if the search term can be parsed as a number
          if (isNumber) {
            const numericValue = Number(search);
            searchConditions.push({ estimatedAmount: { _eq: numericValue } });
            searchConditions.push({ winningChance: { _eq: numericValue } });
          }

          whereConditions.push({ _or: searchConditions });
        }

        // Add stage filtering (check both stage and salesPipelineStage.value)
        const stages = additionalFilters?.stages || params.stages;
        if (stages && stages.length > 0) {
          const stageConditions: any[] = [
            { stage: { _in: stages } },
            { salesPipelineStage: { value: { _in: stages } } },
          ];
          whereConditions.push({ _or: stageConditions });
        }

        // Add winning chance filtering
        const winningChanceRanges = additionalFilters?.winningChanceRanges || params.winningChanceRanges;
        if (
          winningChanceRanges &&
          winningChanceRanges.length > 0
        ) {
          const winningChanceConditions = winningChanceRanges.map(
            (range: { min?: number; max?: number }) => {
              const condition: any = {};
              if (range.min !== undefined) {
                condition._gte = range.min;
              }
              if (range.max !== undefined) {
                condition._lte = range.max;
              }
              return { winningChance: condition };
            }
          );
          whereConditions.push({ _or: winningChanceConditions });
        }

        // Add amount filtering
        const amountRanges = additionalFilters?.amountRanges || params.amountRanges;
        if (amountRanges && amountRanges.length > 0) {
          const amountConditions = amountRanges.map((range: { min?: number; max?: number }) => {
            const condition: any = {};
            if (range.min !== undefined) {
              condition._gte = range.min;
            }
            if (range.max !== undefined) {
              condition._lte = range.max;
            }
            return { estimatedAmount: condition };
          });
          whereConditions.push({ _or: amountConditions });
        }

        // Add status filtering (Java enum values)
        const statusEnums = additionalFilters?.statuses || params.statuses;
        if (statusEnums && statusEnums.length > 0) {
          whereConditions.push({ status: { _in: statusEnums } });
        }

        // Add close date filtering (was incorrectly filtering createdAt)
        const createdAfter = additionalFilters?.createdAfter || params.createdAfter;
        const createdBefore = additionalFilters?.createdBefore || params.createdBefore;
        if (createdAfter || createdBefore) {
          const dateCondition: any = {};
          if (createdAfter) {
            dateCondition._gte = createdAfter;
          }
          if (createdBefore) {
            dateCondition._lte = createdBefore;
          }
          whereConditions.push({ closeDate: dateCondition });
        }

        // Note: Opportunity name filtering is handled directly in search above, not as separate filter

        // Merge additionalFilters with params for owner filtering
        const owners = additionalFilters?.owners || params.owners;
        if (owners && owners.length > 0) {
          whereConditions.push({ ownerEmployeeId: { _in: owners } });
        }

        // Add pipeline filtering (check both pipeline and salesPipeline ID)
        const pipelines = additionalFilters?.pipelines || params.pipelines;
        if (pipelines && pipelines.length > 0) {
          const pipelineConditions: any[] = [
            { pipeline: { id: { _in: pipelines } } },
            { salesPipeline: { id: { _in: pipelines } } },
          ];
          whereConditions.push({ _or: pipelineConditions });
        }

        // Add account filtering
        const accounts = additionalFilters?.accounts || params.accounts;
        if (accounts && accounts.length > 0) {
          whereConditions.push({ accountId: { _in: accounts } });
        }

        // Add status filtering
        const statuses = additionalFilters?.statuses || params.statuses;
        if (statuses && statuses.length > 0) {
          whereConditions.push({ opportunityStatus: { id: { _in: statuses } } });
        }

        // Combine all where conditions with _and
        const whereCondition =
          whereConditions.length > 1
            ? { _and: whereConditions }
            : whereConditions[0] || {};

        // Build order by condition - handle both override and regular sorting
        let orderBy: any[] = [];
        if (overrideSortField && overrideSortField !== "") {
          const sortCondition: any = {};

          if (overrideSortField === "name") {
            sortCondition.name =
              overrideSortOrder === "ASC"
                ? "ASC_NULLS_LAST"
                : "DESC_NULLS_LAST";
          } else if (overrideSortField === "estimatedAmount") {
            sortCondition.estimatedAmount =
              overrideSortOrder === "ASC"
                ? "ASC_NULLS_LAST"
                : "DESC_NULLS_LAST";
          } else if (overrideSortField === "winningChance") {
            sortCondition.winningChance =
              overrideSortOrder === "ASC"
                ? "ASC_NULLS_LAST"
                : "DESC_NULLS_LAST";
          } else if (overrideSortField === "closeDate") {
            sortCondition.closeDate =
              overrideSortOrder === "ASC"
                ? "ASC_NULLS_LAST"
                : "DESC_NULLS_LAST";
          } else if (overrideSortField === "createdAt") {
            sortCondition.createdAt =
              overrideSortOrder === "ASC"
                ? "ASC_NULLS_LAST"
                : "DESC_NULLS_LAST";
          } else if (overrideSortField === "ownerEmployeeId") {
            sortCondition.ownerEmployee = {
              displayName:
                overrideSortOrder === "ASC"
                  ? "ASC_NULLS_LAST"
                  : "DESC_NULLS_LAST",
            };
          } else if (overrideSortField === "stage") {
            sortCondition.salesPipelineStage = {
              value:
                overrideSortOrder === "ASC"
                  ? "ASC_NULLS_LAST"
                  : "DESC_NULLS_LAST",
            };
          } else if (overrideSortField === "pipeline") {
            sortCondition.salesPipeline = {
              value:
                overrideSortOrder === "ASC"
                  ? "ASC_NULLS_LAST"
                  : "DESC_NULLS_LAST",
            };
          } else if (overrideSortField === "accountId") {
            sortCondition.account = {
              name:
                overrideSortOrder === "ASC"
                  ? "ASC_NULLS_LAST"
                  : "DESC_NULLS_LAST",
            };
          } else if (overrideSortField === "status") {
            sortCondition.opportunityStatus = {
              value:
                overrideSortOrder === "ASC"
                  ? "ASC_NULLS_LAST"
                  : "DESC_NULLS_LAST",
            };
          }

          if (Object.keys(sortCondition).length > 0) {
            orderBy = [sortCondition];
          }
        } else if (
          params.sortField &&
          params.sortField !== "" &&
          params.sortOrder
        ) {
          const sortCondition: any = {};

          if (params.sortField === "name") {
            sortCondition.name =
              params.sortOrder === "ASC" ? "ASC_NULLS_LAST" : "DESC_NULLS_LAST";
          } else if (params.sortField === "estimatedAmount") {
            sortCondition.estimatedAmount =
              params.sortOrder === "ASC" ? "ASC_NULLS_LAST" : "DESC_NULLS_LAST";
          } else if (params.sortField === "winningChance") {
            sortCondition.winningChance =
              params.sortOrder === "ASC" ? "ASC_NULLS_LAST" : "DESC_NULLS_LAST";
          } else if (params.sortField === "closeDate") {
            sortCondition.closeDate =
              params.sortOrder === "ASC" ? "ASC_NULLS_LAST" : "DESC_NULLS_LAST";
          } else if (params.sortField === "createdAt") {
            sortCondition.createdAt =
              params.sortOrder === "ASC" ? "ASC_NULLS_LAST" : "DESC_NULLS_LAST";
          } else if (params.sortField === "ownerEmployeeId") {
            sortCondition.ownerEmployee = {
              displayName:
                params.sortOrder === "ASC"
                  ? "ASC_NULLS_LAST"
                  : "DESC_NULLS_LAST",
            };
          } else if (params.sortField === "stage") {
            sortCondition.salesPipelineStage = {
              value:
                params.sortOrder === "ASC"
                  ? "ASC_NULLS_LAST"
                  : "DESC_NULLS_LAST",
            };
          } else if (params.sortField === "pipeline") {
            sortCondition.salesPipeline = {
              value:
                params.sortOrder === "ASC"
                  ? "ASC_NULLS_LAST"
                  : "DESC_NULLS_LAST",
            };
          } else if (params.sortField === "accountId") {
            sortCondition.account = {
              name:
                params.sortOrder === "ASC"
                  ? "ASC_NULLS_LAST"
                  : "DESC_NULLS_LAST",
            };
          } else if (params.sortField === "status") {
            sortCondition.opportunityStatus = {
              value:
                params.sortOrder === "ASC"
                  ? "ASC_NULLS_LAST"
                  : "DESC_NULLS_LAST",
            };
          }

          if (Object.keys(sortCondition).length > 0) {
            orderBy = [sortCondition];
          }
        }

        // Default sorting if no specific sort is provided
        if (orderBy.length === 0) {
          orderBy = [{ createdAt: "DESC_NULLS_LAST" }];
        }

        const result = await fetchOpportunitiesData({
          offset,
          limit: safePageSize,
          where: whereCondition,
          orderBy,
        });

        if (result?.Opportunity) {
          const transformedOpportunities = result.Opportunity.map(
            transformOpportunityData
          );
          setOpportunities(transformedOpportunities);

          const totalCount = result.OpportunityAggregate?.aggregate?.count || 0;
          setTotal(totalCount);
          setHasMore(offset + safePageSize < totalCount);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to load opportunities")
        );
        console.error("Error loading opportunities:", err);
      } finally {
        setLoading(false);
      }
    },
    [
      fetchOpportunitiesData,
      params.search,
      params.sortField,
      params.sortOrder,
      JSON.stringify(params.stages), // Use JSON.stringify for array
      JSON.stringify(params.winningChanceRanges), // Use JSON.stringify for array
      JSON.stringify(params.amountRanges), // Use JSON.stringify for array
      JSON.stringify(params.statuses), // Use JSON.stringify for array
      params.createdAfter,
      params.createdBefore,
      params.context.accessToken,
    ]
  );

  const loadMore = useCallback(() => {
    console.log("Load more opportunities requested");
    // Implementation for infinite scroll if needed
  }, []);

  const retry = useCallback(() => {
    console.log("Retrying opportunity data load");
    // Will be implemented with actual retry logic
  }, []);

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
