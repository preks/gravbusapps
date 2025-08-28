"use client";

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";

import { DataContainer } from "@/components/layout/dataContainer";
import { useAccountListData } from "./hooks/useAccountListData";
import { useAccountFilters } from "./hooks/useAccountFilters";
import { AccountTable } from "./components/AccountTable";
import { AccountStatisticsWithTrend } from "./components/AccountStatistics";
import { useAccountStatisticsWithTrend } from "./hooks/useAccountStatisticsWithTrend";

import {
  ColumnVisibilityDropdown,
  ColumnConfig,
} from "./components/ColumnVisibilityDropdown";

import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { startProcess } from "@/common/utils/start-process";
import { useProcessCompletion } from "@/common/hooks/useProcessCompletion";
import { Account } from "./types";

export interface AccountListProps extends BusinessAppContextProps {
  sourceApp?: string;
}

/**
 * Account List page component. Renders the account list module with a table view.
 * @returns {JSX.Element}
 */
export const AccountList: React.FC<AccountListProps> = (
  props: AccountListProps
) => {
  const { accessToken, sourceApp } = props;

  // Use the centralized account filters hook
  const {
    search,
    setSearch,
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    clearAllFilters,
    getFilters,
    createdAfter: filterCreatedAfter,
    createdBefore: filterCreatedBefore,
    handleDateRangeChange: filterHandleDateRangeChange,
    filtersInitialized,
  } = useAccountFilters(props);

  // Define available columns with default visibility
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(() => [
    { id: "actions", label: "Actions", visible: true, disabled: true }, // Always visible
    { id: "company", label: "Account", visible: true },
    { id: "contact", label: "Contact Info", visible: true },
    { id: "created", label: "Creation Date", visible: true },
    { id: "owner", label: "Owner", visible: true },
    { id: "legalForm", label: "Legal Form", visible: true },
    { id: "industry", label: "Industry", visible: true },
    // New optional columns as requested
    { id: "website", label: "Website", visible: false },
    { id: "country", label: "Country", visible: false },
    { id: "region", label: "Region/State", visible: false },
    { id: "city", label: "City", visible: false },
    { id: "annualRevenue", label: "Annual Revenue", visible: false },
    { id: "employees", label: "Number of Employees", visible: false },
    { id: "foundationDate", label: "Foundation Date", visible: false },
    { id: "phone", label: "Phone", visible: false },
    { id: "email", label: "Email", visible: false },
    { id: "fax", label: "Fax", visible: false },
  ]);

  // Get visible columns for passing to table
  const visibleColumns = columnConfig
    .filter((col) => col.visible)
    .map((col) => col.id);

  // Handle column visibility change
  const handleColumnVisibilityChange = useCallback(
    (columnId: string, visible: boolean) => {
      setColumnConfig((prev) =>
        prev.map((col) => (col.id === columnId ? { ...col, visible } : col))
      );
    },
    []
  );

  // Filter groups based on visible columns
  const visibleFilterGroups = useMemo(() => {
    const columnToFilterMap: Record<string, string> = {
      company: "company",
      contact: "contactInfo",
      created: "creationDate",
      industry: "industry",
      owner: "owner",
      legalForm: "legalForm",
      // New column mappings
      website: "website",
      country: "location",
      region: "location",
      city: "location",
      annualRevenue: "annualRevenue",
      employees: "numberOfEmployees",
      phone: "phone",
      email: "email",
      fax: "fax",
      // Note: foundationDate doesn't have a filter (just sortable)
    };

    return filterGroups.filter((group) => {
      // Find the column that corresponds to this filter group
      const correspondingColumn = Object.keys(columnToFilterMap).find(
        (columnId) => columnToFilterMap[columnId] === group.id
      );

      // If there's no corresponding column (shouldn't happen), show the filter
      // If there is a corresponding column, only show the filter if the column is visible
      return (
        !correspondingColumn || visibleColumns.includes(correspondingColumn)
      );
    });
  }, [filterGroups, visibleColumns]);

  // Get initial values from URL parameters using standard web APIs - ONLY ONCE
  const [initialParams] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return {
      search: urlParams.get("search") || "",
      page: parseInt(urlParams.get("page") || "1", 10),
      pageSize: parseInt(urlParams.get("pageSize") || "20", 10),
      sortField: urlParams.get("sortField") || "",
      sortOrder: urlParams.get("sortOrder") || "DESC",
    };
  });

  const [currentPage, setCurrentPage] = useState(initialParams.page);
  const [pageSize, setPageSize] = useState(initialParams.pageSize);
  const [sortField, setSortField] = useState(initialParams.sortField);
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">(
    initialParams.sortOrder as "ASC" | "DESC"
  );
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const initialLoadDone = useRef(false);

  // Initialize search from URL if not already set - ONLY ONCE
  useEffect(() => {
    if (initialParams.search && !search) {
      setSearch(initialParams.search);
    }
  }, []); // Remove dependencies to prevent re-running

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

  // Handle adding a new account
  const handleAddAccount = useCallback(() => {
    startProcess({
      domain: "customer-relations",
      processName: "saveAccount",
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
        clearAllFilters();
      } else {
        // Handle individual filter removal - find which filters were removed and remove them
        const removedFilters = selectedFilters.filter(
          (f) => !filters.includes(f)
        );
        removedFilters.forEach((filterId) => removeFilter(filterId));
      }
    },
    [clearAllFilters, selectedFilters, removeFilter]
  );

  // Get account data with search, sorting, and filters
  const filters = getFilters();
  const {
    accounts,
    total,
    loading,
    error,
    hasMore,
    loadMore,
    loadPage,
    retry,
  } = useAccountListData({
    search: search,
    sortField: sortField,
    sortOrder: sortOrder,
    context: props,
    sourceApp: sourceApp,
    // accountTypes: filters.accountTypes || [], // REMOVED: field does not exist in GraphQL schema
    companies: filters.companies || [],
    contactInfo: filters.contactInfo || [],
    industries: filters.industries || [],
    ownerEmployeeIds: filters.ownerEmployeeIds || [],
    legalFormIds: filters.legalFormIds || [],
    annualRevenueIds: filters.annualRevenueIds || [],
    numberOfEmployeesIds: filters.numberOfEmployeesIds || [],
    countryIds: filters.countryIds || [],
    regionIds: filters.regionIds || [],
    cities: filters.cities || [],
    websiteFilters: filters.websiteFilters || [],
    phoneFilters: filters.phoneFilters || [],
    emailFilters: filters.emailFilters || [],
    faxFilters: filters.faxFilters || [],
    createdAfter: filterCreatedAfter,
    createdBefore: filterCreatedBefore,
  });

  // Get account statistics (independent from search/filters)
  const {
    trendData,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useAccountStatisticsWithTrend({ ...props, sourceApp });

  // Listen for process completion events and refresh data when account processes complete
  useProcessCompletion({
    onSuccess: () => {
      console.log("✅ Process completed successfully, refreshing account data");
      retry();
      refetchStats(); // Also refresh statistics
    },
    onFailure: () => {
      console.log("❌ Process failed, no data refresh needed");
    },
  });

  // DEBUG: Add temporary listeners to debug process events
  useEffect(() => {
    const handleProcessContinue = (event: Event) => {
      const customEvent = event as CustomEvent<{ event: string; payload: any }>;
      console.log(
        "🔄 Account Process continue event received:",
        customEvent.detail
      );
    };

    const handleProcessCompletion = (event: Event) => {
      const customEvent = event as CustomEvent<{ resolution: string }>;
      console.log(
        "🎯 Account Process completion event received:",
        customEvent.detail
      );
    };

    // Listen for both events to debug
    window.addEventListener(
      "com.newwork.process.continue",
      handleProcessContinue
    );
    window.addEventListener(
      "com.newwork.process.processCompletion",
      handleProcessCompletion
    );

    return () => {
      window.removeEventListener(
        "com.newwork.process.continue",
        handleProcessContinue
      );
      window.removeEventListener(
        "com.newwork.process.processCompletion",
        handleProcessCompletion
      );
    };
  }, []);

  // Trigger initial data loading when component mounts and filters are initialized
  useEffect(() => {
    if (!initialLoadDone.current && accessToken && filtersInitialized) {
      initialLoadDone.current = true;
      loadPage(currentPage, pageSize);
    }
  }, [accessToken, currentPage, pageSize, filtersInitialized, loadPage]);

  // Trigger search when search term changes
  useEffect(() => {
    if (initialLoadDone.current && filtersInitialized) {
      setCurrentPage(1);
      updateURLParams({ search, page: 1 });
      loadPage(1, pageSize, {}, sortField, sortOrder);
    }
  }, [search, pageSize, filtersInitialized, loadPage]);

  // Trigger reload when filters change
  useEffect(() => {
    if (initialLoadDone.current && filtersInitialized) {
      setCurrentPage(1);
      loadPage(1, pageSize, {}, sortField, sortOrder);
    }
  }, [
    JSON.stringify(selectedFilters),
    filterCreatedAfter,
    filterCreatedBefore,
    pageSize,
    filtersInitialized,
    loadPage,
  ]);

  // Handle account selection
  const handleSelectAccount = useCallback((account: Account) => {
    setSelectedAccount(account);
  }, []);

  // Handle closing the details panel
  const handleCloseDetails = useCallback(() => {
    setSelectedAccount(null);
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
        // Pass empty field to loadPage immediately
        loadPage(1, pageSize, {}, "", "DESC");
      } else {
        setSortField(field);
        setSortOrder(order);
        setCurrentPage(1);
        updateURLParams({
          sortField: field,
          sortOrder: order,
          page: 1,
        });
        // Pass new sorting values to loadPage immediately
        loadPage(1, pageSize, {}, field, order);
      }
    },
    [pageSize, updateURLParams, loadPage]
  );

  return (
    <div data-testid="account-list-content">
      <div className="gba:mb-6" data-testid="account-statistics-section">
        {trendData ? (
          <AccountStatisticsWithTrend
            trendData={trendData}
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
                <span>Accounts</span>
                <span className="gba:text-gray-500">({total})</span>
              </div>
            </div>
          ),
          addButton: {
            onClick: handleAddAccount,
            label: "Add",
            "data-testid": "add-account-button",
          },
          actions: [
            <ColumnVisibilityDropdown
              key="column-visibility"
              columns={columnConfig}
              onColumnVisibilityChange={handleColumnVisibilityChange}
              data-testid="account-list-column-visibility"
            />,
          ],
        }}
        dataFilterProps={{
          filterGroups,
          onFilterChange: handleFilterChange,
        }}
        dataBody={
          <div data-testid="account-table-container">
            <AccountTable
              {...props}
              accounts={accounts}
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
              onSelectAccount={handleSelectAccount}
              onPaginationChange={handlePaginationChange}
              onSortingChange={handleSortingChange}
              selectedAccountId={selectedAccount?.id}
              visibleColumns={visibleColumns}
            />
          </div>
        }
      />
    </div>
  );
};

export default AccountList;
