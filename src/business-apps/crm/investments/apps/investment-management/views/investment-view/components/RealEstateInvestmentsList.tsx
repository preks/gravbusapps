import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Spinner,
  Alert,
  Button
} from "@newwork/nw-design-system";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGetInvestments } from "@/common/data/investment/hooks/useInvestments";
import type { Investment } from "@/common/data/investment/types";
import type { InvestmentQueryVariables } from "@/common/data/investment/queries/investmentQueries";
import { DataContainer } from "@/components/layout/dataContainer/DataContainer";
import { AppAction } from "@/components/app-action/AppAction";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { Building2, Calendar, User, Target, ChevronUp, ChevronDown } from "lucide-react";
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';
import { formatCurrency, formatDate } from "@/common/data/investment";
import { ColumnConfig } from "@/components/dataController";
import { useInvestmentListController } from "../hooks/useInvestmentListController";
import { useRealEstateInvestmentsFilters } from "../hooks/useRealEstateInvestmentsFilters";


export interface RealEstateInvestmentsListProps extends BusinessAppContextProps {}

// Sortable table header component
const SortableTableHead: React.FC<{
  children: React.ReactNode;
  field: string;
  currentSortField: string;
  currentSortOrder: "ASC" | "DESC";
  onSort: (field: string, order: "ASC" | "DESC" | "") => void;
  className?: string;
}> = ({ children, field, currentSortField, currentSortOrder, onSort, className }) => {
  const isSorted = currentSortField === field;
  const nextOrder = isSorted 
    ? (currentSortOrder === "ASC" ? "DESC" : "")
    : "ASC";

  return (
    <TableHead 
      className={`gba:cursor-pointer gba:select-none ${className || ''}`}
      onClick={() => onSort(field, nextOrder)}
    >
      <div className="gba:flex gba:items-center gba:gap-1">
        {children}
        {isSorted && (
          currentSortOrder === "ASC" ? 
            <ChevronUp className="gba:w-4 gba:h-4" /> : 
            <ChevronDown className="gba:w-4 gba:h-4" />
        )}
      </div>
    </TableHead>
  );
};

