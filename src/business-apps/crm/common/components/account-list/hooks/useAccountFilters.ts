import React, { useState, useCallback, useMemo, useEffect } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGetIndustries } from "../../lead-list/hooks/useGetIndustries";
import { useGetAccountOwners } from "./useGetAccountOwners";
import { useGetAccountTypes } from "./useGetAccountTypes";
import { useGetAccounts } from "./useGetAccounts";
import { useGetAccountContactInfo } from "./useGetAccountContactInfo";
import { useGetAnnualRevenue } from "./useGetAnnualRevenue";
import { useGetNumberOfEmployees } from "./useGetNumberOfEmployees";
import { useGetAccountLocations } from "./useGetAccountLocations";
import { useGetAccountContactFilters } from "./useGetAccountContactFilters";
import { DateRangeFilter } from "../../lead-list/components/DateRangeFilter";

export interface FilterGroup {
  id: string;
  title: string; // Changed from label to title to match DataFilterGroup
  filters: Array<{ id: string; label: string; value: any; selected: boolean }>;
  backendSearch?: (search: string) => {
    filters: Array<{ id: string; label: string; selected: boolean }>;
    loading: boolean;
    error: any;
  };
  customComponent?: React.ReactNode;
  hideSearch?: boolean;
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
  filtersInitialized: boolean;
  industrySearch: string;
  setIndustrySearch: (search: string) => void;
  ownerSearch: string;
  setOwnerSearch: (search: string) => void;
  typeSearch: string;
  setTypeSearch: (search: string) => void;
  companySearch: string;
  setCompanySearch: (search: string) => void;
  revenueSearch: string;
  setRevenueSearch: (search: string) => void;
  employeesSearch: string;
  setEmployeesSearch: (search: string) => void;
  locationSearch: string;
  setLocationSearch: (search: string) => void;
}

