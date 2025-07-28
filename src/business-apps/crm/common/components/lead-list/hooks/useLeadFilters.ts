"use client";

import React, { useState, useCallback, useEffect } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGetLeadStatuses } from "./useGetLeadStatuses";
import { useGetLeadRatings } from "./useGetLeadRatings";
import { useGetLeadSources } from "./useGetLeadSources";
import { useGetIndustries } from "./useGetIndustries";
import { useGetCompanySizes } from "./useGetCompanySizes";
import { useGetLeadOwners } from "./useGetLeadOwners";
import { DateRangeFilter } from "../components/DateRangeFilter";

// DataFilter interfaces to match DataContainer expectations
export interface DataFilter {
  id: string;
  label: string;
  selected: boolean;
  count?: number;
}

export interface DataFilterGroup {
  id: string;
  title: string;
  filters: DataFilter[];
  backendSearch?: (search: string) => {
    filters: DataFilter[];
    loading: boolean;
    error: any;
  };
}

// Lead filter state interface
export interface LeadFilters {
  search: string;
  leadStatuses: string[];
  leadRatings: string[];
  leadSources: string[];
  companySizes: string[];
  createdAfter?: string;
  createdBefore?: string;
}

export const useLeadFilters = (context: BusinessAppContextProps) => {
  // Main search and filter state
  const [search, setSearch] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  // Date range filter state
  const [createdAfter, setCreatedAfter] = useState<string | undefined>();
  const [createdBefore, setCreatedBefore] = useState<string | undefined>();

  // Search state for each filter type (following employee pattern)
  const [leadStatusSearch, setLeadStatusSearch] = useState("");
  const [leadRatingSearch, setLeadRatingSearch] = useState("");
  const [leadSourceSearch, setLeadSourceSearch] = useState("");
  const [industrySearch, setIndustrySearch] = useState("");
  const [companySizeSearch, setCompanySizeSearch] = useState("");
  const [ownerSearch, setOwnerSearch] = useState("");

  // Offset state for pagination (if needed later)
  const [leadStatusOffset] = useState(0);
  const [leadRatingOffset] = useState(0);
  const [leadSourceOffset] = useState(0);
  const [industryOffset] = useState(0);
  const [companySizeOffset] = useState(0);
  const [ownerOffset] = useState(0);

  // Get catalog data with search parameters
  const {
    leadStatusOptions,
    isLoading: leadStatusLoading,
    error: leadStatusError,
  } = useGetLeadStatuses(context, leadStatusSearch, leadStatusOffset);
  const {
    leadRatingOptions,
    isLoading: leadRatingLoading,
    error: leadRatingError,
  } = useGetLeadRatings(context, leadRatingSearch, leadRatingOffset);
  const {
    leadSourceOptions,
    isLoading: leadSourceLoading,
    error: leadSourceError,
  } = useGetLeadSources(context, leadSourceSearch, leadSourceOffset);
  const {
    industryOptions,
    isLoading: industryLoading,
    error: industryError,
  } = useGetIndustries(context, industrySearch, industryOffset);
  const {
    companySizeOptions,
    isLoading: companySizeLoading,
    error: companySizeError,
  } = useGetCompanySizes(context, companySizeSearch, companySizeOffset);
  const {
    leadOwners,
    isLoading: ownerLoading,
    error: ownerError,
  } = useGetLeadOwners(context, ownerSearch, ownerOffset);

  // Initialize filters from URL parameters when all data is loaded
  useEffect(() => {
    if (!filtersInitialized && !leadStatusLoading && !leadRatingLoading && 
        !leadSourceLoading && !industryLoading && !companySizeLoading && !ownerLoading) {
      const urlParams = new URLSearchParams(window.location.search);
      const preselectedFilters: string[] = [];

      // Handle leadStatus parameter: leadStatus=LEAD_NEW
      const leadStatusParams = urlParams.getAll('leadStatus');
      leadStatusParams.forEach(statusValue => {
        if (['LEAD_NEW', 'LEAD_OPEN', 'LEAD_QUALIFIED', 'LEAD_CONVERTED', 'LEAD_LOST', 'UNKNOWN_LEAD_STATUS'].includes(statusValue)) {
          preselectedFilters.push(statusValue);
        }
      });

      // Handle leadRating parameter: leadRating=HOT_LEAD
      const leadRatingParams = urlParams.getAll('leadRating');
      leadRatingParams.forEach(ratingValue => {
        if (['HOT_LEAD', 'WARM_LEAD', 'COLD_LEAD', 'UNKNOWN_LEAD_RATING'].includes(ratingValue)) {
          preselectedFilters.push(ratingValue);
        }
      });

      // Only process URL filters if we have data loaded
      if (leadSourceOptions.length > 0) {
        // Handle leadSource parameter: leadSource=LeadSource:v1:WEBSITE
        const leadSourceParams = urlParams.getAll('leadSource');
        leadSourceParams.forEach(sourceValue => {
          const matchingSource = leadSourceOptions.find(option => option.id === sourceValue);
          if (matchingSource) {
            preselectedFilters.push(`source-${matchingSource.id}`);
          }
        });
      }

      if (industryOptions.length > 0) {
        // Handle industry parameter: industry=Industry:v1:TECHNOLOGY
        const industryParams = urlParams.getAll('industry');
        industryParams.forEach(industryValue => {
          const matchingIndustry = industryOptions.find(option => option.id === industryValue);
          if (matchingIndustry) {
            preselectedFilters.push(`industry-${matchingIndustry.id}`);
          }
        });
      }

      if (companySizeOptions.length > 0) {
        // Handle companySize parameter: companySize=CompanySize:v1:SMALL
        const companySizeParams = urlParams.getAll('companySize');
        companySizeParams.forEach(sizeValue => {
          const matchingSize = companySizeOptions.find(option => option.id === sizeValue);
          if (matchingSize) {
            preselectedFilters.push(`size-${matchingSize.id}`);
          }
        });
      }

      if (leadOwners.length > 0) {
        // Handle leadOwner parameter: leadOwner=employee-123
        const leadOwnerParams = urlParams.getAll('leadOwner');
        leadOwnerParams.forEach(ownerValue => {
          const matchingOwner = leadOwners.find(owner => owner.id === ownerValue);
          if (matchingOwner) {
            preselectedFilters.push(`owner-${matchingOwner.id}`);
          }
        });
      }

      if (preselectedFilters.length > 0) {
        setSelectedFilters(preselectedFilters);
      }
      
      // Always set initialized to true once loading is complete, regardless of whether data exists
      setFiltersInitialized(true);
    }
  }, [leadStatusOptions, leadRatingOptions, leadSourceOptions, industryOptions, 
      companySizeOptions, leadOwners, leadStatusLoading, leadRatingLoading,
      leadSourceLoading, industryLoading, companySizeLoading, ownerLoading, filtersInitialized]);

  // Combined loading and error states
  const isLoading =
    leadStatusLoading ||
    leadRatingLoading ||
    leadSourceLoading ||
    industryLoading ||
    companySizeLoading ||
    ownerLoading;
  const error =
    leadStatusError ||
    leadRatingError ||
    leadSourceError ||
    industryError ||
    companySizeError ||
    ownerError;

  // Filter management functions
  const addFilter = useCallback((filterId: string) => {
    setSelectedFilters((prev) => [...prev, filterId]);
  }, []);

  const removeFilter = useCallback((filterId: string) => {
    setSelectedFilters((prev) => prev.filter((id) => id !== filterId));
  }, []);

  const resetFilters = useCallback(() => {
    setSearch("");
    setSelectedFilters([]);
    setCreatedAfter(undefined);
    setCreatedBefore(undefined);
  }, []);

  // Initialize filters from URL parameters
  const initializeFromUrl = useCallback(
    (urlParams: URLSearchParams) => {
      const newFilters: string[] = [];

      // Handle leadStatus parameter
      const leadStatusParam = urlParams.get("leadStatus");

      if (leadStatusParam && leadStatusOptions.length > 0) {
        // More flexible matching for common lead status values
        const matchingStatus = leadStatusOptions.find((option) => {
          const optionName = option.name.toLowerCase();
          const paramValue = leadStatusParam.toLowerCase();

          // Direct name match
          if (optionName === paramValue) return true;

          // ID match
          if (option.id.toLowerCase() === paramValue) return true;

          // Common mappings
          if (
            paramValue === "open" &&
            (optionName.includes("new") ||
              optionName.includes("open") ||
              optionName.includes("active"))
          )
            return true;
          if (
            paramValue === "converted" &&
            (optionName.includes("convert") ||
              optionName.includes("qualified") ||
              optionName.includes("won"))
          )
            return true;

          return false;
        });

        if (matchingStatus) {
          newFilters.push(matchingStatus.id);
        }
      }

      if (newFilters.length > 0) {
        setSelectedFilters((prev) => [...prev, ...newFilters]);
      }
    },
    [leadStatusOptions, setSelectedFilters]
  );

  // Handle date range changes
  const handleDateRangeChange = useCallback(
    (after?: string, before?: string) => {
      setCreatedAfter(after);
      setCreatedBefore(before);
    },
    []
  );

  // Backend search functions (following employee pattern)
  const getLeadStatusFilters = useCallback(
    (search: string) => {
      setLeadStatusSearch(search);

      const searchValue = search.trim().toLowerCase();

      const filtered = searchValue
        ? leadStatusOptions.filter((option) => {
            const name = option.name ? option.name.toLowerCase() : "";
            return name.includes(searchValue);
          })
        : leadStatusOptions;

      return {
        filters: filtered.map((option) => ({
          id: option.id,
          label: option.name,
          selected: selectedFilters.includes(option.id),
        })),
        loading: leadStatusLoading,
        error: leadStatusError,
      };
    },
    [leadStatusOptions, selectedFilters, leadStatusLoading, leadStatusError]
  );

  const getLeadRatingFilters = useCallback(
    (search: string) => {
      setLeadRatingSearch(search);

      const filtered = search
        ? leadRatingOptions.filter((option) =>
            option.name.toLowerCase().includes(search.toLowerCase())
          )
        : leadRatingOptions;

      return {
        filters: filtered.map((option) => ({
          id: option.id,
          label: option.name,
          selected: selectedFilters.includes(option.id),
        })),
        loading: leadRatingLoading,
        error: leadRatingError,
      };
    },
    [leadRatingOptions, selectedFilters, leadRatingLoading, leadRatingError]
  );

  const getLeadSourceFilters = useCallback(
    (search: string) => {
      setLeadSourceSearch(search);

      return {
        filters: leadSourceOptions.map((option) => ({
          id: option.id,
          label: option.name,
          selected: selectedFilters.includes(option.id),
        })),
        loading: leadSourceLoading,
        error: leadSourceError,
      };
    },
    [leadSourceOptions, selectedFilters, leadSourceLoading, leadSourceError]
  );

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

  // Company size doesn't need backend search as it's predefined
  const getCompanySizeFilters = useCallback(
    (search: string) => {
      setCompanySizeSearch(search);

      const searchValue = search.trim().toLowerCase();

      const filtered = searchValue
        ? companySizeOptions.filter((option) => {
            const name = option.name ? option.name.toLowerCase() : "";
            return name.includes(searchValue);
          })
        : companySizeOptions;

      return {
        filters: filtered.map((option) => ({
          id: option.id,
          label: option.name,
          selected: selectedFilters.includes(option.id),
        })),
        loading: companySizeLoading,
        error: companySizeError,
      };
    },
    [companySizeOptions, selectedFilters, companySizeLoading, companySizeError]
  );

  const getOwnerFilters = useCallback(
    (search: string) => {
      setOwnerSearch(search);

      return {
        filters: leadOwners.map((owner) => ({
          id: owner.id,
          label: owner.name,
          selected: selectedFilters.includes(owner.id),
        })),
        loading: ownerLoading,
        error: ownerError,
      };
    },
    [leadOwners, selectedFilters, ownerLoading, ownerError]
  );

  // Convert catalog options to filter options for static display
  const leadStatusFilterOptions: DataFilter[] = leadStatusOptions.map(
    (option: any) => ({
      id: option.id,
      label: option.name,
      selected: selectedFilters.includes(option.id),
    })
  );

  const leadRatingFilterOptions: DataFilter[] = leadRatingOptions.map(
    (option: any) => ({
      id: option.id,
      label: option.name,
      selected: selectedFilters.includes(option.id),
    })
  );

  const leadSourceFilterOptions: DataFilter[] = leadSourceOptions.map(
    (option: any) => ({
      id: option.id,
      label: option.name,
      selected: selectedFilters.includes(option.id),
    })
  );

  const industryFilterOptions: DataFilter[] = industryOptions.map(
    (option: any) => ({
      id: option.id,
      label: option.name,
      selected: selectedFilters.includes(option.id),
    })
  );

  const companySizeFilterOptions: DataFilter[] = companySizeOptions.map(
    (option: any) => ({
      id: option.id,
      label: option.name,
      selected: selectedFilters.includes(option.id),
    })
  );

  const ownerFilterOptions: DataFilter[] = leadOwners.map((owner: any) => ({
    id: owner.id,
    label: owner.name,
    selected: selectedFilters.includes(owner.id),
  }));

  // Debug logging
  // Debug lead status values

  // Create filter groups with backend search functions
  const filterGroups: DataFilterGroup[] = [
    {
      id: "dateRange",
      title: "Created Date",
      customComponent: React.createElement(DateRangeFilter, {
        createdAfter: createdAfter,
        createdBefore: createdBefore,
        onDateRangeChange: handleDateRangeChange,
        className: "gba:border-0 gba:shadow-none gba:p-0 gba:bg-transparent",
      }),
      hideSearch: true,
    } as any, // Temporary type assertion to bypass interface issue
    {
      id: "leadStatuses",
      title: "Lead Status",
      filters: leadStatusFilterOptions,
      backendSearch: getLeadStatusFilters,
    },
    {
      id: "leadRatings",
      title: "Lead Rating",
      filters: leadRatingFilterOptions,
      backendSearch: getLeadRatingFilters,
    },
    {
      id: "leadSources",
      title: "Lead Source",
      filters: leadSourceFilterOptions,
      backendSearch: getLeadSourceFilters,
    },
    {
      id: "industries",
      title: "Industry",
      filters: industryFilterOptions,
      backendSearch: getIndustryFilters,
    },
    {
      id: "companySizes",
      title: "Company Size",
      filters: companySizeFilterOptions,
      backendSearch: getCompanySizeFilters,
    },
    {
      id: "owners",
      title: "Owner",
      filters: ownerFilterOptions,
      backendSearch: getOwnerFilters,
    },
  ];

  // Create filter label map
  const filterLabelMap = {
    ...Object.fromEntries(leadStatusOptions.map((o) => [o.id, o.name])),
    ...Object.fromEntries(leadRatingOptions.map((o) => [o.id, o.name])),
    ...Object.fromEntries(leadSourceOptions.map((o) => [o.id, o.name])),
    ...Object.fromEntries(industryOptions.map((o) => [o.id, o.name])),
    ...Object.fromEntries(companySizeOptions.map((o) => [o.id, o.name])),
    ...Object.fromEntries(leadOwners.map((o) => [o.id, o.name])),
  };

  // Get current filters for API calls
  const getFilters = useCallback((): LeadFilters => {
    const leadStatuses = selectedFilters.filter((f) =>
      leadStatusOptions.map((o) => o.id).includes(f)
    );
    const leadRatings = selectedFilters.filter((f) =>
      leadRatingOptions.map((o) => o.id).includes(f)
    );
    const leadSources = selectedFilters.filter((f) =>
      leadSourceOptions.map((o) => o.id).includes(f)
    );
    const companySizes = selectedFilters.filter((f) =>
      companySizeOptions.map((o) => o.id).includes(f)
    );

    return {
      search,
      leadStatuses,
      leadRatings,
      leadSources,
      companySizes,
      createdAfter,
      createdBefore,
    };
  }, [
    search,
    selectedFilters,
    leadStatusOptions,
    leadRatingOptions,
    leadSourceOptions,
    companySizeOptions,
    createdAfter,
    createdBefore,
  ]);

  return {
    // Filter state
    search,
    selectedFilters,
    filtersInitialized,

    // Date range state
    createdAfter,
    createdBefore,

    // Filter data
    filterGroups,
    filterLabelMap,

    // Filter actions
    setSearch,
    addFilter,
    removeFilter,
    resetFilters,
    initializeFromUrl,
    getFilters,
    handleDateRangeChange,

    // Loading states
    isLoading,
    error,
  };
};
