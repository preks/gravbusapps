"use client";

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { PageLayout } from "@/components/layout/pageLayout";
import { DataContainer } from "@/components/layout/dataContainer";
import { useLeadListData } from "./hooks/useLeadListData";
import { useLeadFilters } from "./hooks/useLeadFilters";
import { LeadTable } from "./components/LeadTable";
import { LeadStatisticsWithTrend } from "./components/LeadStatistics";
import { useLeadStatisticsWithTrend } from "./hooks/useLeadStatisticsWithTrend";
import { ColumnVisibilityDropdown, ColumnConfig } from "./components/ColumnVisibilityDropdown";

import { PiStar, PiUsersFour, PiFunnelSimple } from "react-icons/pi";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { startProcess } from "@/common/utils/start-process";
import { Lead } from "./types";
import { useLeadStatisticsQueries } from "./queries/LeadStatisticsQueries";

export interface LeadListProps extends BusinessAppContextProps {
  sourceApp?: string;
}

/**
 * Lead List page component. Renders the lead list module with a table view.
 * @returns {JSX.Element}
 */
export const LeadList: React.FC<LeadListProps> = (props: LeadListProps) => {
  const { accessToken, sourceApp } = props;
  const { t } = useTranslation();

  // Use the centralized lead filters hook
  const {
    search,
    setSearch,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    resetFilters,
    initializeFromUrl,
    createdAfter: filterCreatedAfter,
    createdBefore: filterCreatedBefore,
    handleDateRangeChange: filterHandleDateRangeChange,
    filtersInitialized,
  } = useLeadFilters(props);

  // Valid sort fields for Lead entity
  const VALID_SORT_FIELDS = [
    "firstName",
    "lastName",
    "email",
    "companyName",
    "companyWebsite",
    "companyPhone",
    "createdAt",
    "updatedAt",
    "ownerEmployeeId",
    "leadStatusRef",
    "leadRatingRef",
    "leadSourceRef",
    "industryRef",
    "phoneNumber",
    "companyEmail",
    "countryRef",
    "regionRef",
    "city",
  ];

  // Get initial values from URL parameters using standard web APIs - ONLY ONCE
  const [initialParams] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlSortField = urlParams.get("sortField") || "createdAt";

    // Validate sortField - if invalid, use default 'createdAt'
    const validSortField = VALID_SORT_FIELDS.includes(urlSortField)
      ? urlSortField
      : "createdAt";

    return {
      search: urlParams.get("search") || "",
      page: parseInt(urlParams.get("page") || "1", 10),
      pageSize: parseInt(urlParams.get("pageSize") || "20", 10),
      sortField: validSortField,
      sortOrder: urlParams.get("sortOrder") || "DESC",
    };
  });

  const [currentPage, setCurrentPage] = useState(initialParams.page);
  const [pageSize, setPageSize] = useState(initialParams.pageSize);
  const [sortField, setSortField] = useState(initialParams.sortField);
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">(
    initialParams.sortOrder as "ASC" | "DESC"
  );
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const initialLoadDone = useRef(false);

  // Define available columns with default visibility
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(() => [
    { id: 'actions', label: 'Actions', visible: true, disabled: true }, // Always visible
    { id: 'name', label: 'Name', visible: true },
    { id: 'company', label: 'Company', visible: true },
    { id: 'contact', label: 'Contact Info', visible: true },
    { id: 'country', label: 'Country', visible: true },
    { id: 'region', label: 'Region/State', visible: true },
    { id: 'city', label: 'City', visible: true },
    { id: 'status', label: 'Status', visible: true },
    { id: 'rating', label: 'Rating', visible: true },
    { id: 'source', label: 'Source', visible: true },
    { id: 'owner', label: 'Owner', visible: true },
    { id: 'created', label: 'Creation Date', visible: true },
    { id: 'industry', label: 'Industry', visible: false },
    { id: 'companyWebsite', label: 'Company Website', visible: false },
    { id: 'companyPhone', label: 'Company Phone', visible: false },
    { id: 'conversionStatus', label: 'Conversion Status', visible: false },
  ]);

  // Get visible columns for passing to table
  const visibleColumns = columnConfig.filter(col => col.visible).map(col => col.id);

  // Handle column visibility change
  const handleColumnVisibilityChange = useCallback((columnId: string, visible: boolean) => {
    setColumnConfig(prev => 
      prev.map(col => 
        col.id === columnId ? { ...col, visible } : col
      )
    );
  }, []);

  // Filter groups based on visible columns
  const visibleFilterGroups = useMemo(() => {
    const columnToFilterMap: Record<string, string> = {
      status: 'leadStatuses',
      rating: 'leadRatings', 
      source: 'leadSources',
      industry: 'industries',
      country: 'countries',
      region: 'regions',
      city: 'cities',
      // Note: name, company, contact, owner, created, companyWebsite, companyPhone, conversionStatus don't have corresponding filters
      // companyWebsite and companyPhone are handled through search functionality only
    };

    return filterGroups.filter(group => {
      // Find the column that corresponds to this filter group
      const correspondingColumn = Object.keys(columnToFilterMap).find(
        columnId => columnToFilterMap[columnId] === group.id
      );
      
      // If there's no corresponding column (shouldn't happen), show the filter
      // If there is a corresponding column, only show the filter if the column is visible
      return !correspondingColumn || visibleColumns.includes(correspondingColumn);
    });
  }, [filterGroups, visibleColumns]);

  // Initialize search from URL if not already set - ONLY ONCE
  useEffect(() => {
    if (initialParams.search && !search) {
      setSearch(initialParams.search);
    }
  }, []);

  // Update URL parameters using standard web APIs
  const updateURLParams = useCallback(
    (params: {
      search?: string;
      page?: number;
      pageSize?: number;
      sortField?: string;
      sortOrder?: "ASC" | "DESC";
    }) => {
      const newSearchParams = new URLSearchParams(window.location.search);

      if (params.search !== undefined) {
        if (params.search) {
          newSearchParams.set("search", params.search);
        } else {
          newSearchParams.delete("search");
        }
      }

      if (params.page !== undefined) {
        if (params.page > 1) {
          newSearchParams.set("page", params.page.toString());
        } else {
          newSearchParams.delete("page");
        }
      }

      if (params.pageSize !== undefined) {
        if (params.pageSize !== 20) {
          newSearchParams.set("pageSize", params.pageSize.toString());
        } else {
          newSearchParams.delete("pageSize");
        }
      }

      if (params.sortField !== undefined) {
        if (params.sortField !== "createdAt" && params.sortField !== "") {
          newSearchParams.set("sortField", params.sortField);
        } else {
          newSearchParams.delete("sortField");
        }
      }

      if (params.sortOrder !== undefined) {
        if (params.sortOrder !== "DESC") {
          newSearchParams.set("sortOrder", params.sortOrder);
        } else {
          newSearchParams.delete("sortOrder");
        }
      }

      const newURL = `${
        window.location.pathname
      }?${newSearchParams.toString()}`;
      window.history.replaceState({}, "", newURL);
    },
    []
  );

  // Handle adding a new lead
  const handleAddLead = useCallback(() => {
    startProcess({
      domain: "customer-relations",
      processName: "createLead",
      builderType: "NATIVE_SCREEN",
      payload: {},
    });
  }, []);

  // Adapter function for DataFilter component
  const handleFilterChange = useCallback(
    (filterId: string, selected: boolean) => {
      selected ? addFilter(filterId) : removeFilter(filterId);
    },
    [addFilter, removeFilter]
  );

  // Function for DataController setFilter requirement
  const handleSetFilter = useCallback(
    (filters: string[]) => {
      // This is called by DataController's "Clear all filters" button or individual filter removal
      if (filters.length === 0) {
        // Clear all filters
        resetFilters();
      } else {
        // Handle individual filter removal - find which filters were removed and remove them
        const removedFilters = selectedFilters.filter(
          (f) => !filters.includes(f)
        );
        removedFilters.forEach((filterId) => removeFilter(filterId));
      }
    },
    [resetFilters, selectedFilters, removeFilter]
  );

  // Get lead data with search, sorting, and filters
  // Compute filters directly to avoid circular dependencies
  const leadStatuses = selectedFilters.filter((f) => 
    ['LEAD_NEW', 'LEAD_OPEN', 'LEAD_QUALIFIED', 'LEAD_CONVERTED', 'LEAD_LOST', 'UNKNOWN_LEAD_STATUS'].includes(f)
  );
  const leadRatings = selectedFilters.filter((f) => 
    ['HOT_LEAD', 'WARM_LEAD', 'COLD_LEAD', 'UNKNOWN_LEAD_RATING'].includes(f)
  );
  const leadSources = selectedFilters.filter((f) => f.startsWith('LeadSource:'));
  const industries = selectedFilters.filter((f) => f.startsWith('Industry:'));
  const companySizes = selectedFilters.filter((f) => f.startsWith('CompanySize:'));
  const owners = selectedFilters.filter((f) => f.startsWith('employee-'));
  const leadContacts = selectedFilters.filter((f) => {
    // Contact IDs are UUIDs that don't match other patterns
    return f.includes('-') && f.length > 10 && 
           !f.startsWith('employee-') && 
           !f.startsWith('LeadSource:') && 
           !f.startsWith('Industry:') && 
           !f.startsWith('CompanySize:') &&
           !['LEAD_NEW', 'LEAD_OPEN', 'LEAD_QUALIFIED', 'LEAD_CONVERTED', 'LEAD_LOST', 'UNKNOWN_LEAD_STATUS', 'HOT_LEAD', 'WARM_LEAD', 'COLD_LEAD', 'UNKNOWN_LEAD_RATING'].includes(f);
  });
  const leadCompanies = selectedFilters.filter((f) => {
    // Company names are simple strings without special patterns
    return !f.includes(':') && 
           !f.includes('-') && 
           !['LEAD_NEW', 'LEAD_OPEN', 'LEAD_QUALIFIED', 'LEAD_CONVERTED', 'LEAD_LOST', 'UNKNOWN_LEAD_STATUS', 'HOT_LEAD', 'WARM_LEAD', 'COLD_LEAD', 'UNKNOWN_LEAD_RATING'].includes(f) &&
           !f.startsWith('employee-');
  });
  // Address filters - use filterLabelMap to identify the correct filter types
  // For now, use a simple approach to identify address filters by pattern matching
  const countries = selectedFilters.filter((f) => {
    return filterLabelMap[f] && f.match(/^[A-Z]{2,3}:|:v\d+:[A-Z]{2,3}$/) || f.length === 2; // Country codes or catalog entries
  });
  const regions = selectedFilters.filter((f) => {
    return filterLabelMap[f] && !f.includes(':') && !f.includes('-') && 
           !['LEAD_NEW', 'LEAD_OPEN', 'LEAD_QUALIFIED', 'LEAD_CONVERTED', 'LEAD_LOST', 'UNKNOWN_LEAD_STATUS', 'HOT_LEAD', 'WARM_LEAD', 'COLD_LEAD', 'UNKNOWN_LEAD_RATING'].includes(f) &&
           !f.startsWith('employee-') && f.length > 2; // Region/state names
  });
  const cities = selectedFilters.filter((f) => {
    return filterLabelMap[f] && !f.includes(':') && !f.includes('-') && 
           !['LEAD_NEW', 'LEAD_OPEN', 'LEAD_QUALIFIED', 'LEAD_CONVERTED', 'LEAD_LOST', 'UNKNOWN_LEAD_STATUS', 'HOT_LEAD', 'WARM_LEAD', 'COLD_LEAD', 'UNKNOWN_LEAD_RATING'].includes(f) &&
           !f.startsWith('employee-') && f.length > 2; // City names
  });
  
  const { leads, total, loading, error, hasMore, loadMore, loadPage, retry } =
    useLeadListData({
      search,
      leadStatuses,
      leadRatings,
      leadSources,
      industries,
      companySizes,
      owners,
      leadContacts,
      leadCompanies,
      countries,
      regions,
      cities,
      createdAfter: filterCreatedAfter,
      createdBefore: filterCreatedBefore,
      sortField,
      sortOrder,
      accessToken,
      sourceApp,
    });

  // Remove this debug useEffect - it was causing infinite loops
  // useEffect(() => {
  //   const currentFilters = getFilters();
  // }, [selectedFilters, getFilters]);

  // Get lead statistics (independent from search/filters)
  const {
    trendData,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useLeadStatisticsWithTrend({ ...props, sourceApp });

  // Also get the text-based statistics that don't have trend data
  const { fetchMostCommonLeadSource } = useLeadStatisticsQueries({
    ...props,
    sourceApp,
  });
  const [textStatistics, setTextStatistics] = useState({
    mostCommonLeadSource: "N/A",
  });

  // Fetch text statistics
  useEffect(() => {
    const fetchTextStats = async () => {
      try {
        const leadSource = await fetchMostCommonLeadSource();
        setTextStatistics({ mostCommonLeadSource: leadSource });
      } catch (error) {
        console.error("Error fetching text statistics:", error);
      }
    };

    if (props.accessToken) {
      fetchTextStats();
    }
  }, [props.accessToken, fetchMostCommonLeadSource]);

  // Trigger initial data loading when component mounts and filters are initialized
  useEffect(() => {
    if (!initialLoadDone.current && accessToken && filtersInitialized) {
      initialLoadDone.current = true;
      loadPage(currentPage, pageSize);
    }
  }, [accessToken, currentPage, pageSize, filtersInitialized]);

  // Trigger search when search term changes
  useEffect(() => {
    if (initialLoadDone.current && filtersInitialized) {
      setCurrentPage(1);
      updateURLParams({ search, page: 1 });
      loadPage(1, pageSize); // Reset to first page when search changes
    }
  }, [search, pageSize, filtersInitialized, updateURLParams]);

  // Trigger reload when filters change - FIXED to prevent infinite loops
  useEffect(() => {
    if (initialLoadDone.current && filtersInitialized) {
      setCurrentPage(1);
      loadPage(1, pageSize);
    }
  }, [
    selectedFilters.join(','), // Use string join instead of JSON.stringify
    filterCreatedAfter,
    filterCreatedBefore,
    pageSize,
    filtersInitialized,
  ]);

  // Handle lead selection
  const handleSelectLead = useCallback((lead: Lead) => {
    setSelectedLead(lead);
  }, []);

  // Handle closing the details panel
  const handleCloseDetails = useCallback(() => {
    setSelectedLead(null);
  }, []);

  // Handle search change
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearch(value);
    },
    [setSearch]
  );

  // Handle pagination change
  const handlePaginationChange = useCallback(
    (page: number, newPageSize?: number) => {
      const targetPageSize = newPageSize || pageSize;
      setCurrentPage(page);
      setPageSize(targetPageSize);
      updateURLParams({ page, pageSize: targetPageSize });
      loadPage(page, targetPageSize);
    },
    [pageSize, updateURLParams, loadPage]
  );

  // Handle sorting change
  const handleSortingChange = useCallback(
    (field: string, order: "ASC" | "DESC" | "") => {
      // Validate field is allowed for sorting
      if (field && !VALID_SORT_FIELDS.includes(field)) {
        console.warn(`Invalid sort field: ${field}. Clearing sort.`);
        field = "";
        order = "";
      }

      // When order is empty, clear sorting completely
      if (order === "") {
        setSortField("");
        setSortOrder("DESC"); // Keep DESC as default for state type, but field will be empty
        setCurrentPage(1);
        updateURLParams({
          sortField: "",
          sortOrder: "DESC",
          page: 1,
        });
      } else {
        setSortField(field);
        setSortOrder(order);
        setCurrentPage(1);
        updateURLParams({
          sortField: field,
          sortOrder: order,
          page: 1,
        });
      }

      loadPage(1, pageSize);
    },
    [pageSize, updateURLParams, loadPage, VALID_SORT_FIELDS]
  );

  return (
    <div data-testid="lead-list-content">
      <div className="gba:mb-6" data-testid="lead-statistics-section">
        {trendData ? (
          <LeadStatisticsWithTrend
            trendData={trendData}
            mostCommonLeadSource={textStatistics.mostCommonLeadSource}
            isLoading={statsLoading}
            error={statsError}
            onRetry={refetchStats}
          />
        ) : (
          <div>Loading statistics...</div>
        )}
      </div>

      <DataContainer
        dataControllerProps={{
          search,
          setSearch,
          debounceDelay: 500,
          filter: selectedFilters,
          setFilter: handleSetFilter,
          filterLabelMap,
          dateRange: {
            createdAfter: filterCreatedAfter,
            createdBefore: filterCreatedBefore,
            onClear: () => filterHandleDateRangeChange(undefined, undefined),
          },
          listTitle: (
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span>Leads</span>
                <span className="gba:text-gray-500">({total})</span>
              </div>
            </div>
          ),
          addButton: {
            onClick: handleAddLead,
            label: "Add",
            "data-testid": "add-lead-button",
          },
          actions: [
            <ColumnVisibilityDropdown
              key="column-visibility"
              columns={columnConfig}
              onColumnVisibilityChange={handleColumnVisibilityChange}
              data-testid="lead-list-column-visibility"
            />
          ],
        }}
        dataFilterProps={{
          filterGroups: visibleFilterGroups,
          onFilterChange: handleFilterChange,
        }}
        dataBody={
          <div data-testid="lead-table-container">
            <LeadTable
              {...props}
              leads={leads}
              loading={loading}
              error={error}
              hasMore={hasMore}
              loadMore={loadMore}
              loadPage={loadPage}
              retry={retry}
              total={total}
              pageSize={pageSize}
              currentPage={currentPage}
              sortField={sortField}
              sortOrder={sortOrder}
              onSelectLead={handleSelectLead}
              onPaginationChange={handlePaginationChange}
              onSortingChange={handleSortingChange}
              selectedLeadId={selectedLead?.id}
              visibleColumns={visibleColumns}
            />
          </div>
        }
      />
    </div>
  );
};

export default LeadList;
