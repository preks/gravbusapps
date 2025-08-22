import React, {
  useState,
  useCallback,
  useRef,
  useEffect,
  useMemo,
} from "react";
import { DataContainer } from "@/components/layout/dataContainer";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useOpportunityListData } from "./hooks/useOpportunityListData";
import { useOpportunityStatisticsWithTrend } from "./hooks/useOpportunityStatisticsWithTrend";
import { useOpportunityFilters } from "./hooks/useOpportunityFilters";
import { OpportunityStatisticsWithTrend } from "./components/OpportunityStatistics";
import OpportunityTable from "./components/OpportunityTable";
import { Opportunity } from "./types";
import {
  ColumnVisibilityDropdown,
  ColumnConfig,
} from "./components/ColumnVisibilityDropdown";
import { Alert, Button } from "antd";
import { PlusOutlined, DollarCircleOutlined } from "@ant-design/icons";
import { startProcess } from "@/common/utils/start-process";
import { useProcessCompletion } from "@/common/hooks/useProcessCompletion";

interface OpportunityListProps extends BusinessAppContextProps {
  sourceApp?: string;
}

const OpportunityList: React.FC<OpportunityListProps> = (context) => {
  const { sourceApp } = context;

  // State management
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<
    string | undefined
  >(undefined);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState("");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const initialLoadDone = useRef(false);

  // Define available columns with default visibility
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(() => [
    { id: "actions", label: "Actions", visible: true, disabled: true }, // Always visible
    { id: "opportunity", label: "Opportunity", visible: true },
    { id: "value", label: "Value", visible: true },
    { id: "winRate", label: "Win Rate", visible: true },
    { id: "stage", label: "Stage", visible: true },
    { id: "pipeline", label: "Pipeline", visible: true },
    { id: "closeDate", label: "Close Date", visible: true },
    { id: "owner", label: "Owner", visible: true },
    { id: "account", label: "Account", visible: true },
    { id: "status", label: "Status", visible: true },
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

  // Filters
  const opportunityFilters = useOpportunityFilters(context);
  const appliedFilters = opportunityFilters.getFilters();
  const { filtersInitialized } = opportunityFilters;

  // Filter groups based on visible columns
  const visibleFilterGroups = useMemo(() => {
    const columnToFilterMap: Record<string, string> = {
      stage: "stage",
      winRate: "winningChance",
      value: "estimatedAmount",
      account: "accounts",
      status: "statuses",
      // Note: opportunity, closeDate, owner, pipeline don't have corresponding filters yet
    };

    return opportunityFilters.filterGroups.filter((group) => {
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
  }, [opportunityFilters.filterGroups, visibleColumns]);

  // Data hooks with all filter parameters
  const opportunityListData = useOpportunityListData({
    search: appliedFilters.search,
    sortField,
    sortOrder,
    context: context,
    sourceApp,
    stages: appliedFilters.stages,
    winningChanceRanges: appliedFilters.winningChanceRanges,
    amountRanges: appliedFilters.amountRanges,
    statuses: appliedFilters.statuses,
    createdAfter: appliedFilters.createdAfter,
    createdBefore: appliedFilters.createdBefore,
    owners: appliedFilters.owners,
    pipelines: appliedFilters.pipelines,
  });

  const opportunityStatistics = useOpportunityStatisticsWithTrend({
    ...context,
    sourceApp,
  });

  // Listen for process completion events and refresh data when opportunity processes complete
  useProcessCompletion({
    onSuccess: () => {
      console.log(
        "Process completed successfully, refreshing opportunity data"
      );
      opportunityListData.retry();
      opportunityStatistics.refetch(); // Also refresh statistics
    },
    onFailure: () => {
      console.log("Process failed, no data refresh needed");
    },
  });

  // Initial load effect
  useEffect(() => {
    if (!initialLoadDone.current && context.accessToken && filtersInitialized) {
      initialLoadDone.current = true;
      // Pass current sorting state to initial load
      opportunityListData.loadPage(
        1,
        pageSize,
        appliedFilters,
        sortField,
        sortOrder
      );
      opportunityStatistics.refetch();
    }
  }, [context.accessToken, pageSize, filtersInitialized, sortField, sortOrder]); // Added sortField, sortOrder

  // Effect to reload data when filters change
  useEffect(() => {
    if (initialLoadDone.current && filtersInitialized) {
      setCurrentPage(1); // Reset to first page when filters change
      // Pass current sorting state when filters change
      opportunityListData.loadPage(
        1,
        pageSize,
        appliedFilters,
        sortField,
        sortOrder,
        false
      ); // Don't show loading for filtering
    }
  }, [
    appliedFilters.search,
    JSON.stringify(appliedFilters.stages), // Use JSON.stringify for array
    JSON.stringify(appliedFilters.winningChanceRanges), // Use JSON.stringify for array
    JSON.stringify(appliedFilters.amountRanges), // Use JSON.stringify for array
    JSON.stringify(appliedFilters.statuses), // Use JSON.stringify for array
    JSON.stringify(appliedFilters.owners), // Use JSON.stringify for array
    JSON.stringify(appliedFilters.pipelines), // Use JSON.stringify for array
    appliedFilters.createdAfter,
    appliedFilters.createdBefore,
    pageSize,
    sortField,
    sortOrder,
    filtersInitialized,
  ]); // Removed opportunityListData from dependencies

  // Effect to reload data when sort changes
  useEffect(() => {
    if (initialLoadDone.current && filtersInitialized) {
      opportunityListData.loadPage(
        currentPage,
        pageSize,
        appliedFilters,
        sortField,
        sortOrder,
        false
      ); // Don't show loading for sorting
    }
  }, [sortField, sortOrder, currentPage, pageSize, filtersInitialized]); // Removed opportunityListData from dependencies

  // Handlers
  const handleOpportunityClick = useCallback((opportunity: Opportunity) => {
    setSelectedOpportunityId(opportunity.id);
    // TODO: Open opportunity detail side panel
  }, []);

  const handleSort = useCallback(
    (field: string, order: "ASC" | "DESC" | "") => {
      // When order is empty, clear sorting completely
      if (order === "") {
        setSortField("");
        setSortOrder("DESC"); // Keep DESC as default for state type, but field will be empty
        setCurrentPage(1);
        // Pass empty field to loadPage immediately
        opportunityListData.loadPage(
          1,
          pageSize,
          appliedFilters,
          "",
          "DESC",
          false
        ); // Don't show loading for sorting
      } else {
        setSortField(field);
        setSortOrder(order);
        setCurrentPage(1);
        // Pass new sorting values to loadPage immediately
        opportunityListData.loadPage(
          1,
          pageSize,
          appliedFilters,
          field,
          order,
          false
        ); // Don't show loading for sorting
      }
    },
    [opportunityListData, pageSize]
  );

  const handlePageChange = useCallback(
    (page: number, size?: number) => {
      const newSize = size || pageSize;
      setCurrentPage(page);
      setPageSize(newSize);
      // Pass current sorting state when changing pages
      opportunityListData.loadPage(
        page,
        newSize,
        appliedFilters,
        sortField,
        sortOrder
      );
    },
    [pageSize, sortField, sortOrder, appliedFilters]
  ); // Added sortField, sortOrder, appliedFilters dependencies

  const handleSearch = useCallback(
    (searchTerm: string) => {
      opportunityFilters.setSearch(searchTerm);
      setCurrentPage(1);
      // Data will reload automatically via useEffect
    },
    [opportunityFilters]
  );

  const handleAddOpportunity = useCallback(() => {
    startProcess({
      domain: "customer-relations",
      processName: "saveOpportunity",
      builderType: "NATIVE_SCREEN",
      payload: {},
    });
  }, []);

  const handleRetryStatistics = useCallback(() => {
    opportunityStatistics.refetch();
  }, [opportunityStatistics]);

  const handleRetryData = useCallback(() => {
    opportunityListData.loadPage(
      currentPage,
      pageSize,
      appliedFilters,
      sortField,
      sortOrder
    );
  }, [currentPage, pageSize, appliedFilters, sortField, sortOrder]); // Removed opportunityListData from dependencies

  // If there's an error loading opportunities, show error state
  if (opportunityListData.error) {
    return (
      <div data-testid="opportunity-list-error">
        <Alert
          message="Error Loading Opportunities"
          description={
            opportunityListData.error instanceof Error
              ? opportunityListData.error.message
              : String(opportunityListData.error)
          }
          type="error"
          showIcon
          data-testid="opportunity-list-error-alert"
          action={
            <Button size="small" onClick={handleRetryData}>
              Retry
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div data-testid="opportunity-list-content">
      <div data-testid="opportunity-statistics-section" className="gba:mb-6">
        {opportunityStatistics.trendData ? (
          <OpportunityStatisticsWithTrend
            trendData={opportunityStatistics.trendData}
            isLoading={opportunityStatistics.isLoading}
            error={opportunityStatistics.error}
            onRetry={handleRetryStatistics}
          />
        ) : (
          <div>Loading statistics...</div>
        )}
      </div>

      <DataContainer
        dataControllerProps={{
          search: opportunityFilters.search,
          setSearch: handleSearch,
          debounceDelay: 500,
          filter: opportunityFilters.selectedFilters,
          setFilter: (filters: string[]) => {
            // This is called by DataController's "Clear all filters" button or individual filter removal
            if (filters.length === 0) {
              // Clear all filters
              opportunityFilters.clearAllFilters();
            } else {
              // Handle individual filter removal - find which filters were removed and remove them
              const removedFilters = opportunityFilters.selectedFilters.filter(
                (f) => !filters.includes(f)
              );
              removedFilters.forEach((filterId) =>
                opportunityFilters.removeFilter(filterId)
              );
            }
          },
          filterLabelMap: opportunityFilters.filterLabelMap,
          dateRange: {
            createdAfter: opportunityFilters.createdAfter,
            createdBefore: opportunityFilters.createdBefore,
            onClear: () =>
              opportunityFilters.handleDateRangeChange(undefined, undefined),
          },
          listTitle: (
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span>Opportunities</span>
                <span className="gba:text-gray-500">
                  ({opportunityListData.total})
                </span>
              </div>
            </div>
          ),
          addButton: {
            onClick: handleAddOpportunity,
            label: "Add",
            "data-testid": "add-opportunity-button",
          },
          actions: [
            <ColumnVisibilityDropdown
              key="column-visibility"
              columns={columnConfig}
              onColumnVisibilityChange={handleColumnVisibilityChange}
              data-testid="opportunity-list-column-visibility"
            />,
          ],
        }}
        dataFilterProps={{
          filterGroups: visibleFilterGroups,
          onFilterChange: (filterId: string, selected: boolean) => {
            selected
              ? opportunityFilters.addFilter(filterId)
              : opportunityFilters.removeFilter(filterId);
          },
        }}
        dataBody={
          <div data-testid="opportunity-table-container">
            <OpportunityTable
              {...context}
              data={opportunityListData.opportunities}
              loading={opportunityListData.loading}
              error={opportunityListData.error}
              hasMore={opportunityListData.hasMore}
              loadMore={opportunityListData.loadMore}
              loadPage={opportunityListData.loadPage}
              retry={opportunityListData.retry}
              total={opportunityListData.total}
              pageSize={pageSize}
              currentPage={currentPage}
              sortField={sortField}
              sortOrder={sortOrder}
              onSelectOpportunity={handleOpportunityClick}
              onPaginationChange={handlePageChange}
              onSortingChange={handleSort}
              selectedOpportunityId={selectedOpportunityId}
              visibleColumns={visibleColumns}
            />
          </div>
        }
      />
    </div>
  );
};

export default OpportunityList;
