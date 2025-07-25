import { useState, useCallback, useMemo } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGetIndustries } from "../../lead-list/hooks/useGetIndustries";

export interface FilterGroup {
  id: string;
  title: string; // Changed from label to title to match DataFilterGroup
  filters: Array<{ id: string; label: string; value: any; selected: boolean }>;
  backendSearch?: (search: string) => {
    filters: Array<{ id: string; label: string; selected: boolean }>;
    loading: boolean;
    error: any;
  };
}

export interface AccountFilters {
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
  industrySearch: string;
  setIndustrySearch: (search: string) => void;
}

export const useAccountFilters = (
  context: BusinessAppContextProps
): AccountFilters => {
  const [search, setSearch] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [createdAfter, setCreatedAfter] = useState<string | undefined>();
  const [createdBefore, setCreatedBefore] = useState<string | undefined>();

  // Industry search state
  const [industrySearch, setIndustrySearch] = useState("");

  // Get industry data with search
  const {
    industryOptions,
    isLoading: industryLoading,
    error: industryError,
  } = useGetIndustries(context, industrySearch);

  // Backend search function for industries
  const getIndustryFilters = useCallback(
    (search: string) => {
      setIndustrySearch(search);

      return {
        filters: industryOptions.map((option) => ({
          id: option.id,
          label: option.name,
          selected: selectedFilters.includes(option.id),
        })),
        loading: industryLoading,
        error: industryError,
      };
    },
    [industryOptions, selectedFilters, industryLoading, industryError]
  );
  const filterGroups: FilterGroup[] = useMemo(
    () => [
      {
        id: "industry",
        title: "Industry",
        filters: industryOptions.map((option) => ({
          id: option.id,
          label: option.name,
          value: option.name,
          selected: selectedFilters.includes(option.id),
        })),
        backendSearch: getIndustryFilters,
      },
    ],
    [industryOptions, selectedFilters, getIndustryFilters]
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
          if (group.id === "industry") {
            if (!filters.industries) filters.industries = [];
            filters.industries.push(filter.value);
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
    industrySearch,
    setIndustrySearch,
  };
};
