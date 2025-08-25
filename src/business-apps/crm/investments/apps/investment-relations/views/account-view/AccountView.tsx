import React, { useState, useCallback, useEffect, useMemo } from "react";
import { 
  Button,
  Spinner,
  Alert
} from "@newwork/nw-design-system";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGetInvestmentAccounts } from "@/common/data/investment/hooks/useInvestmentAccounts";
import type { InvestmentAccount } from "@/common/data/investment/types";
import type { InvestmentAccountQueryVariables } from "@/common/data/investment/queries/investmentAccountQueries";
import { DataContainer } from "@/components/layout/dataContainer/DataContainer";
import { AccountStatistics } from "./components/AccountStatistics";
import { AccountList } from "./components/AccountList";
import { AppAction } from "@/components/app-action/AppAction";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { PlusSquareIcon } from "@phosphor-icons/react";
import { useInvestmentAccountFilters } from "./hooks/useInvestmentAccountFilters";

export interface AccountViewProps extends BusinessAppContextProps {}

export const AccountView: React.FC<AccountViewProps> = (context) => {
  const { accessToken } = context;
  
  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  // const [showDataFilter, setShowDataFilter] = useState(false);

  // Hooks for data fetching
  const { fetchInvestmentAccounts } = useGetInvestmentAccounts(context);
  const { filterGroups, filterLabelMap, handleFilterChange, createdAfter, createdBefore } = useInvestmentAccountFilters(context, selectedFilters, setSelectedFilters);

  // Data state
  const [accounts, setAccounts] = useState<InvestmentAccount[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
    let hasWebsite = false, missingWebsite = false, hasEmail = false, missingEmail = false, hasPhone = false, missingPhone = false, hasContact = false, missingContact = false;

    selectedFilters.forEach((f) => {
      if (f.startsWith("owner:")) ownerIds.push(f.slice(6));
      else if (f.startsWith("industry:")) industryIds.push(f.slice(9));
      else if (f.startsWith("legalForm:")) legalFormIds.push(f.slice(10));
      else if (f.startsWith("companySize:")) sizeIds.push(f.slice(12));
      else if (f.startsWith("annualRevenueBand:")) revenueIds.push(f.slice(18));
      else if (f.startsWith("company:")) names.push(f.slice(8));
      else if (f.startsWith("location:")) geoPresence.push(f.slice(9));
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
      orderBy: [{ field: sortField, direction: sortOrder }],
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
      ...vars,
    };
    return base;
  }, [currentPage, pageSize, searchTerm, sortField, sortOrder, selectedFilters, createdAfter, createdBefore]);

  // Load data
  const loadData = useCallback(async () => {
    if (!accessToken) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await fetchInvestmentAccounts(queryVariables);
      setAccounts(result.InvestmentAccount || []);
      setTotalCount(result.InvestmentAccountAggregate?.aggregate?.count || 0);
    } catch (err) {
      console.error('Error loading investment accounts:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, fetchInvestmentAccounts, queryVariables]);

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
  const handleSort = useCallback((field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC");
    } else {
      setSortField(field);
      setSortOrder("ASC");
    }
  }, [sortField, sortOrder]);

  const handleSetFilter = useCallback((filters: string[]) => {
    setSelectedFilters(filters);
    setCurrentPage(1);
  }, []);

  // const toggleDataFilter = useCallback(() => {
  //   setShowDataFilter(prev => !prev);
  // }, []);

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
            <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">Investment Accounts</h1>
            <p className="gba:text-gray-600">Manage investment client accounts and relationships</p>
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
          actions: (
            <AppAction
              contextsArray={[FlowContextName.createInvestmentAccount]}
              accessToken={accessToken}
              data-testid="add-account-action"
              emptyStateBehavior="hide"
            >
              <button
                className="gba:flex gba:flex-row gba:justify-center gba:items-center gba:px-3 gba:py-0 gba:h-8 gba:rounded gba:gap-1"
                data-testid="add-account-action"
                type="button"
              >
                <span className="gba:w-5 gba:h-5 gba:flex gba:items-center gba:justify-center gba:flex-none order-0 gba:grow-0">
                  <PlusSquareIcon />
                </span>
                <span className="gba:h-4 gba:font-normal gba:text-sm gba:leading-4 gba:flex gba:items-center gba:text-black gba:flex-none order-1 gba:grow-0">
                  Add
                </span>
              </button>
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
            {...context}
          />
        }
      />
    </div>
  );
};

export default AccountView;
