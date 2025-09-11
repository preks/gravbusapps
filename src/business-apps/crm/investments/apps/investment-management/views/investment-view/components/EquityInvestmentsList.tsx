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
import { PlusOutlined } from "@ant-design/icons";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGetInvestments } from "@/common/data/investment/hooks/useInvestments";
import type { Investment } from "@/common/data/investment/types";
import type { InvestmentQueryVariables } from "@/common/data/investment/queries/investmentQueries";
import { DataContainer } from "@/components/layout/dataContainer/DataContainer";
import { AppAction } from "@/components/app-action/AppAction";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { Building2, Calendar, User } from "lucide-react";
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';
import { formatCurrency, formatDate } from "@/common/data/investment";
import { useEquityInvestmentsFilters } from "../hooks/useEquityInvestmentsFilters";
import { ColumnConfig } from "@/components/dataController";
import { useInvestmentListController } from "../hooks/useInvestmentListController";
import { useProcessCompletion } from "@/common/hooks/useProcessCompletion";

export interface EquityInvestmentsListProps extends BusinessAppContextProps {
  sourceApp?: string;
}

const EquityInvestmentsList: React.FC<EquityInvestmentsListProps> = (props) => {
  const { accessToken, sourceApp } = props;

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
  } = useEquityInvestmentsFilters(props);

  // Define available columns with default visibility for equity investments
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>(() => [
    { id: "actions", label: "Actions", visible: true, disabled: true },
    { id: "investment", label: "Investment", visible: true },
    { id: "type", label: "Type", visible: true },
    { id: "stage", label: "Stage", visible: true },
    { id: "initialInvestment", label: "Initial Investment", visible: true },
    { id: "marketValue", label: "Market Value", visible: true },
    { id: "stakePercentage", label: "Stake", visible: true },
    { id: "performance", label: "Performance", visible: true },
    { id: "owner", label: "Owner", visible: true },
    { id: "status", label: "Status", visible: true },
    { id: "created", label: "Created", visible: true },
    // Optional columns specific to equity
    { id: "acquisitionDate", label: "Acquisition Date", visible: false },
    { id: "exitDate", label: "Exit Date", visible: false },
    { id: "totalInvestment", label: "Total Investment", visible: false },
    { id: "isin", label: "ISIN", visible: false },
    { id: "currency", label: "Currency", visible: false },
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
      stage: "investmentStage",
      status: "investmentStatus",
      owner: "owner",
      created: "creationDate",
    };

    return filterGroups.filter(group => {
      const relatedColumn = Object.keys(columnToFilterMap).find(
        col => columnToFilterMap[col] === group.id
      );
      return !relatedColumn || visibleColumns.includes(relatedColumn);
    });
  }, [filterGroups, visibleColumns]);

  // Data management
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const { fetchInvestments } = useGetInvestments(props);

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
      setError(err instanceof Error ? err : new Error("Unknown error occurred"));
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
      fromSubView: 'equity'
    });
    navigateTo(detailsUrl);
  }, []);

  // Process completion hook for refreshing data
  useProcessCompletion({
    onProcessComplete: () => {
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
              <span>Equity Investments</span>
              <span className="gba:text-gray-500">({totalCount})</span>
            </div>
          </div>
        ),
        actions: (
          <AppAction
            contextsArray={[FlowContextName.createInvestment]}
            accessToken={accessToken}
            data-testid="equity-investments-add-action"
            emptyStateBehavior="hide"
          >
            <Button
              variant="default"
              size="sm"
              className="gba:flex gba:items-center gba:gap-2"
              data-testid="equity-investments-add-button"
            >
              <PlusOutlined />
              Add Equity Investment
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
                {visibleColumns.includes('stage') && <TableHead>Stage</TableHead>}
                {visibleColumns.includes('initialInvestment') && <TableHead>Initial Investment</TableHead>}
                {visibleColumns.includes('marketValue') && <TableHead>Market Value</TableHead>}
                {visibleColumns.includes('stakePercentage') && <TableHead>Stake</TableHead>}
                {visibleColumns.includes('performance') && <TableHead>Performance</TableHead>}
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
                  {visibleColumns.includes('stage') && (
                    <TableCell>
                      <Badge variant="outline">{investment.investmentPhase?.value || "Unknown"}</Badge>
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
                  {visibleColumns.includes('stakePercentage') && (
                    <TableCell>
                      <span>{investment.stakePercentage ? `${investment.stakePercentage}%` : '-'}</span>
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
                  {visibleColumns.includes('owner') && (
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <User className="gba:w-4 gba:h-4 gba:text-gray-600" />
                        <span>{investment.ownerEmployee?.displayName || "N/A"}</span>
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
        </div>
      }
    />
  );
};

export default EquityInvestmentsList;