export const useAccountFilters = (
  context: BusinessAppContextProps
): AccountFilters => {
  const [search, setSearch] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [createdAfter, setCreatedAfter] = useState<string | undefined>();
  const [createdBefore, setCreatedBefore] = useState<string | undefined>();
  const [filtersInitialized, setFiltersInitialized] = useState(false);

  // Search states for different filter types
  const [industrySearch, setIndustrySearch] = useState("");
  const [ownerSearch, setOwnerSearch] = useState("");
  const [typeSearch, setTypeSearch] = useState("");
  const [companySearch, setCompanySearch] = useState("");
  const [revenueSearch, setRevenueSearch] = useState("");
  const [employeesSearch, setEmployeesSearch] = useState("");
  const [locationSearch, setLocationSearch] = useState("");

  // Get filter data with search
  const {
    industryOptions,
    isLoading: industryLoading,
    error: industryError,
  } = useGetIndustries(context, industrySearch);

  const {
    ownerOptions,
    isLoading: ownerLoading,
    error: ownerError,
  } = useGetAccountOwners(context, ownerSearch);

  const {
    typeOptions,
    isLoading: typeLoading,
    error: typeError,
  } = useGetAccountTypes(context, typeSearch);

  const {
    accounts: companyOptions,
    isLoading: companyLoading,
    error: companyError,
  } = useGetAccounts(context, companySearch);

  const {
    contactInfoFilters,
    isLoading: contactInfoLoading,
    error: contactInfoError,
  } = useGetAccountContactInfo();

  const {
    revenueOptions,
    isLoading: revenueLoading,
    error: revenueError,
  } = useGetAnnualRevenue(context, revenueSearch);

  const {
    employeeOptions,
    isLoading: employeesLoading,
    error: employeesError,
  } = useGetNumberOfEmployees(context, employeesSearch);

  const {
    countryOptions,
    regionOptions,
    cityOptions,
    isLoading: locationsLoading,
    error: locationsError,
  } = useGetAccountLocations(context, locationSearch);

  const {
    websiteFilters,
    phoneFilters,
    emailFilters,
    faxFilters,
  } = useGetAccountContactFilters();

  // Initialize filters from URL parameters when all data is loaded
  useEffect(() => {
    if (!filtersInitialized && !industryLoading && !ownerLoading && !typeLoading && !companyLoading && !revenueLoading && !employeesLoading && !locationsLoading) {
      const urlParams = new URLSearchParams(window.location.search);
      const preselectedFilters: string[] = [];

      // Only process URL filters if we have data loaded
      if (industryOptions.length > 0) {
        // Handle industry parameter: industry=Industry:v1:TECHNOLOGY
        const industryParams = urlParams.getAll('industry');
        industryParams.forEach(industryValue => {
          const matchingIndustry = industryOptions.find(option => option.id === industryValue);
          if (matchingIndustry) {
            preselectedFilters.push(matchingIndustry.id);
          }
        });
      }

      if (preselectedFilters.length > 0) {
        setSelectedFilters(preselectedFilters);
      }
      
      // Always set initialized to true once loading is complete
      setFiltersInitialized(true);
    }
  }, [industryOptions, industryLoading, ownerLoading, typeLoading, companyLoading, revenueLoading, employeesLoading, locationsLoading, filtersInitialized]);

  // Backend search functions for filter types
  const getIndustryFilters = useCallback(
    (search: string) => {
      // Don't set state during render - use setTimeout to defer it
      setTimeout(() => {
        setIndustrySearch(search);
      }, 0);

      return {
        filters: industryOptions.map((option) => ({
          id: option.id,
          label: option.name,
          value: option.name,
          selected: selectedFilters.includes(option.id),
        })),
        loading: industryLoading,
        error: industryError,
      };
    },
    [industryOptions, selectedFilters, industryLoading, industryError]
  );

  const getOwnerFilters = useCallback(
    (search: string) => {
      // Don't set state during render - use setTimeout to defer it
      setTimeout(() => {
        setOwnerSearch(search);
      }, 0);

      return {
        filters: ownerOptions.map((option) => ({
          id: option.id,
          label: option.displayName,
          value: option.id,
          selected: selectedFilters.includes(option.id),
        })),
        loading: ownerLoading,
        error: ownerError,
      };
    },
    [ownerOptions, selectedFilters, ownerLoading, ownerError]
  );

  const getTypeFilters = useCallback(
    (search: string) => {
      // Don't set state during render - use setTimeout to defer it
      setTimeout(() => {
        setTypeSearch(search);
      }, 0);

      return {
        filters: typeOptions.map((option) => ({
          id: option.id,
          label: option.name,
          value: option.id,
          selected: selectedFilters.includes(option.id),
        })),
        loading: typeLoading,
        error: typeError,
      };
    },
    [typeOptions, selectedFilters, typeLoading, typeError]
  );

  const getCompanyFilters = useCallback(
    (search: string) => {
      // Don't set state during render - use setTimeout to defer it
      setTimeout(() => {
        setCompanySearch(search);
      }, 0);

      return {
        filters: companyOptions.map((company) => ({
          id: `company-${company.id}`,
          label: company.name,
          value: { id: company.id, name: company.name },
          selected: selectedFilters.includes(`company-${company.id}`),
        })),
        loading: companyLoading,
        error: companyError,
      };
    },
    [companyOptions, selectedFilters, companyLoading, companyError]
  );

  const getRevenueFilters = useCallback(
    (search: string) => {
      setTimeout(() => {
        setRevenueSearch(search);
      }, 0);

      return {
        filters: revenueOptions.map((option) => ({
          id: option.id,
          label: option.name,
          value: option.id,
          selected: selectedFilters.includes(option.id),
        })),
        loading: revenueLoading,
        error: revenueError,
      };
    },
    [revenueOptions, selectedFilters, revenueLoading, revenueError]
  );

  const getEmployeesFilters = useCallback(
    (search: string) => {
      setTimeout(() => {
        setEmployeesSearch(search);
      }, 0);

      return {
        filters: employeeOptions.map((option) => ({
          id: option.id,
          label: option.name,
          value: option.id,
          selected: selectedFilters.includes(option.id),
        })),
        loading: employeesLoading,
        error: employeesError,
      };
    },
    [employeeOptions, selectedFilters, employeesLoading, employeesError]
  );

  const getLocationFilters = useCallback(
    (search: string) => {
      setTimeout(() => {
        setLocationSearch(search);
      }, 0);

      // Combine all location options for a single filter
      const allLocationOptions = [
        ...countryOptions.map(opt => ({ ...opt, type: 'country' })),
        ...regionOptions.map(opt => ({ ...opt, type: 'region' })),
        ...cityOptions.map(opt => ({ ...opt, type: 'city' })),
      ];

      return {
        filters: allLocationOptions.map((option) => ({
          id: option.id,
          label: option.name,
          value: { type: (option as any).type, id: option.id, name: option.name },
          selected: selectedFilters.includes(option.id),
        })),
        loading: locationsLoading,
        error: locationsError,
      };
    },
    [countryOptions, regionOptions, cityOptions, selectedFilters, locationsLoading, locationsError]
  );
  const filterGroups: FilterGroup[] = useMemo(
    () => [
      {
        id: "company",
        title: "Company",
        filters: companyOptions.map((company) => ({
          id: `company-${company.id}`,
          label: company.name,
          value: {
            id: company.id,
            name: company.name
          },
          selected: selectedFilters.includes(`company-${company.id}`),
        })),
        backendSearch: getCompanyFilters,
      },
      {
        id: "contactInfo",
        title: "Contact Info",
        filters: contactInfoFilters.map((filter) => ({
          id: filter.id,
          label: filter.label,
          value: filter.value,
          selected: selectedFilters.includes(filter.id),
        })),
      },
      {
        id: "creationDate",
        title: "Creation Date",
        filters: [],
        hideSearch: true,
      },
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
      {
        id: "owner",
        title: "Owner",
        filters: ownerOptions.map((option) => ({
          id: option.id,
          label: option.displayName,
          value: option.id,
          selected: selectedFilters.includes(option.id),
        })),
        backendSearch: getOwnerFilters,
      },
      {
        id: "legalForm",
        title: "Legal Form",
        filters: typeOptions.map((option) => ({
          id: option.id,
          label: option.name,
          value: option.id, // Use catalog ID for filtering instead of display value
          selected: selectedFilters.includes(option.id),
        })),
        backendSearch: getTypeFilters,
      },
      {
        id: "annualRevenue",
        title: "Annual Revenue",
        filters: revenueOptions.map((option) => ({
          id: option.id,
          label: option.name,
          value: option.id,
          selected: selectedFilters.includes(option.id),
        })),
        backendSearch: getRevenueFilters,
      },
      {
        id: "numberOfEmployees",
        title: "Number of Employees",
        filters: employeeOptions.map((option) => ({
          id: option.id,
          label: option.name,
          value: option.id,
          selected: selectedFilters.includes(option.id),
        })),
        backendSearch: getEmployeesFilters,
      },
      {
        id: "location",
        title: "Location",
        filters: [
          ...countryOptions.map((option) => ({
            id: `country-${option.id}`,
            label: `${option.name} (Country)`,
            value: { type: 'country', id: option.id, name: option.name },
            selected: selectedFilters.includes(`country-${option.id}`),
          })),
          ...regionOptions.map((option) => ({
            id: `region-${option.id}`,
            label: `${option.name} (Region)`,
            value: { type: 'region', id: option.id, name: option.name },
            selected: selectedFilters.includes(`region-${option.id}`),
          })),
          ...cityOptions.map((option) => ({
            id: `city-${option.id}`,
            label: `${option.name} (City)`,
            value: { type: 'city', name: option.name },
            selected: selectedFilters.includes(`city-${option.id}`),
          })),
        ],
        backendSearch: getLocationFilters,
      },
      {
        id: "website",
        title: "Website",
        filters: websiteFilters.map((filter) => ({
          id: filter.id,
          label: filter.label,
          value: filter.value,
          selected: selectedFilters.includes(filter.id),
        })),
      },
      {
        id: "phone",
        title: "Phone",
        filters: phoneFilters.map((filter) => ({
          id: filter.id,
          label: filter.label,
          value: filter.value,
          selected: selectedFilters.includes(filter.id),
        })),
      },
      {
        id: "email",
        title: "Email",
        filters: emailFilters.map((filter) => ({
          id: filter.id,
          label: filter.label,
          value: filter.value,
          selected: selectedFilters.includes(filter.id),
        })),
      },
      {
        id: "fax",
        title: "Fax",
        filters: faxFilters.map((filter) => ({
          id: filter.id,
          label: filter.label,
          value: filter.value,
          selected: selectedFilters.includes(filter.id),
        })),
      },
    ],
    [companyOptions, contactInfoFilters, industryOptions, ownerOptions, typeOptions, revenueOptions, employeeOptions, countryOptions, regionOptions, cityOptions, websiteFilters, phoneFilters, emailFilters, faxFilters, selectedFilters, getCompanyFilters, getIndustryFilters, getOwnerFilters, getTypeFilters, getRevenueFilters, getEmployeesFilters, getLocationFilters]
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
          if (group.id === "company") {
            if (!filters.companies) filters.companies = [];
            filters.companies.push(filter.value);
          } else if (group.id === "contactInfo") {
            if (!filters.contactInfo) filters.contactInfo = [];
            filters.contactInfo.push(filter.value);
          } else if (group.id === "industry") {
            if (!filters.industries) filters.industries = [];
            filters.industries.push(filter.value);
          } else if (group.id === "owner") {
            if (!filters.ownerEmployeeIds) filters.ownerEmployeeIds = [];
            filters.ownerEmployeeIds.push(filter.value);
          } else if (group.id === "legalForm") {
            if (!filters.legalFormIds) filters.legalFormIds = [];
            filters.legalFormIds.push(filter.value);
          } else if (group.id === "annualRevenue") {
            if (!filters.annualRevenueIds) filters.annualRevenueIds = [];
            filters.annualRevenueIds.push(filter.value);
          } else if (group.id === "numberOfEmployees") {
            if (!filters.numberOfEmployeesIds) filters.numberOfEmployeesIds = [];
            filters.numberOfEmployeesIds.push(filter.value);
          } else if (group.id === "location") {
            if (filter.value.type === 'country') {
              if (!filters.countryIds) filters.countryIds = [];
              filters.countryIds.push(filter.value.id);
            } else if (filter.value.type === 'region') {
              if (!filters.regionIds) filters.regionIds = [];
              filters.regionIds.push(filter.value.id);
            } else if (filter.value.type === 'city') {
              if (!filters.cities) filters.cities = [];
              filters.cities.push(filter.value.name);
            }
          } else if (group.id === "website") {
            if (!filters.websiteFilters) filters.websiteFilters = [];
            filters.websiteFilters.push(filter.value);
          } else if (group.id === "phone") {
            if (!filters.phoneFilters) filters.phoneFilters = [];
            filters.phoneFilters.push(filter.value);
          } else if (group.id === "email") {
            if (!filters.emailFilters) filters.emailFilters = [];
            filters.emailFilters.push(filter.value);
          } else if (group.id === "fax") {
            if (!filters.faxFilters) filters.faxFilters = [];
            filters.faxFilters.push(filter.value);
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
    industrySearch,
    setIndustrySearch,
    ownerSearch,
    setOwnerSearch,
    typeSearch,
    setTypeSearch,
    companySearch,
    setCompanySearch,
    revenueSearch,
    setRevenueSearch,
    employeesSearch,
    setEmployeesSearch,
    locationSearch,
    setLocationSearch,
  };
};