const RealEstateInvestmentsList: React.FC<RealEstateInvestmentsListProps> = (context) => {
  const { accessToken } = context;

  // Use the shared controller for URL sync and state management
  const {
    search,
    currentPage,
    pageSize,
    sortField,
    sortOrder,
    setSearch,
    handleSortingChange,
  } = useInvestmentListController();

  // Use centralized filters hook
  const {
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    clearAllFilters,
    getFilters,
  } = useRealEstateInvestmentsFilters(context);

  // Define available columns based on what I see in the image
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(() => [
    { id: "actions", label: "Actions", visible: true, disabled: true },
    { id: "investment", label: "Investment", visible: true },
    { id: "type", label: "Type", visible: true },
    { id: "initialInvestment", label: "Initial Investment", visible: true },
    { id: "marketValue", label: "Market Value", visible: true },
    { id: "performance", label: "Performance", visible: true },
    { id: "acquisitionDate", label: "Acquisition Date", visible: true },
    { id: "investmentRole", label: "Investment Role", visible: true },
    { id: "owner", label: "Owner", visible: true },
    // Optional columns
    { id: "status", label: "Status", visible: false },
    { id: "created", label: "Created", visible: false },
    { id: "exitDate", label: "Exit Date", visible: false },
    { id: "locality", label: "Location", visible: false },
    { id: "buildingYear", label: "Building Year", visible: false },
    { id: "occupancyPercent", label: "Occupancy %", visible: false },
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

  // Filter groups based on visible columns - ONLY show filters for visible columns
  const visibleFilterGroups = useMemo(() => {
    // Map each visible column to its filter group for real estate - ALL 8 COLUMNS
    const columnToFilterMap: Record<string, string> = {
      // 1. Investment - searchable by name (handled by main search)
      created: 'creationDate',
      // 2. Type column → Investment Type filter
      type: "investmentType",
      // 3. Initial Investment → Amount range filter
      initialInvestment: "initialInvestmentRange", 
      // 4. Market Value → Amount range filter
      marketValue: "marketValueRange",
      // 5. Performance → Performance range filter
      performance: "performanceRange",
      // 6. Acquisition Date → Date range filter
      acquisitionDate: "acquisitionDate",
      // 7. Investment Role → Investment Role filter
      investmentRole: "investmentRole",
      // 8. Owner → Owner filter
      owner: "owner",
      // Additional columns
      status: "investmentStatus",
      locality: "location",
      buildingYear: 'buildingYearRange',
      occupancyPercent: 'occupancyRange',
      exitDate: 'exitDate',
    };

    // Only show filters for currently visible columns
    const visibleFilterIds = new Set<string>();
    
    visibleColumns.forEach(columnId => {
      const filterId = columnToFilterMap[columnId];
      if (filterId) {
        visibleFilterIds.add(filterId);
      }
    });

    // Return only filter groups that have visible columns
    return filterGroups.filter(group => visibleFilterIds.has(group.id));
  }, [filterGroups, visibleColumns]);

  const { fetchInvestments } = useGetInvestments(context);

  const [investments, setInvestments] = useState<Investment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryVariables: InvestmentQueryVariables = useMemo(() => {
    const filters = getFilters();
    const v: InvestmentQueryVariables = {
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      search: search.trim() || undefined,
      orderBy: [{ field: sortField, direction: sortOrder === "ASC" ? "ASC_NULLS_LAST" : "DESC_NULLS_LAST" }],
      ...filters
    };
    // Always filter by real estate investment types
    v.investmentGroupIds = ["InvestmentGroup:v1:REAL_ESTATE"];
    return v;
  }, [currentPage, pageSize, search, sortField, sortOrder, getFilters]);

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchInvestments(queryVariables);
      setInvestments(result.Investment || []);
      setTotalCount(result.InvestmentAggregate?.aggregate?.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, fetchInvestments, queryVariables]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter handling
  const handleFilterChange = useCallback((filterId: string, checked: boolean) => {
    if (checked) {
      addFilter(filterId);
    } else {
      removeFilter(filterId);
    }
  }, [addFilter, removeFilter]);
  // Listen for process completion events to refresh data
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        console.log('RealEstateInvestmentsList: Process completion event received:', event.type);
        
        // Check for successful completion
        if (event.detail?.resolution === 'success') {
          console.log('RealEstateInvestmentsList: Process completed successfully, refreshing real estate data');
          loadData();
          return;
        }
        
        // Check for different event structures - specifically for real estate investments
        const response = event.detail?.response;
        if (response?.detail?.resolution === 'success' || 
            response?.investment || 
            response?.realEstateInvestment) {
          console.log('RealEstateInvestmentsList: Real estate investment data detected, refreshing list');
          loadData();
          return;
        }
        
        // Check for continue events with payload (investment creation/update)
        if (event.type === 'com.newwork.process.continue' && event.detail?.payload) {
          console.log('RealEstateInvestmentsList: Continue event with payload detected, refreshing data');
          loadData();
        }
      } catch (err) {
        console.error('Error handling process completion in RealEstateInvestmentsList:', err);
      }
    };

    // Listen to multiple possible event names for investment updates
    const eventNames = [
      'com.newwork.process.taskCompletion',
      'com.newwork.process.completion',
      'com.newwork.process.continue',
      'com.newwork.process.processCompletion',
      'processCompletion',
      'taskCompletion',
      'taskCompleted',
      'processCompleted',
      'task-completion',
      'process-completion',
    ];

    eventNames.forEach((eventName) => {
      window.addEventListener(eventName, handleProcessCompletion);
    });

    return () => {
      eventNames.forEach((eventName) => {
        window.removeEventListener(eventName, handleProcessCompletion);
      });
    };
  }, [loadData]);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  const handleSetFilter = useCallback((filters: string[]) => {
    // Clear all filters first, then add new ones
    clearAllFilters();
    filters.forEach(filterId => addFilter(filterId));
  }, [addFilter, clearAllFilters]);

  const handleRowClick = useCallback((investmentId: string) => {
    const detailsUrl = buildPlatformUrl('/platform/irm/investment-record', { 
      investmentId,
      fromView: 'investments',
      fromSubView: 'real-estate'
    });
    navigateTo(detailsUrl);
  }, []);

  if (isLoading && investments.length === 0) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="gba:mb-4">
        <div className="gba:flex gba:items-center gba:justify-between">
          <span>Error loading investments: {error}</span>
          <Button variant="outline" size="sm" onClick={loadData}>
            Retry
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <DataContainer
      dataControllerProps={{
        search,
        setSearch,
        debounceDelay: 500,
        filter: selectedFilters,
        setFilter: handleSetFilter,
        filterLabelMap,
        listTitle: (
          <div className="gba:flex gba:items-center gba:gap-4">
            <div className="gba:flex gba:items-center gba:gap-2">
              <span>Real Estate Investments</span>
              <span className="gba:text-gray-500">({totalCount})</span>
            </div>
          </div>
        ),
        actions: (
          <AppAction
            contextsArray={[FlowContextName.createInvestment]}
            accessToken={accessToken}
            data-testid="real-estate-investments-add-action"
            emptyStateBehavior="hide"
          >
            <button
              className="gba:flex gba:flex-row gba:justify-center gba:items-center gba:px-3 gba:py-0 gba:h-8 gba:rounded gba:gap-1"
              data-testid="real-estate-investments-add-action"
              type="button"
            >
              <span className="gba:h-4 gba:font-normal gba:text-sm gba:leading-4 gba:flex gba:items-center gba:text-black gba:flex-none order-1 gba:grow-0">
                Add
              </span>
            </button>
          </AppAction>
        ),
        columnVisibility: {
          columns: columnConfig,
          onColumnVisibilityChange: handleColumnVisibilityChange,
          'data-testid': 'real-estate-investments-column-visibility'
        },
      }}
      dataFilterProps={{
        filterGroups: visibleFilterGroups,
        onFilterChange: handleFilterChange,
      }}
      dataBody={
        <div className="gba:bg-white gba:rounded-lg gba:border">
          <Table>
            <TableHeader>
              <TableRow>
                {visibleColumns.includes('investment') && (
                  <SortableTableHead field="name" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>
                    Investment
                  </SortableTableHead>
                )}
                {visibleColumns.includes('type') && (
                  <SortableTableHead field="investmentType.value" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>
                    Type
                  </SortableTableHead>
                )}
                {visibleColumns.includes('initialInvestment') && (
                  <SortableTableHead field="initialInvestmentAmount" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>
                    Initial Investment
                  </SortableTableHead>
                )}
                {visibleColumns.includes('marketValue') && (
                  <SortableTableHead field="investmentMarketValue" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>
                    Market Value
                  </SortableTableHead>
                )}
                {visibleColumns.includes('performance') && (
                  <SortableTableHead field="performancePercentage" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>
                    Performance
                  </SortableTableHead>
                )}
                {visibleColumns.includes('acquisitionDate') && (
                  <SortableTableHead field="acquisitionDate" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>
                    Acquisition Date
                  </SortableTableHead>
                )}
                {visibleColumns.includes('investmentRole') && (
                  <SortableTableHead field="investmentRole" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>
                    Investment Role
                  </SortableTableHead>
                )}
                {visibleColumns.includes('owner') && (
                  <SortableTableHead field="ownerEmployee.displayName" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>
                    Owner
                  </SortableTableHead>
                )}
                {visibleColumns.includes('status') && (
                  <SortableTableHead field="investmentStatus.value" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>
                    Status
                  </SortableTableHead>
                )}
                {visibleColumns.includes('created') && (
                  <SortableTableHead field="createdAt" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>
                    Created
                  </SortableTableHead>
                )}
                {visibleColumns.includes('exitDate') && (
                  <SortableTableHead field="exitDate" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>
                    Exit Date
                  </SortableTableHead>
                )}
                {visibleColumns.includes('locality') && (
                  <SortableTableHead field="locality" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>
                    Location
                  </SortableTableHead>
                )}
                {visibleColumns.includes('buildingYear') && (
                  <SortableTableHead field="buildingYear" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>
                    Building Year
                  </SortableTableHead>
                )}
                {visibleColumns.includes('occupancyPercent') && (
                  <SortableTableHead field="occupancyPercent" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>
                    Occupancy %
                  </SortableTableHead>
                )}
                {visibleColumns.includes('actions') && <TableHead className="gba:w-[60px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {investments.map((investment) => (
                <TableRow key={investment.id} className="gba:cursor-pointer" onClick={() => handleRowClick(investment.id)}>
                  {visibleColumns.includes('investment') && (
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Building2 className="gba:w-4 gba:h-4 gba:text-gray-500" />
                        <span className="gba:font-medium">{investment.name}</span>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.includes('type') && (
                    <TableCell>
                      <Badge variant="secondary">{investment.investmentType?.value || "Unknown"}</Badge>
                    </TableCell>
                  )}
                  {visibleColumns.includes('initialInvestment') && (
                    <TableCell>
                      <span>{formatCurrency(investment.initialInvestmentAmount || 0)}</span>
                    </TableCell>
                  )}
                  {visibleColumns.includes('marketValue') && (
                    <TableCell>
                      <span>{formatCurrency(investment.investmentMarketValue || 0)}</span>
                    </TableCell>
                  )}
                  {visibleColumns.includes('performance') && (
                    <TableCell>
                      {(() => {
                        const currentValue = investment.investmentMarketValue || 0;
                        const initialValue = investment.initialInvestmentAmount || 0;
                        const performanceAmount = currentValue - initialValue;
                        const performancePercentage = initialValue > 0 ? (performanceAmount / initialValue) * 100 : 0;
                      
                      return (
                        <div className="gba:flex gba:flex-col gba:items-start">
                          <span className={`gba:font-semibold ${
                            performancePercentage === 0 ? 'gba:text-gray-500' : 
                            performancePercentage > 0 ? 'gba:text-green-600' : 'gba:text-red-600'
                          }`}>
                            {formatCurrency(performanceAmount)}
                          </span>
                          <span className={`gba:text-sm ${
                            performancePercentage === 0 ? 'gba:text-gray-400' : 
                            performancePercentage > 0 ? 'gba:text-green-500' : 'gba:text-red-500'
                          }`}>
                            ({performancePercentage === 0 ? '' : performancePercentage > 0 ? '+' : ''}{performancePercentage.toFixed(2)}%)
                          </span>
                        </div>
                      );
                    })()}
                    </TableCell>
                  )}
                  {visibleColumns.includes('acquisitionDate') && (
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Calendar className="gba:w-4 gba:h-4 gba:text-blue-600" />
                        <span>
                          {investment.acquisitionDate 
                            ? formatDate(investment.acquisitionDate)
                            : "N/A"}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.includes('investmentRole') && (
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Target className="gba:w-4 gba:h-4 gba:text-purple-600" />
                        <span>
                          N/A
                        </span>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.includes('owner') && (
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <User className="gba:w-4 gba:h-4 gba:text-gray-600" />
                        <span>
                          {investment.ownerEmployee?.displayName || 
                           investment.ownerEmployee?.firstName && investment.ownerEmployee?.lastName
                             ? `${investment.ownerEmployee.firstName} ${investment.ownerEmployee.lastName}`
                             : "N/A"}
                        </span>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.includes('status') && (
                    <TableCell>
                      <Badge variant={investment.investmentStatus?.code === "ACTIVE" ? "default" : "secondary"}>
                        {investment.investmentStatus?.value || "Unknown"}
                      </Badge>
                    </TableCell>
                  )}
                  {visibleColumns.includes('created') && (
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Calendar className="gba:w-4 gba:h-4 gba:text-gray-500" />
                        <span>{formatDate(investment.createdAt)}</span>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.includes('exitDate') && (
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Calendar className="gba:w-4 gba:h-4 gba:text-gray-500" />
                        <span>{investment.exitDate ? formatDate(investment.exitDate) : "N/A"}</span>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.includes('locality') && (
                    <TableCell>
                      <span>N/A</span>
                    </TableCell>
                  )}
                  {visibleColumns.includes('buildingYear') && (
                    <TableCell>
                      <span>N/A</span>
                    </TableCell>
                  )}
                  {visibleColumns.includes('occupancyPercent') && (
                    <TableCell>
                      <span>N/A</span>
                    </TableCell>
                  )}
                  {visibleColumns.includes('actions') && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="gba:flex gba:justify-start gba:gap-2">
                        <AppActionButton
                          data-testid={`real-estate-investment-update-button-${investment.id}`}
                          size="icon"
                          contextsArray={[FlowContextName.realEstateInvestmentEntity]}
                          externalContextData={{ investmentId: investment.id }}
                          prefixDataTestId={`real-estate-investment-update`}
                          accessToken={accessToken}
                          emptyStateBehavior="enable"
                          deferMainContextRequestsUntilClick
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      }
    />
  );
};

export default RealEstateInvestmentsList;


