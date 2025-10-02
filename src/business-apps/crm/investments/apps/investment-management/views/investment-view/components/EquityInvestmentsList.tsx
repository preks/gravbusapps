import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Badge, Button } from "@newwork/nw-design-system";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGetInvestments } from "@/common/data/investment/hooks/useInvestments";
import type { Investment } from "@/common/data/investment/types";
import type { InvestmentQueryVariables } from "@/common/data/investment/queries/investmentQueries";
import { DataContainer } from "@/components/layout/dataContainer/DataContainer";
import { AppAction } from "@/components/app-action/AppAction";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { Building2, Calendar, Plus } from "lucide-react";
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';
import { formatDate } from "@/common/data/investment";
import { formatCurrencyParts } from '@/common/utils/numberFormatter';
import { useEquityInvestmentsFilters } from "../hooks/useEquityInvestmentsFilters";
import { ColumnConfig } from "@/components/dataController";
import { useInvestmentListController } from "../hooks/useInvestmentListController";
import { OwnerDisplay } from "../../../../../components/shared";
import { useProcessCompletion } from "@/common/hooks/useProcessCompletion";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";

export interface EquityInvestmentsListProps extends BusinessAppContextProps {
  sourceApp?: string;
}

const EquityInvestmentsList: React.FC<EquityInvestmentsListProps> = (props) => {
  const { accessToken } = props;

  // Use the shared controller for URL sync and state management
  const {
    search,
    currentPage,
    pageSize,
    sortField,
    sortOrder,
    initialLoadDone,
    setSearch,
    handlePaginationChange,
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
  } = useEquityInvestmentsFilters(props);

  // Define available columns with default visibility for equity investments
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(() => [
    { id: "investment", label: "Investment", visible: true },
    { id: "type", label: "Type", visible: true },
    { id: "totalInvestment", label: "Total Investment", visible: true },
    { id: "marketValue", label: "Market Value", visible: true },
    { id: "performance", label: "Performance", visible: true },
    { id: "stakeType", label: "Stake Type", visible: true },
    { id: "stakePercentage", label: "Stake %", visible: true },
    { id: "acquisitionDate", label: "Acquisition Date", visible: true },
    { id: "plannedExit", label: "Planned Exit", visible: true },
    { id: "ebitda", label: "EBITDA", visible: true },
    { id: "owner", label: "Owner", visible: true },
    { id: "status", label: "Status", visible: true },
    { id: "created", label: "Created", visible: true },
    // Optional columns specific to equity
    { id: "exitDate", label: "Exit Date", visible: false },
    // Actions column must be LAST
    { id: "actions", label: "Actions", visible: true, disabled: true },
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
      investment: "investment",
      type: "investmentType",
      status: "investmentStatus",
      owner: "owner",
      created: "creationDate",
    };
    return filterGroups.filter((group: any) => {
      const relatedColumn = Object.keys(columnToFilterMap).find(
        (col) => columnToFilterMap[col] === group.id
      );
      return !relatedColumn || visibleColumns.includes(relatedColumn as string);
    });
  }, [filterGroups, visibleColumns]);

  // Data management
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [totalCount, setTotalCount] = useState(0);

  const { fetchInvestments } = useGetInvestments(props);

  const queryVariables: InvestmentQueryVariables = useMemo(() => {
    const filters = getFilters();
    const v: InvestmentQueryVariables = {
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      search: search.trim() || undefined,
      orderBy: sortField ? [{ field: sortField, direction: sortOrder === 'ASC' ? 'ASC_NULLS_LAST' : 'DESC_NULLS_LAST' }] : [{ field: 'createdAt', direction: 'DESC_NULLS_LAST' }],
      ...filters
    };
    // Always filter by equity investment types
    v.investmentGroupIds = ["InvestmentGroup:v1:EQUITY"];
    return v;
  }, [currentPage, pageSize, search, sortField, sortOrder, getFilters]);

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    try {
      const result = await fetchInvestments(queryVariables);
      setInvestments(result.Investment || []);
      setTotalCount(result.InvestmentAggregate?.aggregate?.count || 0);
    } catch (err) {
      // Error loading investments
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
        // Check for successful completion
        if (event.detail?.resolution === 'success') {
          loadData();
          return;
        }
        
        // Check for different event structures - specifically for equity investments
        const response = event.detail?.response;
        if (response?.detail?.resolution === 'success' || 
            response?.investment || 
            response?.equityInvestment) {
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
        const removedFilters = selectedFilters.filter((f: any) => !filters.includes(f));
        removedFilters.forEach((filterId: any) => removeFilter(filterId));
      }
    },
    [clearAllFilters, selectedFilters, removeFilter]
  );

  const handleRowClick = useCallback((investmentId: string) => {
    const detailsUrl = buildPlatformUrl('/platform/irm/investment-record', { 
      investmentId,
      fromView: 'investments',
      fromSubView: 'equity'
    });
    navigateTo(detailsUrl);
  }, []);

  // Process completion hook for refreshing data
  useProcessCompletion({
    onSuccess: () => {
      loadData();
    },
  });

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
              <span>{getTranslationFromI18nKeyAndLabel('investment:equity.equityInvestments', 'Equity Investments')}</span>
              <span className="gba:text-gray-500">({totalCount})</span>
            </div>
          </div>
        ),
        actions: (
          <AppAction
            contextsArray={[FlowContextName.createInvestment]}
            externalContextData={{ 
              investmentGroup: 'InvestmentGroup:v1:EQUITY',
              fromView: 'investments',
              fromSubView: 'equity'
            }}
            accessToken={accessToken}
            data-testid="equity-investments-add-action"
            emptyStateBehavior="hide"
          >
            <Button
              size="sm"
              variant="default"
              data-testid="equity-investments-add-button"
              type="button"
              style={{ gap: 'var(--nw-spacing-xs)' }}
            >
              <Plus size={16} />
              {getTranslationFromI18nKeyAndLabel('investment:equity.addEquityInvestment', 'Add Equity Investment')}
            </Button>
          </AppAction>
        ),
        columnVisibility: {
          columns: columnConfig,
          onColumnVisibilityChange: handleColumnVisibilityChange,
          'data-testid': 'equity-investments-column-visibility'
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
                {visibleColumns.includes('investment') && <TableHead>Investment</TableHead>}
                {visibleColumns.includes('type') && <TableHead>Type</TableHead>}
                {visibleColumns.includes('totalInvestment') && <TableHead>Total Investment</TableHead>}
                {visibleColumns.includes('marketValue') && <TableHead>Market Value</TableHead>}
                {visibleColumns.includes('performance') && <TableHead>Performance</TableHead>}
                {visibleColumns.includes('stakeType') && <TableHead>Stake Type</TableHead>}
                {visibleColumns.includes('stakePercentage') && <TableHead>Stake %</TableHead>}
                {visibleColumns.includes('acquisitionDate') && <TableHead>Acquisition Date</TableHead>}
                {visibleColumns.includes('plannedExit') && <TableHead>Planned Exit</TableHead>}
                {visibleColumns.includes('ebitda') && <TableHead>EBITDA</TableHead>}
                {visibleColumns.includes('owner') && <TableHead>Owner</TableHead>}
                {visibleColumns.includes('status') && <TableHead>Status</TableHead>}
                {visibleColumns.includes('created') && <TableHead>Created</TableHead>}
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
                  {visibleColumns.includes('totalInvestment') && (
                    <TableCell className="gba:text-right">{
                      (() => { const { number, symbol } = formatCurrencyParts(investment.totalInvestmentAmount || 0, { currency: investment.currency?.code, minimumFractionDigits: 0, maximumFractionDigits: 2 }); return (
                        <>
                          <span className="gba:text-sm gba:[font-variant-numeric:tabular-nums]">{number}</span>
                          <span className="gba:text-xs gba:text-gray-400 gba:inline-block gba:text-right gba:shrink-0 gba:w-[5ch]">{symbol}</span>
                        </>
                      ); })()
                    }</TableCell>
                  )}
                  {visibleColumns.includes('marketValue') && (
                    <TableCell className="gba:text-right">{
                      (() => { const { number, symbol } = formatCurrencyParts(investment.investmentMarketValue || 0, { currency: investment.currency?.code, minimumFractionDigits: 0, maximumFractionDigits: 2 }); return (
                        <>
                          <span className="gba:text-sm gba:[font-variant-numeric:tabular-nums]">{number}</span>
                          <span className="gba:text-xs gba:text-gray-400 gba:inline-block gba:text-right gba:shrink-0 gba:w-[5ch]">{symbol}</span>
                        </>
                      ); })()
                    }</TableCell>
                  )}
                  {visibleColumns.includes('performance') && (
                    <TableCell className="gba:text-right">
                      {(() => {
                        const currentValue = investment.investmentMarketValue || 0;
                        const totalValue = investment.totalInvestmentAmount || 0;
                        const performanceAmount = currentValue - totalValue;
                        const performancePercentage = totalValue > 0 ? (performanceAmount / totalValue) * 100 : 0;
                        const isZero = performancePercentage === 0;
                        const isPositive = performancePercentage > 0;

                        return (
                          <div className="gba:flex gba:flex-col gba:items-end">
                            <div className="gba:w-full gba:flex gba:justify-end gba:items-baseline">{
                              (() => { const { number, symbol } = formatCurrencyParts(Math.abs(performanceAmount), { currency: investment.currency?.code, minimumFractionDigits: 0, maximumFractionDigits: 2 }); return (
                                <>
                                  <span className={`gba:text-sm gba:[font-variant-numeric:tabular-nums] ${isZero ? 'gba:text-gray-500' : isPositive ? 'gba:text-green-600' : 'gba:text-red-600'}`}>{number}</span>
                                  <span className={`gba:text-xs gba:inline-block gba:text-right gba:shrink-0 gba:w-[5ch] ${isZero ? 'gba:text-gray-400' : isPositive ? 'gba:text-green-500' : 'gba:text-red-500'}`}>{symbol}</span>
                                </>
                              ); })()
                            }</div>
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
                  {visibleColumns.includes('stakeType') && (
                    <TableCell>
                      <Badge variant="outline">
                        {investment.investmentStakeType?.value || "N/A"}
                      </Badge>
                    </TableCell>
                  )}
                  {visibleColumns.includes('stakePercentage') && (
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <span>{investment.stakePercentage ? `${investment.stakePercentage}%` : "N/A"}</span>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.includes('acquisitionDate') && (
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Calendar className="gba:w-4 gba:h-4 gba:text-gray-500" />
                        <span>{investment.acquisitionDate ? formatDate(investment.acquisitionDate) : "N/A"}</span>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.includes('plannedExit') && (
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Calendar className="gba:w-4 gba:h-4 gba:text-orange-500" />
                        <span>{investment.plannedExitDate ? formatDate(investment.plannedExitDate) : "N/A"}</span>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.includes('ebitda') && (
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <span>N/A</span>
                      </div>
                    </TableCell>
                  )}
                  {visibleColumns.includes('owner') && (
                    <TableCell>
                      <OwnerDisplay 
                        ownerEmployee={investment.ownerEmployee}
                        entityId={investment.id}
                        testIdPrefix="equity-investment"
                      />
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
                  {visibleColumns.includes('actions') && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="gba:flex gba:justify-start gba:gap-2">
                        <AppActionButton
                          data-testid={`equity-investment-update-button-${investment.id}`}
                          size="icon"
                          contextsArray={[FlowContextName.equityInvestmentEntity]}
                          externalContextData={{ investmentId: investment.id }}
                          prefixDataTestId="equity-investment-update"
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
          
          {/* Pagination */}
          <div
            className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-4 gba:border-t"
            data-testid="equity-investments-pagination"
          >
            <div
              className="gba:text-sm gba:text-muted-foreground"
              data-testid="equity-investments-pagination-info"
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
                  data-testid="equity-investments-page-size-select"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div
                className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium"
                data-testid="equity-investments-page-info"
              >
                Page {currentPage} of {Math.ceil(totalCount / pageSize)}
              </div>
              <div className="gba:flex gba:items-center gba:space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePaginationChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  data-testid="equity-investments-prev-page"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePaginationChange(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                  data-testid="equity-investments-next-page"
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

export default EquityInvestmentsList;
