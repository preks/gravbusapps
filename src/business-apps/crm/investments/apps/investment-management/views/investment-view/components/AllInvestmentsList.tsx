import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
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
import { PlusOutlined } from "@ant-design/icons";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGetInvestments } from "@/common/data/investment/hooks/useInvestments";
import type { Investment } from "@/common/data/investment/types";
import type { InvestmentQueryVariables } from "@/common/data/investment/queries/investmentQueries";
import { DataContainer } from "@/components/layout/dataContainer/DataContainer";
import { AppAction } from "@/components/app-action/AppAction";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { Building2, Calendar, User, ChevronUp, ChevronDown } from "lucide-react";
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';
import { formatDate } from "@/common/data/investment";
import { formatCurrencyParts } from '@/common/utils/numberFormatter';
import { ColumnConfig } from "@/components/dataController";
import { useInvestmentListController } from "../hooks/useInvestmentListController";
import { useAllInvestmentsFilters } from "../hooks/useAllInvestmentsFilters";


// Helper function to format group names for display
const formatGroupName = (groupName: string): string => {
  // Handle specific cases for better display
  if (groupName === 'RealEstate') {
    return 'Real Estate';
  }
  if (groupName === 'LiquidFund' || groupName === 'LiquidFunds') {
    return 'Liquid Fund';
  }
  
  // For other cases, add spaces before capital letters (camelCase to Title Case)
  return groupName.replace(/([A-Z])/g, ' $1').trim();
};

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

export interface AllInvestmentsListProps extends BusinessAppContextProps {}

