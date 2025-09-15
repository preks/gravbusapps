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
import { formatCurrency, formatDate } from "@/common/data/investment";
import type { Investment } from "@/common/data/investment/types/investmentTypes";
import type { InvestmentQueryVariables } from "@/common/data/investment/queries/investmentQueries";
import { DataContainer } from "@/components/layout/dataContainer/DataContainer";
import { AppAction } from "@/components/app-action/AppAction";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { Building2, Calendar, User, ChevronUp, ChevronDown } from "lucide-react";
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';
import { ColumnConfig } from "@/components/dataController";
import { useInvestmentListController } from "../hooks/useInvestmentListController";
import { useLiquidFundInvestmentsFilters } from "../hooks/useLiquidFundInvestmentsFilters";


export interface LiquidFundInvestmentsListProps extends BusinessAppContextProps {}

const LiquidFundInvestmentsList: React.FC<LiquidFundInvestmentsListProps> = (context) => {
  const { accessToken } = context;

  // Use the shared controller for URL sync and state management
  const {
    search,
    currentPage,
    pageSize,
    sortField,
    sortOrder,
    initialLoadDone,
    setSearch,
    handleSortingChange,
    updateURLParams
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
    filtersInitialized,
  } = useLiquidFundInvestmentsFilters(context);

  // Sortable table header component (same behavior as other tabs)
  const SortableTableHead: React.FC<{
    children: React.ReactNode;
    field: string;
    currentSortField: string;
    currentSortOrder: "ASC" | "DESC";
    onSort: (field: string, order: "ASC" | "DESC" | "") => void;
    className?: string;
  }> = ({ children, field, currentSortField, currentSortOrder, onSort, className }) => {
    const isSorted = currentSortField === field;
    const nextOrder = isSorted ? (currentSortOrder === "ASC" ? "DESC" : "") : "ASC";

    return (
      <TableHead
        className={`gba:cursor-pointer gba:select-none ${className || ''}`}
        onClick={() => onSort(field, nextOrder)}
      >
        <div className="gba:flex gba:items-center gba:gap-1">
          {children}
          {isSorted && (currentSortOrder === "ASC" ? (
            <ChevronUp className="gba:w-4 gba:h-4" />
          ) : (
            <ChevronDown className="gba:w-4 gba:h-4" />
          ))}
        </div>
      </TableHead>
    );
  };

  // Define available columns with default visibility
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(() => [
    { id: "actions", label: "Actions", visible: true, disabled: true },
    { id: "investment", label: "Investment", visible: true },
    { id: "fundType", label: "Fund Type", visible: true },
    { id: "bankName", label: "Bank", visible: true },
    { id: "interestRate", label: "Interest Rate", visible: true },
    { id: "initialInvestment", label: "Initial Investment", visible: true },
    { id: "marketValue", label: "Market Value", visible: true },
    { id: "performance", label: "Performance", visible: true },
    { id: "owner", label: "Owner", visible: true },
    { id: "status", label: "Status", visible: true },
    { id: "created", label: "Created", visible: true },
    // Optional columns
    { id: "accountNumber", label: "Account Number", visible: false },
    { id: "earlyTermination", label: "Early Termination", visible: false },
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
    // Map each visible column to its filter group for liquid fund
    const columnToFilterMap: Record<string, string> = {
      fundType: "investmentType",       // Fund Type column → Investment Type filter
      status: "investmentStatus",       // Status column → Investment Status filter
      owner: "owner",                   // Owner column → Owner filter
      created: "creationDate",          // Created column → Creation Date filter
      accountNumber: "accountNumber",
      earlyTermination: "earlyTermination",
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

  // Extend Investment locally with the nested specialization we query
  type InvestmentWithLiquidFund = Investment & {
    liquidFundInvestment?: Array<{
      id: string;
      bankName?: string;
      bankAccountNumber?: string;
      interestRate?: number;
      earlyTerminationAllowed?: boolean;
    }>;
  };

  const [investments, setInvestments] = useState<InvestmentWithLiquidFund[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryVariables: InvestmentQueryVariables = useMemo(() => {
    const filters = getFilters();
    const v: InvestmentQueryVariables = {
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      search: search.trim() || undefined,
      // Use the safe orderBy mapper in the query; pass field as-is from headers
      orderBy: sortField
        ? [{ field: sortField, direction: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST' }]
        : [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }],
      ...filters
    };
    // Always filter by liquid fund investment types
    v.investmentGroupIds = ["InvestmentGroup:v1:LIQUID_FUND"];
    return v;
  }, [currentPage, pageSize, search, sortField, sortOrder, getFilters]);

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchInvestments(queryVariables);
      const items: InvestmentWithLiquidFund[] = (result.Investment || []) as InvestmentWithLiquidFund[];
      setInvestments(items);
      setTotalCount(result.InvestmentAggregate?.aggregate?.count || items.length);
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
  // Listen for process completion events to refresh data
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        console.log('LiquidFundInvestmentsList: Process completion event received:', event.type);
        
        // Check for successful completion
        if (event.detail?.resolution === 'success') {
          console.log('LiquidFundInvestmentsList: Process completed successfully, refreshing liquid fund data');
          loadData();
          return;
        }
        
        // Check for different event structures - specifically for liquid fund investments
        const response = event.detail?.response;
        if (response?.detail?.resolution === 'success' || 
            response?.investment || 
            response?.liquidFundInvestment) {
          console.log('LiquidFundInvestmentsList: Liquid fund investment data detected, refreshing list');
          loadData();
          return;
        }
        
        // Check for continue events with payload (investment creation/update)
        if (event.type === 'com.newwork.process.continue' && event.detail?.payload) {
          console.log('LiquidFundInvestmentsList: Continue event with payload detected, refreshing data');
          loadData();
        }
      } catch (err) {
        console.error('Error handling process completion in LiquidFundInvestmentsList:', err);
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
      fromSubView: 'liquid-funds'
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
              <span>Liquid Fund Investments</span>
              <span className="gba:text-gray-500">({totalCount})</span>
            </div>
          </div>
        ),
        actions: (
          <AppAction
            contextsArray={[FlowContextName.createInvestment]}
            accessToken={accessToken}
            data-testid="liquid-fund-investments-add-action"
            emptyStateBehavior="hide"
          >
            <button
              className="gba:flex gba:flex-row gba:justify-center gba:items-center gba:px-3 gba:py-0 gba:h-8 gba:rounded gba:gap-1"
              data-testid="liquid-fund-investments-add-action"
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
          'data-testid': 'liquid-fund-investments-column-visibility'
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
                  <SortableTableHead field="name" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>Investment</SortableTableHead>
                )}
                {visibleColumns.includes('fundType') && (
                  <SortableTableHead field="investmentType.value" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>Fund Type</SortableTableHead>
                )}
                {visibleColumns.includes('bankName') && (
                  <SortableTableHead field="fundManagerName" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>Bank</SortableTableHead>
                )}
                {visibleColumns.includes('interestRate') && (
                  <SortableTableHead field="loanInterestRate" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>Interest Rate</SortableTableHead>
                )}
                {visibleColumns.includes('initialInvestment') && (
                  <SortableTableHead field="initialInvestmentAmount" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>Initial Investment</SortableTableHead>
                )}
                {visibleColumns.includes('marketValue') && (
                  <SortableTableHead field="investmentMarketValue" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>Market Value</SortableTableHead>
                )}
                {visibleColumns.includes('performance') && (
                  <SortableTableHead field="investmentMarketValue" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>Performance</SortableTableHead>
                )}
                {visibleColumns.includes('owner') && (
                  <SortableTableHead field="ownerEmployee.displayName" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>Owner</SortableTableHead>
                )}
                {visibleColumns.includes('status') && (
                  <SortableTableHead field="investmentStatus.value" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>Status</SortableTableHead>
                )}
                {visibleColumns.includes('created') && (
                  <SortableTableHead field="createdAt" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>Created</SortableTableHead>
                )}
                {visibleColumns.includes('accountNumber') && <TableHead>Account Number</TableHead>}
                {visibleColumns.includes('earlyTermination') && <TableHead>Early Termination</TableHead>}
                {visibleColumns.includes('actions') && <TableHead className="gba:w-[60px]">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {investments.map((inv) => (
                <TableRow key={inv.id} className="gba:cursor-pointer" onClick={() => handleRowClick(inv.id)}>
                  {visibleColumns.includes('investment') && (
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Building2 className="gba:w-4 gba:h-4 gba:text-gray-500" />
                        <span className="gba:font-medium">{inv.name}</span>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.includes('fundType') && (
                    <TableCell>
                      <Badge variant="secondary">{inv?.investmentType?.value || 'Liquid Fund'}</Badge>
                    </TableCell>
                  )}
                  {visibleColumns.includes('bankName') && (
                    <TableCell>
                      <span className="gba:font-medium gba:text-gray-900">{inv.liquidFundInvestment?.[0]?.bankName || inv.fundManagerName || 'Unknown Bank'}</span>
                    </TableCell>
                  )}
                  {visibleColumns.includes('interestRate') && (
                    <TableCell>
                      <span className="gba:text-sm">{(inv.liquidFundInvestment?.[0]?.interestRate ?? inv.loanInterestRate) ? `${inv.liquidFundInvestment?.[0]?.interestRate ?? inv.loanInterestRate}%` : '-'}</span>
                    </TableCell>
                  )}
                  {visibleColumns.includes('initialInvestment') && (
                    <TableCell>
                      <span className="gba:font-medium gba:text-gray-700">{formatCurrency(inv.initialInvestmentAmount || 0)}</span>
                    </TableCell>
                  )}
                  {visibleColumns.includes('marketValue') && (
                    <TableCell>
                      <span className="gba:font-semibold gba:text-gray-900">{formatCurrency(inv.investmentMarketValue || 0)}</span>
                    </TableCell>
                  )}
                  {visibleColumns.includes('performance') && (
                    <TableCell>
                      {(() => {
                        const initial = inv.initialInvestmentAmount || 0;
                        const market = inv.investmentMarketValue || 0;
                        const perfAmount = market - initial;
                        const perfPct = initial > 0 ? (perfAmount / initial) * 100 : 0;
                        return (
                          <div className="gba:flex gba:flex-col gba:items-start">
                            <span className={`gba:font-semibold ${
                              (perfPct ?? 0) === 0 ? 'gba:text-gray-500' : 
                              (perfPct ?? 0) > 0 ? 'gba:text-green-600' : 'gba:text-red-600'
                            }`}>
                              {formatCurrency(perfAmount || 0)}
                            </span>
                            <span className={`gba:text-sm ${
                              (perfPct ?? 0) === 0 ? 'gba:text-gray-400' : 
                              (perfPct ?? 0) > 0 ? 'gba:text-green-500' : 'gba:text-red-500'
                            }`}>
                              ({(perfPct ?? 0) === 0 ? '' : (perfPct ?? 0) > 0 ? '+' : ''}{(perfPct ?? 0).toFixed(2)}%)
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
                        <span>{inv.ownerEmployee?.displayName || '-'}</span>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.includes('status') && (
                    <TableCell>
                      <Badge variant="secondary">{inv.investmentStatus?.value || "Unknown"}</Badge>
                    </TableCell>
                  )}
                  {visibleColumns.includes('created') && (
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Calendar className="gba:w-4 gba:h-4 gba:text-gray-500" />
                        <span>{formatDate(inv.acquisitionDate || (inv as any).createdAt)}</span>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.includes('accountNumber') && (
                    <TableCell>
                      <span className="gba:text-sm gba:font-mono">{inv.liquidFundInvestment?.[0]?.bankAccountNumber || '-'}</span>
                    </TableCell>
                  )}
                  {visibleColumns.includes('earlyTermination') && (
                    <TableCell>
                      <Badge variant={inv.liquidFundInvestment?.[0]?.earlyTerminationAllowed ? 'default' : 'secondary'}>
                        {inv.liquidFundInvestment?.[0]?.earlyTerminationAllowed ? 'Allowed' : 'Not Allowed'}
                      </Badge>
                    </TableCell>
                  )}
                  {visibleColumns.includes('actions') && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="gba:flex gba:justify-start gba:gap-2">
                        <AppActionButton
                          data-testid={`liquid-fund-investment-update-button-${inv.id}`}
                          size="icon"
                          contextsArray={[FlowContextName.liquidFundInvestmentEntity]}
                          externalContextData={{ investmentId: inv.id }}
                          prefixDataTestId={`liquid-fund-investment-update`}
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

export default LiquidFundInvestmentsList;


