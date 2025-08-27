import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Spinner,
  Alert,
  Button,
} from "@newwork/nw-design-system";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGetInvestmentOpportunities } from "@/common/data/investment/hooks/useInvestmentOpportunities";
import type { InvestmentOpportunity } from "@/common/data/investment/types";
import type { InvestmentOpportunityQueryVariables } from "@/common/data/investment/queries/investmentOpportunityQueries";
import { DataContainer } from "@/components/layout/dataContainer/DataContainer";
import { OpportunityStatistics } from "./components/OpportunityStatistics";
import { OpportunityList } from "./components/OpportunityList";
import { OpportunityBoard } from "./components/opportunity-board/OpportunityBoard";
import { AppAction } from "@/components/app-action/AppAction";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { PlusSquareIcon } from "@phosphor-icons/react";
import { useInvestmentOpportunityFilters } from "./hooks/useInvestmentOpportunityFilters";

export interface OpportunityViewProps extends BusinessAppContextProps {}

export const OpportunityView: React.FC<OpportunityViewProps> = (context) => {
  const { accessToken } = context;

  // State management
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  // const [showDataFilter, setShowDataFilter] = useState(false);
  const [activeTab, setActiveTab] = useState("list");

  // Board view filters have been moved to the OpportunityBoard component
  // List view only needs basic filtering

  // Hooks for data fetching
  const { fetchInvestmentOpportunities } =
    useGetInvestmentOpportunities(context);
  // Board view loads its own stages based on selected pipeline

  // Data state
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>(
    []
  );
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    filterGroups,
    filterLabelMap,
    handleFilterChange,
    closeAfter,
    closeBefore,
  } = useInvestmentOpportunityFilters(
    context,
    selectedFilters,
    setSelectedFilters
  );

  // Build query variables
  const queryVariables: InvestmentOpportunityQueryVariables = useMemo(() => {
    const variables: InvestmentOpportunityQueryVariables = {
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      search: searchTerm.trim() || undefined,
      orderBy: [{ field: sortField, direction: sortOrder }],
      ...(closeAfter ? { closeDateFrom: closeAfter } : {}),
      ...(closeBefore ? { closeDateTo: closeBefore } : {}),
    };

    // Map selected filters
    const ownerIds: string[] = [];
    const stageIds: string[] = [];
    const pipelineIds: string[] = [];
    const accountIds: string[] = [];
    const statusIds: string[] = [];
    const amountRanges: Array<{ min?: number; max?: number }> = [];
    const chanceRanges: Array<{ min?: number; max?: number }> = [];

    selectedFilters.forEach((f) => {
      if (f.startsWith("owner:")) ownerIds.push(f.slice(6));
      else if (f.startsWith("stage:")) stageIds.push(f.slice(6));
      else if (f.startsWith("pipeline:")) pipelineIds.push(f.slice(9));
      else if (f.startsWith("account:")) accountIds.push(f.slice(8));
      else if (f.startsWith("status:")) statusIds.push(f.slice(7));
      else if (f === "amount-large") amountRanges.push({ min: 100000 });
      else if (f === "amount-medium")
        amountRanges.push({ min: 50000, max: 100000 });
      else if (f === "amount-small")
        amountRanges.push({ min: 10000, max: 50000 });
      else if (f === "amount-micro") amountRanges.push({ max: 10000 });
      else if (f === "chance-high") chanceRanges.push({ min: 75, max: 100 });
      else if (f === "chance-medium") chanceRanges.push({ min: 50, max: 74 });
      else if (f === "chance-low") chanceRanges.push({ min: 25, max: 49 });
      else if (f === "chance-very-low") chanceRanges.push({ min: 0, max: 24 });
    });

    if (ownerIds.length) variables.ownerEmployeeIds = ownerIds;
    if (stageIds.length) variables.stageIds = stageIds;
    if (pipelineIds.length) variables.pipelineIds = pipelineIds;
    if (accountIds.length) variables.accountIds = accountIds;
    if (statusIds.length) variables.statusIds = statusIds;
    if (amountRanges.length) {
      const min = Math.min(...amountRanges.map((r) => r.min ?? 0));
      const max = Math.max(
        ...amountRanges.map((r) => r.max ?? Number.MAX_SAFE_INTEGER)
      );
      variables.forecastedProfitBetween = [min, max];
    }
    // Note: winningChance filtering not supported in current schema

    // Board view handles its own filtering - list view only uses DataContainer filters

    return variables;
  }, [
    currentPage,
    pageSize,
    searchTerm,
    sortField,
    sortOrder,
    selectedFilters,
    closeAfter,
    closeBefore,
  ]);

  // Load data
  const loadData = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await fetchInvestmentOpportunities(queryVariables);
      setOpportunities(result.InvestmentOpportunity || []);
      setTotalCount(
        result.InvestmentOpportunityAggregate?.aggregate?.count || 0
      );
    } catch (err) {
      console.error("Error loading investment opportunities:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, fetchInvestmentOpportunities, queryVariables]);

  // Load data on mount and when variables change
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Listen for process events and refresh data when investment opportunity processes complete
  useEffect(() => {
    const handleProcessEvent = (event: any) => {
      try {
        console.log(
          "✅ Investment Opportunity process event received:",
          event.type,
          event
        );

        // Check for successful completion from different event structures (MATCHING ACCOUNT VIEW PATTERN)
        if (event.detail?.resolution === "success") {
          console.log(
            "✅ Success resolution detected, refreshing opportunity data"
          );
          loadData(); // Refresh opportunity list data
          return;
        }

        // Also check for different event structure
        const response = event.detail?.response;
        if (
          response?.detail?.resolution === "success" ||
          response?.investmentOpportunity
        ) {
          console.log(
            "✅ Success in response or investmentOpportunity detected, refreshing data"
          );
          loadData();
          return;
        }

        // For continue events, check if payload contains successful data
        if (
          event.type === "com.newwork.process.continue" &&
          event.detail?.payload
        ) {
          console.log(
            "✅ Continue event with payload detected, refreshing opportunity data"
          );
          loadData();
        }
      } catch (err) {
        console.error("Error handling process event:", err);
      }
    };

    // Listen to multiple possible event names (following Investment Account pattern exactly)
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

    // Add event listeners
    eventNames.forEach((eventName) => {
      window.addEventListener(eventName, handleProcessEvent);
      document.addEventListener(eventName, handleProcessEvent);
    });

    // Cleanup event listeners
    return () => {
      eventNames.forEach((eventName) => {
        window.removeEventListener(eventName, handleProcessEvent);
        document.removeEventListener(eventName, handleProcessEvent);
      });
    };
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

  // Board view handles its own filtering - handlers removed

  // Loading state
  if (isLoading && opportunities.length === 0) {
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
          <span>Error loading opportunities: {error}</span>
          <Button variant="outline" size="sm" onClick={loadData}>
            Retry
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <div data-testid="investment-opportunities-view">
      {/* Header */}
      <div className="gba:mb-6">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
          <div>
            <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">
              Investment Opportunities
            </h1>
            <p className="gba:text-gray-600">
              Manage investment opportunities and pipeline stages
            </p>
          </div>
        </div>

        {/* Statistics Cards (server-based, separate fetch) */}
        <OpportunityStatistics {...context} />
      </div>

      {/* Filters moved to Board View tab */}

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="gba:w-full"
      >
        <TabsList className="gba:grid gba:w-full gba:grid-cols-2">
          <TabsTrigger value="list">List View</TabsTrigger>
          <TabsTrigger value="board">Board View</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="gba:mt-6">
          {/* Data Container with Opportunity List */}
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
                    <span>Opportunities</span>
                    <span className="gba:text-gray-500">({totalCount})</span>
                  </div>
                </div>
              ),
              actions: (
                <AppAction
                  contextsArray={[FlowContextName.createInvestmentOpportunity]}
                  accessToken={accessToken}
                  data-testid="add-opportunity-action"
                  emptyStateBehavior="hide"
                >
                  <button
                    className="gba:flex gba:flex-row gba:justify-center gba:items-center gba:px-3 gba:py-0 gba:h-8 gba:rounded gba:gap-1"
                    data-testid="add-opportunity-action"
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
              <OpportunityList
                opportunities={opportunities}
                isLoading={isLoading}
                totalCount={totalCount}
                currentPage={currentPage}
                pageSize={pageSize}
                onPageChange={handlePageChange}
                onSort={handleSort}
                sortField={sortField}
                sortOrder={sortOrder}
                {...context}
              />
            }
          />
        </TabsContent>

        <TabsContent value="board" className="gba:mt-6">
          <OpportunityBoard
            {...context}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default OpportunityView;
