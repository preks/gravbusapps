import { useState, useCallback, useMemo, useEffect } from "react";
import React from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGetPipelineStages } from "./useGetPipelineStages";
import { useGetPipelineCatalogs } from "./useGetPipelineCatalogs";
import { useGetOpportunityOwners } from "./useGetOpportunityOwners";
import { useGetOpportunityAccounts } from "./useGetOpportunityAccounts";
import { useGetOpportunityStatuses } from "./useGetOpportunityStatuses";
import { DateRangeFilter } from "../../../lead-view/components/DateRangeFilter";

export interface FilterGroup {
  id: string;
  title: string; // Changed from label to title to match DataFilterGroup
  filters: Array<{ id: string; label: string; value: any; selected: boolean }>;
  backendSearch?: (search: string) => {
    filters: Array<{ id: string; label: string; value: any; selected: boolean }>;
    loading: boolean;
    error: any;
  };
}

export interface OpportunityFilters {
  search: string;
  setSearch: (search: string) => void;
  selectedFilters: string[];
  filterGroups: FilterGroup[];
  filterLabelMap: Record<string, string>;
  addFilter: (filterId: string) => void;
  removeFilter: (filterId: string) => void;
  clearAllFilters: () => void;
  getFilters: () => any;
  createdAfter?: string;
  createdBefore?: string;
  handleDateRangeChange: (after?: string, before?: string) => void;
  filtersInitialized: boolean;
}

