import { useState, useCallback, useMemo } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGetPipelineStages } from "./useGetPipelineStages";
import { useGetPipelineCatalogs } from "./useGetPipelineCatalogs";

export interface FilterGroup {
  id: string;
  title: string; // Changed from label to title to match DataFilterGroup
  filters: Array<{ id: string; label: string; value: any; selected: boolean }>;
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
}

export const useOpportunityFilters = (
  context: BusinessAppContextProps
): OpportunityFilters => {
  const [search, setSearch] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [createdAfter, setCreatedAfter] = useState<string | undefined>();
  const [createdBefore, setCreatedBefore] = useState<string | undefined>();

  // Add state for pipeline stage search if needed
  const [pipelineStageSearch, setPipelineStageSearch] = useState("");
  const {
    pipelineStageOptions,
    isLoading: isPipelineStagesLoading,
    error: pipelineStagesError,
  } = useGetPipelineStages(context, pipelineStageSearch);

  const [pipelineSearch, setPipelineSearch] = useState("");
  const {
    pipelineOptions,
    isLoading: isPipelinesLoading,
    error: pipelinesError,
  } = useGetPipelineCatalogs(context, pipelineSearch);

  const filterGroups: FilterGroup[] = useMemo(
    () => [
      {
        id: "stage",
        title: "Stage",
        filters: pipelineStageOptions.map((option) => ({
          id: `stage-${option.id}`,
          label: option.name,
          value: option.name,
          selected: selectedFilters.includes(`stage-${option.id}`),
        })),
      },
      {
        id: "pipeline",
        title: "Pipeline",
        filters: pipelineOptions.map((option) => ({
          id: `pipeline-${option.id}`,
          label: option.name,
          value: option.name,
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
    ],
    [selectedFilters, pipelineStageOptions, pipelineOptions]
  );

  const filterLabelMap: Record<string, string> = useMemo(() => {
    const map: Record<string, string> = {};
    filterGroups.forEach((group) => {
      group.filters.forEach((filter) => {
        map[filter.id] = filter.label;
      });
    });
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

  const handleDateRangeChange = useCallback(
    (after?: string, before?: string) => {
      setCreatedAfter(after);
      setCreatedBefore(before);
    },
    []
  );

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
        const filter = group.filters.find((f) => f.id === filterId);
        if (filter) {
          if (group.id === "stage") {
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
  };
};
