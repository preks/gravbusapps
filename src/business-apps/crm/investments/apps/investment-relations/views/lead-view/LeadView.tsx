import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Button, Alert } from "@newwork/nw-design-system";
// import { Plus } from "lucide-react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGetInvestmentLeads } from "@/common/data/investment/hooks/useInvestmentLeads";
import type { InvestmentLead } from "@/common/data/investment/types";
import type { InvestmentLeadQueryVariables } from "@/common/data/investment/queries/investmentLeadQueries";
import { DataContainer } from "@/components/layout/dataContainer/DataContainer";
import { LeadStatistics } from "./components/LeadStatistics";
import { LeadList } from "./components/LeadList";
import { AppAction } from "@/components/app-action/AppAction";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { PlusSquareIcon } from "@phosphor-icons/react";
import { useInvestmentLeadFilters } from "./hooks/useInvestmentLeadFilters";

export interface LeadViewProps extends BusinessAppContextProps {}

export const LeadView: React.FC<LeadViewProps> = (context) => {
  const { accessToken } = context;

  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  // const [showDataFilter, setShowDataFilter] = useState(false);
  const {
    filterGroups,
    filterLabelMap,
    handleFilterChange,
    createdAfter,
    createdBefore,
  } = useInvestmentLeadFilters(context, selectedFilters, setSelectedFilters);

  // Hooks for data fetching
  const { fetchInvestmentLeads } = useGetInvestmentLeads(context);

  // Data state
  const [leads, setLeads] = useState<InvestmentLead[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lead statistics refresh function (will be defined by LeadStatistics component)
  const [refreshStats, setRefreshStats] = useState<(() => void) | null>(null);

  // Build query variables
  const queryVariables: InvestmentLeadQueryVariables = useMemo(() => {
    const filterVars: Partial<InvestmentLeadQueryVariables> = {};
    const statusIds: string[] = [];
    const ownerIds: string[] = [];
    const ratingIds: string[] = [];
    const sourceIds: string[] = [];
    const countryIds: string[] = [];
    const companyNames: string[] = [];
    const regions: string[] = [];
    const localities: string[] = [];
    const contactFullNames: string[] = [];
    let sensitive: boolean | undefined = undefined;
    selectedFilters.forEach((f) => {
      if (f.startsWith("status:")) statusIds.push(f.slice(7));
      else if (f.startsWith("owner:")) ownerIds.push(f.slice(6));
      else if (f.startsWith("rating:")) ratingIds.push(f.slice(7));
      else if (f.startsWith("source:")) sourceIds.push(f.slice(7));
      else if (f.startsWith("country:")) countryIds.push(f.slice(8));
      else if (f.startsWith("company:")) companyNames.push(f.slice(8));
      else if (f.startsWith("region:")) regions.push(f.slice(7));
      else if (f.startsWith("city:")) localities.push(f.slice(5));
      else if (f.startsWith("contact:")) contactFullNames.push(f.slice(8));
      else if (f === "sensitive:true") sensitive = true;
      else if (f === "sensitive:false") sensitive = false;
    });
    if (statusIds.length) filterVars.leadStatusIds = statusIds;
    if (ownerIds.length) filterVars.ownerEmployeeIds = ownerIds;
    if (ratingIds.length) (filterVars as any).leadRatingIds = ratingIds;
    if (sourceIds.length) (filterVars as any).leadSourceIds = sourceIds;
    if (countryIds.length) (filterVars as any).countryIds = countryIds;
    if (companyNames.length) (filterVars as any).companyNames = companyNames;
    if (regions.length) (filterVars as any).regions = regions;
    if (localities.length) (filterVars as any).localities = localities;
    if (contactFullNames.length)
      (filterVars as any).contactFullNames = contactFullNames;
    if (typeof sensitive === "boolean") filterVars.sensitive = sensitive;
    return {
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      search: searchTerm.trim() || undefined,
      orderBy: [{ field: sortField, direction: sortOrder }],
      ...(createdAfter ? { createdAtFrom: createdAfter } : {}),
      ...(createdBefore ? { createdAtTo: createdBefore } : {}),
      ...filterVars,
    };
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
    if (!accessToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchInvestmentLeads(queryVariables);
      setLeads(result.InvestmentLead || []);
      setTotalCount(result.InvestmentLeadAggregate?.aggregate?.count || 0);
    } catch (err) {
      console.error("Error loading investment leads:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, fetchInvestmentLeads, queryVariables]);

  // Load data on mount and when variables change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for process events and refresh data when investment lead processes complete
  useEffect(() => {
    const handleProcessEvent = (event: any) => {
      try {
        console.log(
          "✅ Investment Lead process event received:",
          event.type,
          event
        );

        // Check for successful completion from different event structures
        if (event.detail?.resolution === "success") {
          console.log("✅ Success resolution detected, refreshing data");
          loadData(); // Refresh lead list data
          if (refreshStats) {
            refreshStats(); // Also refresh statistics if available
          }
          return;
        }

        // Also check for different event structure
        const response = event.detail?.response;
        if (
          response?.detail?.resolution === "success" ||
          response?.investmentLead
        ) {
          console.log(
            "✅ Success in response or investmentLead detected, refreshing data"
          );
          loadData();
          if (refreshStats) {
            refreshStats();
          }
          return;
        }

        // For continue events, check if payload contains successful data
        if (
          event.type === "com.newwork.process.continue" &&
          event.detail?.payload
        ) {
          console.log(
            "✅ Continue event with payload detected, refreshing data"
          );
          loadData();
          if (refreshStats) {
            refreshStats();
          }
        }
      } catch (err) {
        console.error("Error handling process event:", err);
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
  }, [loadData, refreshStats]);

  // Initialize from URL parameters (search and common filters)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const initialFilters: string[] = [];

    const pushAll = (key: string, prefix: string) => {
      urlParams.getAll(key).forEach((v) => {
        if (v) initialFilters.push(`${prefix}:${v}`);
      });
    };

    // Basic filters (IDs)
    pushAll("leadStatus", "status");
    pushAll("leadRating", "rating");
    pushAll("leadSource", "source");
    pushAll("owner", "owner");
    pushAll("country", "country");
    // Value-based filters
    pushAll("region", "region");
    pushAll("city", "city");
    // Company and contact
    pushAll("company", "company");
    pushAll("contact", "contact"); // expects First|Last

    if (initialFilters.length) {
      setSelectedFilters((prev) => (prev.length ? prev : initialFilters));
    }

    const search = urlParams.get("search");
    if (search) setSearchTerm(search);
  }, []);

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
      if (sortField === field) {
        setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC");
      } else {
        setSortField(field);
        setSortOrder("ASC");
      }
    },
    [sortField, sortOrder]
  );

  const handleSetFilter = useCallback((filters: string[]) => {
    setSelectedFilters(filters);
    setCurrentPage(1);
  }, []);

  // const toggleDataFilter = useCallback(() => {
  //   setShowDataFilter(prev => !prev);
  // }, []);

  // No full-screen spinner to avoid big refresh on search clear

  // Error state
  if (error) {
    return (
      <Alert variant="destructive" className="gba:mb-4">
        <div className="gba:flex gba:items-center gba:justify-between">
          <span>Error loading leads: {error}</span>
          <Button variant="outline" size="sm" onClick={loadData}>
            Retry
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <div data-testid="investment-leads-view">
      {/* Header */}
      <div className="gba:mb-6">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
          <div>
            <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">
              Investment Leads
            </h1>
            <p className="gba:text-gray-600">
              Manage investment lead generation and qualification
            </p>
          </div>
        </div>

        {/* Statistics Cards (server-based, separate fetch) */}
        <LeadStatistics {...context} onRefreshReady={setRefreshStats} />
      </div>

      {/* Data Container with Lead List */}
      <DataContainer
        dataControllerProps={{
          search: searchTerm,
          setSearch: handleSearch,
          debounceDelay: 500,
          filter: selectedFilters,
          setFilter: handleSetFilter,
          filterLabelMap,
          listTitle: "Leads",
          listAmount: totalCount,
          actions: (
            <AppAction
              contextsArray={[FlowContextName.createInvestmentLead]}
              accessToken={accessToken}
              data-testid="add-lead-action"
              emptyStateBehavior="hide"
            >
              <button
                className="gba:flex gba:flex-row gba:justify-center gba:items-center gba:px-3 gba:py-0 gba:h-8 gba:rounded gba:gap-1"
                data-testid="add-lead-action"
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
          <LeadList
            leads={leads}
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

export default LeadView;