export const useOpportunityFilters = (
  context: BusinessAppContextProps
): OpportunityFilters => {
  const [search, setSearch] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [createdAfter, setCreatedAfter] = useState<string | undefined>();
  const [createdBefore, setCreatedBefore] = useState<string | undefined>();
  const [filtersInitialized, setFiltersInitialized] = useState(false);
  // Ensure filters are considered initialized early, so initial data can load without waiting for filter option datasets
  useEffect(() => {
    if (!filtersInitialized) {
      setFiltersInitialized(true);
    }
  }, [filtersInitialized]);


  // Add state for pipeline stage search if needed
  const [pipelineStageSearch, setPipelineStageSearch] = useState("");
  const {
    pipelineStageOptions,
    isLoading: isPipelineStagesLoading,
    error: pipelineStagesError,
  } = useGetPipelineStages(context, pipelineStageSearch);

  const [pipelineSearch] = useState("");
  const {
    pipelineOptions,
    isLoading: isPipelinesLoading,
    error: _pipelinesError,
  } = useGetPipelineCatalogs(context, pipelineSearch);

  // Add state for opportunity owner search
  const [ownerSearch, setOwnerSearch] = useState("");
  const {
    opportunityOwners,
    isLoading: isOwnersLoading,
    error: ownersError,
  } = useGetOpportunityOwners(context, ownerSearch);

  // Add state for account search
  const [accountSearch, setAccountSearch] = useState("");
  const {
    accountOptions,
    isLoading: isAccountsLoading,
    error: accountsError,
  } = useGetOpportunityAccounts(context, accountSearch);

  // Add state for status search
  const [statusSearch, setStatusSearch] = useState("");
  const {
    statusOptions,
    isLoading: isStatusesLoading,
    error: statusesError,
  } = useGetOpportunityStatuses(context, statusSearch);



  // Initialize filters from URL parameters when pipeline options are loaded
  useEffect(() => {
    if (
      !filtersInitialized &&
      !isPipelineStagesLoading &&
      !isPipelinesLoading &&
      !isAccountsLoading &&
      !isStatusesLoading
    ) {
      const urlParams = new URLSearchParams(window.location.search);
      const preselectedFilters: string[] = [];

      // Only process URL filters if we have data loaded
      if (pipelineStageOptions.length > 0 || pipelineOptions.length > 0) {
        // Handle salesPipelineStage parameter: salesPipelineStage=SalesPipelineStage:v1:NEW_OPPORTUNITY
        const salesPipelineStageParams = urlParams.getAll('salesPipelineStage');
        salesPipelineStageParams.forEach(stageValue => {
          const matchingStage = pipelineStageOptions.find(option => option.id === stageValue);
          if (matchingStage) {
            preselectedFilters.push(`stage-${matchingStage.id}`);
          }
        });

        // Handle salesPipeline parameter: salesPipeline=SalesPipeline:v1:STANDARD
        const salesPipelineParams = urlParams.getAll('salesPipeline');
        salesPipelineParams.forEach(pipelineValue => {
          const matchingPipeline = pipelineOptions.find(option => option.id === pipelineValue);
          if (matchingPipeline) {
            preselectedFilters.push(`pipeline-${matchingPipeline.id}`);
          }
        });

        // Handle winningChance parameter: winningChance=chance-high
        const winningChanceParams = urlParams.getAll('winningChance');
        winningChanceParams.forEach(chanceValue => {
          if (['chance-high', 'chance-medium', 'chance-low', 'chance-very-low'].includes(chanceValue)) {
            preselectedFilters.push(chanceValue);
          }
        });

        // Handle estimatedAmount parameter: estimatedAmount=amount-large
        const estimatedAmountParams = urlParams.getAll('estimatedAmount');
        estimatedAmountParams.forEach(amountValue => {
          if (['amount-large', 'amount-medium', 'amount-small', 'amount-micro'].includes(amountValue)) {
            preselectedFilters.push(amountValue);
          }
        });

        if (preselectedFilters.length > 0) {
          setSelectedFilters(preselectedFilters);
        }
      }
      
      // Always set initialized to true once loading is complete, regardless of whether data exists
      setFiltersInitialized(true);
    }
  }, [
    pipelineStageOptions,
    pipelineOptions,
    isPipelineStagesLoading,
    isPipelinesLoading,
    isAccountsLoading,
    isStatusesLoading,
    filtersInitialized,
  ]);

  // Backend search function for opportunity owners
  const getOwnerFilters = useCallback(
    (search: string) => {
      // Don't set state during render - use setTimeout to defer it
      setTimeout(() => {
        setOwnerSearch(search);
      }, 0);

      return {
        filters: (opportunityOwners || []).map((owner) => ({
          id: owner.id,
          label: owner.name,
          value: owner.name,
          selected: selectedFilters.includes(owner.id),
        })),
        loading: isOwnersLoading,
        error: ownersError,
      };
    },
    [
      opportunityOwners,
      selectedFilters,
      isOwnersLoading,
      ownersError,
    ]
  );



  // Backend search function for pipeline stages
  const getPipelineStageFilters = useCallback(
    (search: string) => {
      // Don't set state during render - use setTimeout to defer it
      setTimeout(() => {
        setPipelineStageSearch(search);
      }, 0);

      return {
        filters: (pipelineStageOptions || []).map((option) => ({
          id: `stage-${option.id}`,
          label: option.name,
          value: option.name,
          selected: selectedFilters.includes(`stage-${option.id}`),
        })),
        loading: isPipelineStagesLoading,
        error: pipelineStagesError,
      };
    },
    [
      pipelineStageOptions,
      selectedFilters,
      isPipelineStagesLoading,
      pipelineStagesError,
    ]
  );

  // Backend search function for accounts
  const getAccountFilters = useCallback(
    (search: string) => {
      // Don't set state during render - use setTimeout to defer it
      setTimeout(() => {
        setAccountSearch(search);
      }, 0);

      return {
        filters: (accountOptions || []).map((option) => ({
          id: option.id,
          label: option.name,
          value: option.id,
          selected: selectedFilters.includes(option.id),
        })),
        loading: isAccountsLoading,
        error: accountsError,
      };
    },
    [
      accountOptions,
      selectedFilters,
      isAccountsLoading,
      accountsError,
    ]
  );

  // Backend search function for statuses
  const getStatusFilters = useCallback(
    (search: string) => {
      // Don't set state during render - use setTimeout to defer it
      setTimeout(() => {
        setStatusSearch(search);
      }, 0);

      return {
        filters: (statusOptions || []).map((option) => ({
          id: `status-${option.id}`,
          label: option.name,
          value: option.id,
          selected: selectedFilters.includes(`status-${option.id}`),
        })),
        loading: isStatusesLoading,
        error: statusesError,
      };
    },
    [
      statusOptions,
      selectedFilters,
      isStatusesLoading,
      statusesError,
    ]
  );

  const handleDateRangeChange = useCallback(
    (after?: string, before?: string) => {
      setCreatedAfter(after);
      setCreatedBefore(before);
    },
    []
  );

  const filterGroups: FilterGroup[] = useMemo(
    () => [
      {
        id: "dateRange",
        title: "Close Date",
        customComponent: React.createElement(DateRangeFilter, {
          createdAfter: createdAfter,
          createdBefore: createdBefore,
          onDateRangeChange: handleDateRangeChange,
          className: "gba:border-0 gba:shadow-none gba:p-0 gba:bg-transparent",
        }),
        hideSearch: true,
      } as any, // Temporary type assertion to bypass interface issue
      {
        id: "owners",
        title: "Owner",
        filters: (opportunityOwners || []).map((owner) => ({
          id: owner.id,
          label: owner.name,
          value: owner.name,
          selected: selectedFilters.includes(owner.id),
        })),
        backendSearch: getOwnerFilters,
      },
      {
        id: "stage",
        title: "Stage",
        filters: (pipelineStageOptions || []).map((option) => ({
          id: `stage-${option.id}`,
          label: option.name,
          value: option.name,
          selected: selectedFilters.includes(`stage-${option.id}`),
        })),
        backendSearch: getPipelineStageFilters,
      },
      {
        id: "pipeline",
        title: "Pipeline",
        filters: (pipelineOptions || []).map((option) => ({
          id: `pipeline-${option.id}`,
          label: option.name,
          value: option.id,
          selected: selectedFilters.includes(`pipeline-${option.id}`),
        })),
      },
      {
        id: "winningChance",
        title: "Winning Chance",
        filters: [
          {
            id: "chance-high",
            label: "High (75-100%)",
            value: { min: 75, max: 100 },
            selected: selectedFilters.includes("chance-high"),
          },
          {
            id: "chance-medium",
            label: "Medium (50-74%)",
            value: { min: 50, max: 74 },
            selected: selectedFilters.includes("chance-medium"),
          },
          {
            id: "chance-low",
            label: "Low (25-49%)",
            value: { min: 25, max: 49 },
            selected: selectedFilters.includes("chance-low"),
          },
          {
            id: "chance-very-low",
            label: "Very Low (0-24%)",
            value: { min: 0, max: 24 },
            selected: selectedFilters.includes("chance-very-low"),
          },
        ],
      },
      {
        id: "estimatedAmount",
        title: "Deal Size",
        filters: [
          {
            id: "amount-large",
            label: "Large (>$100K)",
            value: { min: 100000 },
            selected: selectedFilters.includes("amount-large"),
          },
          {
            id: "amount-medium",
            label: "Medium ($50K-$100K)",
            value: { min: 50000, max: 100000 },
            selected: selectedFilters.includes("amount-medium"),
          },
          {
            id: "amount-small",
            label: "Small ($10K-$50K)",
            value: { min: 10000, max: 50000 },
            selected: selectedFilters.includes("amount-small"),
          },
          {
            id: "amount-micro",
            label: "Micro (<$10K)",
            value: { max: 10000 },
            selected: selectedFilters.includes("amount-micro"),
          },
        ],
      },
      {
        id: "accounts",
        title: "Account",
        filters: (accountOptions || []).map((option) => ({
          id: option.id,
          label: option.name,
          value: option.id,
          selected: selectedFilters.includes(option.id),
        })),
        backendSearch: getAccountFilters,
      },
      {
        id: "statuses",
        title: "Status",
        filters: (statusOptions || []).map((option) => ({
          id: `status-${option.id}`,
          label: option.name,
          value: option.id,
          selected: selectedFilters.includes(`status-${option.id}`),
        })),
        backendSearch: getStatusFilters,
      },
    ],
    [
      selectedFilters,
      opportunityOwners,
      pipelineStageOptions,
      pipelineOptions,
      accountOptions,
      statusOptions,
      getOwnerFilters,
      getPipelineStageFilters,
      getAccountFilters,
      getStatusFilters,
      createdAfter,
      createdBefore,
      handleDateRangeChange,
    ]
  );

  const filterLabelMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    if (filterGroups) {
      filterGroups.forEach((group) => {
        if (group.filters) {
          group.filters.forEach((filter) => {
            map[filter.id] = filter.label;
          });
        }
      });
    }
    return map;
  }, [filterGroups]);

  const addFilter = useCallback((filterId: string) => {
    setSelectedFilters((prev) => {
      if (!prev.includes(filterId)) {
        return [...prev, filterId];
      }
      return prev;
    });
  }, []);

  const removeFilter = useCallback((filterId: string) => {
    setSelectedFilters((prev) => prev.filter((id) => id !== filterId));
  }, []);

  const clearAllFilters = useCallback(() => {
    setSelectedFilters([]);
    setCreatedAfter(undefined);
    setCreatedBefore(undefined);
  }, []);

  const getFilters = useCallback(() => {
    const filters: any = {};

    if (search) {
      filters.search = search;
    }

    if (createdAfter) {
      filters.createdAfter = createdAfter;
    }

    if (createdBefore) {
      filters.createdBefore = createdBefore;
    }

    // Process selected filters
    selectedFilters.forEach((filterId) => {
      for (const group of filterGroups) {
        // Skip groups without filters (e.g., dateRange with customComponent)
        if (!group.filters || !Array.isArray(group.filters)) {
          continue;
        }
        
        const filter = group.filters.find((f) => f.id === filterId);
        if (filter) {
          if (group.id === "owners") {
            if (!filters.owners) filters.owners = [];
            filters.owners.push(filterId);
          } else if (group.id === "stage") {
            if (!filters.stages) filters.stages = [];
            filters.stages.push(filter.value);
          } else if (group.id === "pipeline") {
            if (!filters.pipelines) filters.pipelines = [];
            filters.pipelines.push(filter.value);
          } else if (group.id === "winningChance") {
            if (!filters.winningChanceRanges) filters.winningChanceRanges = [];
            filters.winningChanceRanges.push(filter.value);
          } else if (group.id === "estimatedAmount") {
            if (!filters.amountRanges) filters.amountRanges = [];
            filters.amountRanges.push(filter.value);
          } else if (group.id === "accounts") {
            if (!filters.accounts) filters.accounts = [];
            filters.accounts.push(filterId);
          } else if (group.id === "statuses") {
            if (!filters.statuses) filters.statuses = [];
            filters.statuses.push(filter.value);
          }
          break;
        }
      }
    });

    return filters;
  }, [search, selectedFilters, createdAfter, createdBefore, filterGroups]);

  return {
    search,
    setSearch,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    clearAllFilters,
    getFilters,
    createdAfter,
    createdBefore,
    handleDateRangeChange,
    filtersInitialized,
  };
};
