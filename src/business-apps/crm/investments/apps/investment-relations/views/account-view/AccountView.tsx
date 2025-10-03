import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Button, Spinner, Alert } from "@newwork/nw-design-system";
import { Plus } from "lucide-react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGetInvestmentAccounts } from "@/common/data/investment/hooks/useInvestmentAccounts";
import type { InvestmentAccount } from "@/common/data/investment/types";
import type { InvestmentAccountQueryVariables } from "@/common/data/investment/queries/investmentAccountQueries";
import { DataContainer } from "@/components/layout/dataContainer/DataContainer";
import { AccountStatistics } from "./components/AccountStatistics";
import { AccountList } from "./components/AccountList";
import { ColumnConfig } from "@/components/dataController";
import { AppAction } from "@/components/app-action/AppAction";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { useInvestmentAccountFilters } from "./hooks/useInvestmentAccountFilters";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";

export interface AccountViewProps extends BusinessAppContextProps { }

export const AccountView: React.FC<AccountViewProps> = (context) => {
  const { accessToken } = context;

  // Read initial filters/search from URL (before first render)
  const getInitialFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const filters: string[] = [];
    const pushAll = (key: string, prefix: string) => {
      urlParams.getAll(key).forEach((v) => v && filters.push(`${prefix}:${v}`));
    };
    pushAll("owner", "owner");
    pushAll("industry", "industry");
    pushAll("legalForm", "legalForm");
    pushAll("companySize", "companySize");
    pushAll("annualRevenueBand", "annualRevenueBand");
    pushAll("company", "company");
    pushAll("location", "location");
    pushAll("status", "status");
    const search = urlParams.get("search") || "";
    return { search, filters };
  };
  const initial = getInitialFromUrl();

  // State management
  type SortOrder = "ASC" | "DESC" | undefined;
  const [searchTerm, setSearchTerm] = useState(initial.search);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [sortField, setSortField] = useState<string | undefined>("createdAt");
  const [sortOrder, setSortOrder] = useState<SortOrder>("DESC");
  const [selectedFilters, setSelectedFilters] = useState<string[]>(initial.filters);
  // const [showDataFilter, setShowDataFilter] = useState(false);

  // Hooks for data fetching
  const { fetchInvestmentAccounts } = useGetInvestmentAccounts(context);
  const {
    filterGroups,
    filterLabelMap,
    handleFilterChange,
    createdAfter,
    createdBefore,
    filtersInitialized,
  } = useInvestmentAccountFilters(context, selectedFilters, setSelectedFilters);

  // Data state
  const [accounts, setAccounts] = useState<InvestmentAccount[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Column visibility configuration
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(() => [
    { id: "actions", label: "Actions", visible: true, disabled: true },
    { id: "account", label: "Account", visible: true },
    { id: "contact", label: "Contact Info", visible: true },
    { id: "location", label: "Location", visible: true },
    { id: "status", label: "Status", visible: true },
    { id: "industry", label: "Industry", visible: true },
    { id: "legalForm", label: "Legal Form", visible: true },
    { id: "size", label: "Company Size", visible: false },
    { id: "revenue", label: "Revenue", visible: false },
    { id: "owner", label: "Owner", visible: true },
    { id: "created", label: "Creation Date", visible: true },
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

  // Build query variables
  const queryVariables: InvestmentAccountQueryVariables = useMemo(() => {
    const vars: Partial<InvestmentAccountQueryVariables> = {};
    const ownerIds: string[] = [];
    const industryIds: string[] = [];
    const legalFormIds: string[] = [];
    const sizeIds: string[] = [];
    const revenueIds: string[] = [];
    const names: string[] = [];
    const geoPresence: string[] = [];
    let hasWebsite = false,
      missingWebsite = false,
      hasEmail = false,
      missingEmail = false,
      hasPhone = false,
      missingPhone = false,
      hasContact = false,
      missingContact = false,
      isActive = false,
      isInactive = false;

    selectedFilters.forEach((f) => {
      if (f.startsWith("owner:")) ownerIds.push(f.slice(6));
      else if (f.startsWith("industry:")) {
        const val = f.slice(9);
        if (val.includes(":")) (vars as any).industryClassCodes = [...(vars as any).industryClassCodes || [], val.split(":").pop()!];
        else industryIds.push(val);
      }
      else if (f.startsWith("legalForm:")) {
        const val = f.slice(10);
        if (val.includes(":")) (vars as any).legalFormCodes = [...(vars as any).legalFormCodes || [], val.split(":").pop()!];
        else legalFormIds.push(val);
      }
      else if (f.startsWith("companySize:")) {
        const val = f.slice(12);
        if (val.includes(":")) (vars as any).companySizeCodes = [...(vars as any).companySizeCodes || [], val.split(":").pop()!];
        else sizeIds.push(val);
      }
      else if (f.startsWith("annualRevenueBand:")) {
        const val = f.slice(18);
        if (val.includes(":")) (vars as any).accountAnnualRevenueBandCodes = [...(vars as any).accountAnnualRevenueBandCodes || [], val.split(":").pop()!];
        else revenueIds.push(val);
      }
      else if (f.startsWith("company:")) names.push(f.slice(8));
      else if (f.startsWith("location:")) geoPresence.push(f.slice(9));
      else if (f === "status:active") isActive = true;
      else if (f === "status:inactive") isInactive = true;
      else if (f === "has:website") hasWebsite = true;
      else if (f === "missing:website") missingWebsite = true;
      else if (f === "has:email") hasEmail = true;
      else if (f === "missing:email") missingEmail = true;
      else if (f === "has:phone") hasPhone = true;
      else if (f === "missing:phone") missingPhone = true;
      else if (f === "has:contact") hasContact = true;
      else if (f === "missing:contact") missingContact = true;
    });

    if (ownerIds.length) vars.ownerEmployeeIds = ownerIds;
    if (industryIds.length) vars.industryClassIds = industryIds;
    if (legalFormIds.length) vars.legalFormIds = legalFormIds;
    if (sizeIds.length) vars.companySizeIds = sizeIds;
    if (revenueIds.length) vars.accountAnnualRevenueBandIds = revenueIds;
    if (names.length) vars.names = names;
    if (geoPresence.length) vars.geographicPresenceValues = geoPresence;

    const base: InvestmentAccountQueryVariables = {
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      search: searchTerm.trim() || undefined,
      ...(sortField && sortOrder
        ? { orderBy: [{ field: sortField, direction: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST' }] as any }
        : {}),
      ...(createdAfter ? { createdAtFrom: createdAfter } : {}),
      ...(createdBefore ? { createdAtTo: createdBefore } : {}),
      ...(hasWebsite ? { hasWebsite: true } : {}),
      ...(missingWebsite ? { missingWebsite: true } : {}),
      ...(hasEmail ? { hasEmail: true } : {}),
      ...(missingEmail ? { missingEmail: true } : {}),
      ...(hasPhone ? { hasPhone: true } : {}),
      ...(missingPhone ? { missingPhone: true } : {}),
      ...(hasContact ? { hasContact: true } : {}),
      ...(missingContact ? { missingContact: true } : {}),
      ...(isActive ? { isActive: true } : {}),
      ...(isInactive ? { isInactive: true } : {}),
      ...vars,
    };
    return base;
  }, [
    currentPage,
    pageSize,
    searchTerm,
    sortField,
    sortOrder,
    selectedFilters,
    createdAfter,
    createdBefore,
  ]);

  // Load data
  const loadData = useCallback(async () => {
    if (!accessToken || !filtersInitialized) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchInvestmentAccounts(queryVariables);
      setAccounts(result.InvestmentAccount || []);
      setTotalCount(result.InvestmentAccountAggregate?.aggregate?.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, filtersInitialized, fetchInvestmentAccounts, queryVariables]);

  // Listen for process events and refresh data when investment account processes complete
  useEffect(() => {
    const handleProcessEvent = (event: any) => {
      try {
        // Check for successful completion from different event structures
        if (event.detail?.resolution === "success") {
          loadData(); // Refresh account list data
          return;
        }

        // Also check for different event structure
        const response = event.detail?.response;
        if (
          response?.detail?.resolution === "success" ||
          response?.investmentAccount
        ) {
          loadData();
          return;
        }

        // For continue events, check if payload contains successful data
        if (
          event.type === "com.newwork.process.continue" &&
          event.detail?.payload
        ) {
          loadData();
        }
      } catch (err) {
        // Silently handle errors in process event handling
      }
    };

    // Listen to multiple possible event names (following Investment Record pattern)
    const eventNames = [
      "com.newwork.process.taskCompletion",
      "com.newwork.process.completion",
      "com.newwork.process.continue", // ✅ This is what our form dispatches!
      "com.newwork.process.processCompletion",
      "processCompletion",
      "taskCompletion",
      "taskCompleted",
      "processCompleted",
      "task-completion",
      "process-completion",
    ];

    eventNames.forEach((eventName) => {
      window.addEventListener(eventName, handleProcessEvent as EventListener);
    });

    return () => {
      eventNames.forEach((eventName) => {
        window.removeEventListener(
          eventName,
          handleProcessEvent as EventListener
        );
      });
    };
  }, [loadData]);

  // Load data on mount and when variables change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page on search
  }, []);

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // Handle sorting
  const handleSort = useCallback(
    (field: string) => {
      if (sortField !== field) {
        setSortField(field);
        setSortOrder("ASC");
        return;
      }
      if (sortOrder === "ASC") {
        setSortOrder("DESC");
      } else if (sortOrder === "DESC") {
        setSortField(undefined);
        setSortOrder(undefined);
      } else {
        setSortOrder("ASC");
      }
    },
    [sortField, sortOrder]
  );

  const handleSetFilter = useCallback((filters: string[]) => {
    setSelectedFilters(filters);
    setCurrentPage(1);
  }, []);

  // (Initial values already taken from URL above)

  // Sync selected filters and search to URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);

    const setList = (key: string, values: string[]) => {
      urlParams.delete(key);
      values.forEach((v) => urlParams.append(key, v));
    };

    const collect = (prefix: string) => selectedFilters.filter((f) => f.startsWith(`${prefix}:`)).map((f) => f.slice(prefix.length + 1));

    setList("owner", collect("owner"));
    setList("industry", collect("industry"));
    setList("legalForm", collect("legalForm"));
    setList("companySize", collect("companySize"));
    setList("annualRevenueBand", collect("annualRevenueBand"));
    setList("company", collect("company"));
    setList("location", collect("location"));
    setList("status", collect("status"));

    if (searchTerm) urlParams.set("search", searchTerm); else urlParams.delete("search");

    const newUrl = `${window.location.pathname}?${urlParams.toString()}`;
    window.history.replaceState({}, "", newUrl);
  }, [selectedFilters, searchTerm]);

  // Loading state
  if (isLoading && accounts.length === 0) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Alert variant="destructive" className="gba:mb-4">
        <div className="gba:flex gba:items-center gba:justify-between">
          <span>Error loading accounts: {error}</span>
          <Button variant="outline" size="sm" onClick={loadData}>
            Retry
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <div data-testid="investment-accounts-view">
      {/* Header */}
      <div className="gba:mb-6">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
          <div>
            <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">
              Investment Accounts
            </h1>
            <p className="gba:text-gray-600">
              Manage investment client accounts and relationships
            </p>
          </div>
        </div>

        {/* Statistics Cards (server-based, separate fetch) */}
        <AccountStatistics {...context} />
      </div>

      {/* Data Container with Account List */}
      <DataContainer
        dataControllerProps={{
          search: searchTerm,
          setSearch: handleSearch,
          debounceDelay: 500,
          filter: selectedFilters,
          setFilter: handleSetFilter,
          filterLabelMap,
          listTitle: (
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span>Accounts</span>
                <span className="gba:text-gray-500">({totalCount})</span>
              </div>
            </div>
          ),
          columnVisibility: {
            columns: columnConfig,
            onColumnVisibilityChange: handleColumnVisibilityChange,
            'data-testid': 'investment-accounts-column-visibility'
          },
          actions: (
            <AppAction
              contextsArray={[FlowContextName.createInvestmentAccount]}
              accessToken={accessToken}
              data-testid="add-account-action"
              emptyStateBehavior="hide"
            >
            <Button
              size="sm"
              variant="default"
              data-testid="add-account-button"
              type="button"
            >
              <Plus size={16} />
              {getTranslationFromI18nKeyAndLabel('crm:account.addAccount', 'Add Account')}
            </Button>
            </AppAction>
          ),
        }}
        dataFilterProps={{
          filterGroups,
          onFilterChange: handleFilterChange,
        }}
        dataBody={
          <AccountList
            accounts={accounts}
            searchTerm={searchTerm}
            onSearchChange={handleSearch}
            isLoading={isLoading}
            totalCount={totalCount}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={handlePageChange}
            onSort={handleSort}
            sortField={sortField}
            sortOrder={sortOrder}
            onClearFilters={() => setSelectedFilters([])}
            visibleColumns={visibleColumns}
            {...context}
          />
        }
      />
    </div>
  );
};

export default AccountView;