const AllInvestmentsList: React.FC<AllInvestmentsListProps> = (context) => {
  const { accessToken } = context;

  // Use the investment list controller hook
  const {
    search,
    setSearch,
    currentPage,
    pageSize,
    sortField,
    sortOrder,
    initialLoadDone,
    handlePaginationChange,
    handleSortingChange,
    updateURLParams,
  } = useInvestmentListController();

  // Use the filters hook
  const {
    selectedFilters,
    filterGroups,
    filterLabelMap,
    addFilter,
    removeFilter,
    clearAllFilters,
    getFilters,
    filtersInitialized,
    createdAfter,
    createdBefore,
    setCreatedAfter,
    setCreatedBefore,
  } = useAllInvestmentsFilters(context);

  const { fetchInvestments } = useGetInvestments(context);

  const [investments, setInvestments] = useState<Investment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Column configuration for visibility
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>([
    { id: "actions", label: "Actions", visible: true, disabled: true },
    { id: "investment", label: "Investment", visible: true },
    { id: "group", label: "Group", visible: true },
    { id: "type", label: "Type", visible: true },
    { id: "initialInvestment", label: "Initial Investment", visible: true },
    { id: "marketValue", label: "Market Value", visible: true },
    { id: "performance", label: "Performance", visible: true },
    { id: "owner", label: "Owner", visible: true },
    { id: "status", label: "Status", visible: true },
    { id: "created", label: "Created", visible: true },
  ]);
  // Currency helpers to match IRM Opportunity list (number-only + narrow symbol)
  const renderAmount = (amount: number | undefined, currencyCode?: string) => {
    if (typeof amount !== 'number') return <span className="gba:text-gray-400">-</span>;
    const { number, symbol } = formatCurrencyParts(amount, { currency: currencyCode, minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return (
      <div className="gba:w-full gba:flex gba:justify-end gba:items-baseline">
        <span className="gba:text-sm gba:[font-variant-numeric:tabular-nums]">{number}</span>
        <span className="gba:text-xs gba:text-gray-400 gba:inline-block gba:text-right gba:shrink-0 gba:w-[5ch]">{symbol}</span>
      </div>
    );
  };

  // Calculate visible columns from column configuration
  const visibleColumns = useMemo(() => {
    return columnConfig.filter(col => col.visible).map(col => col.id);
  }, [columnConfig]);

  const handleColumnVisibilityChange = useCallback((columnId: string, visible: boolean) => {
    setColumnConfig(prev => 
      prev.map(col => col.id === columnId ? { ...col, visible } : col)
    );
  }, []);

  // Visible filter groups (implementing the pattern from other lists)
  const visibleFilterGroups = useMemo(() => {
    const result = filterGroups.filter(group => {
      // Show groups that have filters or custom components
      return group.filters.length > 0 || group.customComponent;
    });

    // Debug filter groups
    const groupStats = {
      totalGroups: filterGroups.length,
      visibleGroups: result.length,
      visibleFilterGroups: result.map(g => ({ id: g.id, title: g.title, filterCount: g.filters.length }))
    };

    return result;
  }, [filterGroups]);

  const queryVariables: InvestmentQueryVariables = useMemo(() => ({
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
    search: search.trim() || undefined,
    orderBy: sortField ? [{ field: sortField, direction: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST' }] : [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }],
    ...getFilters(),
  }), [currentPage, pageSize, search, sortField, sortOrder, getFilters]);

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

  // Trigger initial data loading when component mounts and filters are initialized
  useEffect(() => {
    if (!initialLoadDone.current && accessToken && filtersInitialized) {
      initialLoadDone.current = true;
      loadData();
    }
  }, [accessToken, filtersInitialized, loadData]);

  // Trigger search when search term changes
  useEffect(() => {
    if (initialLoadDone.current && filtersInitialized) {
      updateURLParams({ search, page: 1 });
      loadData();
    }
  }, [search, filtersInitialized, loadData, updateURLParams]);

  // Trigger reload when filters change
  useEffect(() => {
    if (initialLoadDone.current && filtersInitialized) {
      loadData();
    }
  }, [
    JSON.stringify(selectedFilters),
    filtersInitialized,
    loadData,
  ]);

  // Trigger reload when sorting changes
  useEffect(() => {
    if (initialLoadDone.current) {
      loadData();
    }
  }, [sortField, sortOrder, loadData]);

  // Trigger reload when pagination changes
  useEffect(() => {
    if (initialLoadDone.current) {
      loadData();
    }
  }, [currentPage, pageSize, loadData]);

  // Listen for process completion events to refresh data
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        
        // Check for successful completion
        if (event.detail?.resolution === 'success') {
          loadData();
          return;
        }
        
        // Check for different event structures
        const response = event.detail?.response;
        if (response?.detail?.resolution === 'success' || response?.investment) {
          loadData();
          return;
        }
        
        // Check for continue events with payload (investment creation/update)
        if (event.type === 'com.newwork.process.continue' && event.detail?.payload) {
          loadData();
        }
      } catch (err) {
        // Error handling process completion
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

  const handleRowClick = useCallback((investmentId: string) => {
    const detailsUrl = buildPlatformUrl('/platform/irm/investment-record', { 
      investmentId,
      fromView: 'investments',
      fromSubView: 'overview'
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
        dateRange: {
          createdAfter,
          createdBefore,
          onClear: () => { setCreatedAfter(undefined); setCreatedBefore(undefined); }
        },
        listTitle: (
          <div className="gba:flex gba:items-center gba:gap-4">
            <div className="gba:flex gba:items-center gba:gap-2">
              <span>All Investments</span>
              <span className="gba:text-gray-500">({totalCount})</span>
            </div>
          </div>
        ),
        actions: (
          <AppAction
            contextsArray={[FlowContextName.createInvestment]}
            accessToken={accessToken}
            data-testid="all-investments-add-action"
            emptyStateBehavior="hide"
          >
            <Button
              variant="default"
              size="sm"
              className="gba:flex gba:items-center gba:gap-2"
              data-testid="all-investments-add-button"
            >
              <PlusOutlined />
              Add Investment
            </Button>
          </AppAction>
        ),
        columnVisibility: {
          columns: columnConfig,
          onColumnVisibilityChange: handleColumnVisibilityChange,
          'data-testid': 'all-investments-column-visibility'
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
                <SortableTableHead field="name" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>Investment</SortableTableHead>
                <TableHead>Group</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Initial Investment</TableHead>
                <TableHead>Market Value</TableHead>
                <TableHead>Performance</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Status</TableHead>
                <SortableTableHead field="createdAt" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>Created</SortableTableHead>
                <TableHead className="gba:w-[60px]">Actions</TableHead>
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
                  {visibleColumns.includes('group') && (
                    <TableCell>
                      <Badge variant="outline">{formatGroupName(investment.investmentGroup?.value || "Unknown")}</Badge>
                    </TableCell>
                  )}
                  {visibleColumns.includes('type') && (
                    <TableCell>
                      <Badge variant="secondary">{investment.investmentType?.value || "Unknown"}</Badge>
                    </TableCell>
                  )}
                  {visibleColumns.includes('initialInvestment') && (
                    <TableCell className="gba:text-right">
                      {renderAmount(investment.initialInvestmentAmount, investment.currency?.code)}
                    </TableCell>
                  )}
                  {visibleColumns.includes('marketValue') && (
                    <TableCell className="gba:text-right">
                      {renderAmount(investment.investmentMarketValue, investment.currency?.code)}
                    </TableCell>
                  )}
                  {visibleColumns.includes('performance') && (
                    <TableCell className="gba:text-right">
                      {(() => {
                        const currentValue = investment.investmentMarketValue || 0;
                        const initialValue = investment.initialInvestmentAmount || 0;
                        const performanceAmount = currentValue - initialValue;
                        const performancePercentage = initialValue > 0 ? (performanceAmount / initialValue) * 100 : 0;
                        const isZero = performancePercentage === 0;
                        const isPositive = performancePercentage > 0;

                        return (
                          <div className="gba:flex gba:flex-col gba:items-end">
                            <div className="gba:w-full gba:flex gba:justify-end gba:items-baseline">
                              <span className={`gba:text-sm gba:[font-variant-numeric:tabular-nums] ${
                                isZero ? 'gba:text-gray-500' : isPositive ? 'gba:text-green-600' : 'gba:text-red-600'
                              }`}>
                                {formatCurrencyParts(Math.abs(performanceAmount), { currency: investment.currency?.code, minimumFractionDigits: 0, maximumFractionDigits: 2 }).number}
                              </span>
                              <span className={`gba:text-xs gba:inline-block gba:text-right gba:shrink-0 gba:w-[5ch] ${
                                isZero ? 'gba:text-gray-400' : isPositive ? 'gba:text-green-500' : 'gba:text-red-500'
                              }`}>
                                {formatCurrencyParts(Math.abs(performanceAmount), { currency: investment.currency?.code, minimumFractionDigits: 0, maximumFractionDigits: 2 }).symbol}
                              </span>
                            </div>
                            <span className={`${
                              isZero ? 'gba:text-gray-400' : isPositive ? 'gba:text-green-500' : 'gba:text-red-500'
                            } gba:text-sm`}>
                              ({isZero ? '' : isPositive ? '+' : '-'}{Math.abs(performancePercentage).toFixed(2)}%)
                            </span>
                          </div>
                        );
                      })()}
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
                  {visibleColumns.includes('acquisitionDate') && (
                    <TableCell>
                      <span className="gba:text-sm gba:text-gray-600">
                        {investment.acquisitionDate ? formatDate(investment.acquisitionDate) : '-'}
                      </span>
                    </TableCell>
                  )}
                  {visibleColumns.includes('exitDate') && (
                    <TableCell>
                      <span className="gba:text-sm gba:text-gray-600">
                        {investment.exitDate ? formatDate(investment.exitDate) : '-'}
                      </span>
                    </TableCell>
                  )}
                  {visibleColumns.includes('isin') && (
                    <TableCell>
                      <span className="gba:text-sm gba:font-mono">
                        {investment.isin || '-'}
                      </span>
                    </TableCell>
                  )}
                  {visibleColumns.includes('currency') && (
                    <TableCell>
                      <Badge variant="outline">
                        {investment.currency?.value || 'EUR'}
                      </Badge>
                    </TableCell>
                  )}
                  {visibleColumns.includes('fundManager') && (
                    <TableCell>
                      <span className="gba:text-sm">
                        {investment.fundManagerName || '-'}
                      </span>
                    </TableCell>
                  )}
                  {visibleColumns.includes('phase') && (
                    <TableCell>
                      <Badge variant="outline">
                        {investment.investmentPhase?.value || 'Unknown'}
                      </Badge>
                    </TableCell>
                  )}
                  {visibleColumns.includes('riskLevel') && (
                    <TableCell>
                      <Badge variant={
                        investment.investmentRiskLevel?.code === 'LOW' ? 'default' :
                        investment.investmentRiskLevel?.code === 'MEDIUM' ? 'secondary' :
                        investment.investmentRiskLevel?.code === 'HIGH' ? 'destructive' :
                        'outline'
                      }>
                        {investment.investmentRiskLevel?.value || 'Unknown'}
                      </Badge>
                    </TableCell>
                  )}
                  {visibleColumns.includes('stakePercentage') && (
                    <TableCell>
                      <span className="gba:text-sm">
                        {investment.stakePercentage ? `${investment.stakePercentage}%` : '-'}
                      </span>
                    </TableCell>
                  )}
                  {visibleColumns.includes('totalInvestment') && (
                    <TableCell className="gba:text-right">
                      {renderAmount(investment.totalInvestmentAmount, investment.currency?.code)}
                    </TableCell>
                  )}
                  {visibleColumns.includes('debtFinancing') && (
                    <TableCell className="gba:text-right">
                      {renderAmount(investment.debtFinancingAmount, investment.currency?.code)}
                    </TableCell>
                  )}
                  {visibleColumns.includes('forecastedProfit') && (
                    <TableCell className="gba:text-right">
                      {renderAmount(investment.forecastedProfitAmount, investment.currency?.code)}
                    </TableCell>
                  )}
                  {visibleColumns.includes('plannedExitDate') && (
                    <TableCell>
                      <span className="gba:text-sm gba:text-gray-600">
                        {investment.plannedExitDate ? formatDate(investment.plannedExitDate) : '-'}
                      </span>
                    </TableCell>
                  )}
                  {visibleColumns.includes('actions') && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="gba:flex gba:justify-start gba:gap-2">
                        <AppActionButton
                          data-testid={`all-investment-update-button-${investment.id}`}
                          size="icon"
                          contextsArray={[FlowContextName.investmentEntity]}
                          externalContextData={{ investmentId: investment.id }}
                          prefixDataTestId={`all-investment-update`}
                          accessToken={accessToken}
                          emptyStateBehavior="enable"
                          deferMainContextRequestsUntilClick={true}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
          
          {/* Pagination */}
          <div
            className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-4 gba:border-t"
            data-testid="all-investments-pagination"
          >
            <div
              className="gba:text-sm gba:text-muted-foreground"
              data-testid="all-investments-pagination-info"
            >
              {`${(currentPage - 1) * pageSize + 1}-${Math.min(
                currentPage * pageSize,
                totalCount
              )} of ${totalCount} investments`}
            </div>
            <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
              <div className="gba:flex gba:items-center gba:space-x-2">
                <p className="gba:text-sm gba:font-medium">Rows per page</p>
                <select
                  value={pageSize}
                  onChange={(e) => handlePaginationChange(1, Number(e.target.value))}
                  className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                  data-testid="all-investments-page-size-select"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div
                className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium"
                data-testid="all-investments-page-info"
              >
                Page {currentPage} of {Math.ceil(totalCount / pageSize)}
              </div>
              <div className="gba:flex gba:items-center gba:space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePaginationChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  data-testid="all-investments-prev-page"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePaginationChange(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                  data-testid="all-investments-next-page"
                >
                  Next
                </Button>
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
};

export default AllInvestmentsList;


