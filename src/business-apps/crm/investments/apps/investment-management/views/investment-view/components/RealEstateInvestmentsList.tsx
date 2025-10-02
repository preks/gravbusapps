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
import { Building2, Calendar, Target, ChevronUp, ChevronDown, Plus } from "lucide-react";
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';
import { formatDate } from "@/common/data/investment";
import { formatCurrencyParts } from '@/common/utils/numberFormatter';
import { ColumnConfig } from "@/components/dataController";
import { useInvestmentListController } from "../hooks/useInvestmentListController";
import { useRealEstateInvestmentsFilters } from "../hooks/useRealEstateInvestmentsFilters";
import { OwnerDisplay } from "../../../../../components/shared";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";


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
    handlePaginationChange,
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
    { id: "investment", label: getTranslationFromI18nKeyAndLabel('investment:list.columns.investment','Investment'), visible: true },
    { id: "type", label: getTranslationFromI18nKeyAndLabel('investment:list.columns.type','Type'), visible: true },
    { id: "totalInvestment", label: getTranslationFromI18nKeyAndLabel('investment:list.columns.totalInvestment','Total Investment'), visible: true },
    { id: "acquisitionDate", label: getTranslationFromI18nKeyAndLabel('investment:list.columns.acquisitionDate','Acquisition Date'), visible: true },
    { id: "owner", label: getTranslationFromI18nKeyAndLabel('investment:list.columns.owner','Owner'), visible: true },
    // Optional columns
    { id: "status", label: getTranslationFromI18nKeyAndLabel('investment:list.columns.status','Status'), visible: false },
    { id: "created", label: getTranslationFromI18nKeyAndLabel('investment:list.columns.created','Created'), visible: false },
    // Actions column must be LAST
    { id: "actions", label: getTranslationFromI18nKeyAndLabel('common:actions','Actions'), visible: true, disabled: true },
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
    // Map each visible column to its filter group for real estate
    const columnToFilterMap: Record<string, string> = {
      // 1. Investment - searchable by name (handled by main search)
      created: 'creationDate',
      // 2. Type column → Investment Type filter
      type: "investmentType",
      // 3. Total Investment → Amount range filter
      totalInvestment: "totalInvestmentRange",
      // 4. Acquisition Date → Date range filter
      acquisitionDate: "acquisitionDate",
      // 5. Owner → Owner filter
      owner: "owner",
      // Additional columns
      status: "investmentStatus",
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

  const renderAmount = (amount: number | undefined, currency?: string) => {
    if (typeof amount !== 'number') return <span className="gba:text-gray-400">-</span>;
    const { number, symbol } = formatCurrencyParts(amount, { currency, minimumFractionDigits: 0, maximumFractionDigits: 2 });
    return (
      <div className="gba:w-full gba:flex gba:justify-end gba:items-baseline">
        <span className="gba:text-sm gba:[font-variant-numeric:tabular-nums]">{number}</span>
        <span className="gba:text-xs gba:text-gray-400 gba:inline-block gba:text-right gba:shrink-0 gba:w-[5ch]">{symbol}</span>
      </div>
    );
  };

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
              <span>{getTranslationFromI18nKeyAndLabel('investment:realEstate.title','Real Estate Investments')}</span>
              <span className="gba:text-gray-500">({totalCount})</span>
            </div>
          </div>
        ),
        actions: (
          <AppAction
            contextsArray={[FlowContextName.createInvestment]}
            externalContextData={{ 
              investmentGroup: 'REAL_ESTATE',
              investmentGroupRef: 'InvestmentGroup:v1:REAL_ESTATE',
              fromView: 'investments',
              fromSubView: 'real-estate'
            }}
            accessToken={accessToken}
            data-testid="real-estate-investments-add-action"
            emptyStateBehavior="hide"
          >
            <Button
              size="sm"
              variant="default"
              data-testid="real-estate-investments-add-button"
              type="button"
              style={{ gap: 'var(--nw-spacing-xs)' }}
            >
              <Plus size={16} />
              {getTranslationFromI18nKeyAndLabel('investment:realEstate.addRealEstate', 'Add Real Estate')}
            </Button>
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
                    {getTranslationFromI18nKeyAndLabel('investment:list.columns.investment','Investment')}
                  </SortableTableHead>
                )}
                {visibleColumns.includes('type') && (
                  <SortableTableHead field="investmentType.value" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>
                    {getTranslationFromI18nKeyAndLabel('investment:list.columns.type','Type')}
                  </SortableTableHead>
                )}
                {visibleColumns.includes('totalInvestment') && (
                  <SortableTableHead field="totalInvestmentAmount" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>
                    {getTranslationFromI18nKeyAndLabel('investment:list.columns.totalInvestment','Total Investment')}
                  </SortableTableHead>
                )}
                {visibleColumns.includes('acquisitionDate') && (
                  <SortableTableHead field="acquisitionDate" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>
                    {getTranslationFromI18nKeyAndLabel('investment:list.columns.acquisitionDate','Acquisition Date')}
                  </SortableTableHead>
                )}
                {visibleColumns.includes('owner') && (
                  <SortableTableHead field="ownerEmployee.displayName" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>
                    {getTranslationFromI18nKeyAndLabel('investment:list.columns.owner','Owner')}
                  </SortableTableHead>
                )}
                {visibleColumns.includes('status') && (
                  <SortableTableHead field="investmentStatus.value" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>
                    {getTranslationFromI18nKeyAndLabel('investment:list.columns.status','Status')}
                  </SortableTableHead>
                )}
                {visibleColumns.includes('created') && (
                  <SortableTableHead field="createdAt" currentSortField={sortField} currentSortOrder={sortOrder} onSort={handleSortingChange}>
                    {getTranslationFromI18nKeyAndLabel('investment:list.columns.created','Created')}
                  </SortableTableHead>
                )}
                {visibleColumns.includes('actions') && <TableHead className="gba:w-[60px]">{getTranslationFromI18nKeyAndLabel('common:actions','Actions')}</TableHead>}
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
                    <TableCell className="gba:text-right">{renderAmount(investment.totalInvestmentAmount, investment.currency?.code)}</TableCell>
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
                  {visibleColumns.includes('owner') && (
                    <TableCell>
                      <OwnerDisplay 
                        ownerEmployee={investment.ownerEmployee}
                        entityId={investment.id}
                        testIdPrefix="real-estate-investment"
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
          
          {/* Pagination */}
          <div
            className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-4 gba:border-t"
            data-testid="real-estate-investments-pagination"
          >
            <div
              className="gba:text-sm gba:text-muted-foreground"
              data-testid="real-estate-investments-pagination-info"
            >
              {`${(currentPage - 1) * pageSize + 1}-${Math.min(
                currentPage * pageSize,
                totalCount
              )} of ${totalCount} ${getTranslationFromI18nKeyAndLabel('investment:realEstate.pagination.investments', 'investments')}`}
            </div>
            <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
              <div className="gba:flex gba:items-center gba:space-x-2">
                <p className="gba:text-sm gba:font-medium">{getTranslationFromI18nKeyAndLabel('investment:realEstate.pagination.rowsPerPage', 'Rows per page')}</p>
                <select
                  value={pageSize}
                  onChange={(e) => handlePaginationChange(1, Number(e.target.value))}
                  className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                  data-testid="real-estate-investments-page-size-select"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div
                className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium"
                data-testid="real-estate-investments-page-info"
              >
                {getTranslationFromI18nKeyAndLabel('investment:realEstate.pagination.page', 'Page')} {currentPage} of {Math.ceil(totalCount / pageSize)}
              </div>
              <div className="gba:flex gba:items-center gba:space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePaginationChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                  data-testid="real-estate-investments-prev-page"
                >
                  {getTranslationFromI18nKeyAndLabel('investment:realEstate.pagination.previous', 'Previous')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePaginationChange(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(totalCount / pageSize)}
                  data-testid="real-estate-investments-next-page"
                >
                  {getTranslationFromI18nKeyAndLabel('investment:realEstate.pagination.next', 'Next')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      }
    />
  );
};

export default RealEstateInvestmentsList;


