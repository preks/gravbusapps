import { useState, useCallback, useMemo, useEffect } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useCatalogManagerClient } from "@/common/network/catalogs/useCatalogManagerClient";

export interface FilterGroup {
  id: string;
  title: string; // Changed from label to title to match DataFilterGroup
  filters: Array<{ id: string; label: string; value: any; selected: boolean }>;
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
}

export const useAccountFilters = (
  context: BusinessAppContextProps
): AccountFilters => {
  const [search, setSearch] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [createdAfter, setCreatedAfter] = useState<string | undefined>();
  const [createdBefore, setCreatedBefore] = useState<string | undefined>();
  const [industryOptions, setIndustryOptions] = useState<
    { id: string; label: string; value: string }[]
  >([]);
  const [industryLoading, setIndustryLoading] = useState(false);
  const [industryError, setIndustryError] = useState<Error | null>(null);

  // Always call the hook at the top level
  const client = useCatalogManagerClient(context.accessToken);

  // Fetch industry catalog entries dynamically
  useEffect(() => {
    const fetchIndustries = async () => {
      setIndustryLoading(true);
      setIndustryError(null);
      try {
        const response = await client.getCatalogEntriesList(
          { catalogIdentifier: "IndustryClass", version: "v1" },
          { limit: 100, returnTotalRecords: true }
        );
        const options = (response.data || []).map((entry) => ({
          id: entry.id,
          label: entry.value,
          value: entry.value,
        }));
        setIndustryOptions(options);
      } catch (err) {
        setIndustryError(
          err instanceof Error ? err : new Error("Failed to load industries")
        );
        setIndustryOptions([]);
      } finally {
        setIndustryLoading(false);
      }
    };
    fetchIndustries();
    // Only run on mount or when client changes
  }, [client]);
  console.log("industryOptions", industryOptions);
  const filterGroups: FilterGroup[] = useMemo(
    () => [
      {
        id: "industry",
        title: "Industry",
        filters: industryOptions.map((option) => ({
          id: option.id,
          label: option.label,
          value: option.value,
          selected: selectedFilters.includes(option.id),
        })),
      },
    ],
    [industryOptions, selectedFilters]
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
          // REMOVED: accountType processing - field does not exist in GraphQL schema
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
  };
};
