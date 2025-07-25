import { useState, useCallback, useMemo, useEffect } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGetJobTitles } from "./useGetJobTitles";

export interface FilterGroup {
  id: string;
  title: string; // Changed from label to title to match DataFilterGroup
  filters: Array<{ id: string; label: string; value: any; selected: boolean }>;
}

export interface ContactFilters {
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
  jobTitleSearch: string;
  setJobTitleSearch: (search: string) => void;
  filtersInitialized: boolean;
}

export const useContactFilters = (
  context: BusinessAppContextProps
): ContactFilters => {
  const [search, setSearch] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [createdAfter, setCreatedAfter] = useState<string | undefined>();
  const [createdBefore, setCreatedBefore] = useState<string | undefined>();
  // Separate state for job title search
  const [jobTitleSearch, setJobTitleSearch] = useState("");
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  const {
    jobTitleOptions,
    isLoading: isJobTitlesLoading,
    error: jobTitlesError,
  } = useGetJobTitles(context, jobTitleSearch);

  // Initialize filters from URL parameters when job title options are loaded
  useEffect(() => {
    if (!filtersInitialized && jobTitleOptions.length > 0) {
      const urlParams = new URLSearchParams(window.location.search);
      const preselectedFilters: string[] = [];

      // Handle jobTitle parameter: jobTitle=<jobTitle>
      const jobTitleParams = urlParams.getAll('jobTitle');
      jobTitleParams.forEach(jobTitleValue => {
        const matchingJobTitle = jobTitleOptions.find(option => option.name === jobTitleValue);
        if (matchingJobTitle) {
          preselectedFilters.push(`title-${matchingJobTitle.id}`);
        }
      });

      // Handle contactType parameter: contactType=FOUNDER_CONTACT
      const contactTypeParams = urlParams.getAll('contactType');
      contactTypeParams.forEach(contactTypeValue => {
        if (['FOUNDER_CONTACT', 'PRIMARY_CONTACT', 'SECONDARY_CONTACT', 'UNKNOWN_CONTACT'].includes(contactTypeValue)) {
          preselectedFilters.push(contactTypeValue);
        }
      });

      if (preselectedFilters.length > 0) {
        setSelectedFilters(preselectedFilters);
      }
      
      setFiltersInitialized(true);
    }
  }, [jobTitleOptions, filtersInitialized]);

  const filterGroups: FilterGroup[] = useMemo(
    () => [
      {
        id: "contactType",
        title: "Contact Type",
        filters: [
          {
            id: "FOUNDER_CONTACT",
            label: "Founder",
            value: "FOUNDER_CONTACT",
            selected: selectedFilters.includes("FOUNDER_CONTACT"),
          },
          {
            id: "PRIMARY_CONTACT",
            label: "Primary Contact",
            value: "PRIMARY_CONTACT",
            selected: selectedFilters.includes("PRIMARY_CONTACT"),
          },
          {
            id: "SECONDARY_CONTACT",
            label: "Secondary Contact",
            value: "SECONDARY_CONTACT",
            selected: selectedFilters.includes("SECONDARY_CONTACT"),
          },
          {
            id: "UNKNOWN_CONTACT",
            label: "Unknown",
            value: "UNKNOWN_CONTACT",
            selected: selectedFilters.includes("UNKNOWN_CONTACT"),
          },
        ],
      },
      {
        id: "jobTitle",
        title: "Job Title",
        filters: jobTitleOptions.map((option) => ({
          id: `title-${option.id}`,
          label: option.name,
          value: option.name,
          selected: selectedFilters.includes(`title-${option.id}`),
        })),
      },
    ],
    [selectedFilters, jobTitleOptions]
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
          if (group.id === "contactType") {
            if (!filters.contactTypes) filters.contactTypes = [];
            filters.contactTypes.push(filter.value);
          } else if (group.id === "jobTitle") {
            if (!filters.jobTitles) filters.jobTitles = [];
            filters.jobTitles.push(filter.value);
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
    jobTitleSearch,
    setJobTitleSearch,
    filtersInitialized,
  };
};
