import React, { useState, useEffect, useCallback } from "react";
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
import { WidgetGroup, WidgetItem } from "@/components/widget-group";
import { 
  DollarSign, 
  CheckCircle, 
  Award, 
  Building2, 
  Calendar, 
  User,
  Target
} from "lucide-react";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { DataContainer } from "@/components/layout/dataContainer/DataContainer";
import { ColumnConfig } from "@/components/dataController";
import { AppAction } from "@/components/app-action/AppAction";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';
import { formatCurrency, formatDate } from "../../utils";
import { useSalesData } from "./hooks/useSalesData";
import { DateRangeFilter } from '@/business-apps/crm/customers/apps/customer-relations/views/lead-view/components/DateRangeFilter';
import { useEmployeeSearch } from '@/common/data/employee/useEmployeeSearch';

interface SalesProps extends BusinessAppContextProps {}

const Sales: React.FC<SalesProps> = ({ accessToken, userInfo }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("closeDate");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  // Close Date range state
  const [closeAfter, setCloseAfter] = useState<string | undefined>(undefined);
  const [closeBefore, setCloseBefore] = useState<string | undefined>(undefined);
  // Owner backend search
  const { employees: employeeOptions, search: searchEmployees, loading: loadingEmployees, error: employeeError } = useEmployeeSearch(accessToken);

  const context = { accessToken, userInfo };

  const {
    soldOpportunities,
    metrics,
    total,
    loading,
    error,
    loadPage,
  } = useSalesData({
    search: searchTerm,
    sortField,
    sortOrder,
    context,
  });

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  const handleSetFilter = useCallback((filters: string[]) => {
    setSelectedFilters(filters);
    setCurrentPage(1);
  }, []);

  const handleRowClick = useCallback((opportunityId: string) => {
    const detailsUrl = buildPlatformUrl('/platform/irm/opportunity-record', { 
      opportunityId,
      fromView: 'divestments',
      fromSubView: 'sales'
    });
    navigateTo(detailsUrl);
  }, []);

  useEffect(() => {
    const ownerIds = selectedFilters.filter((id) => !id.startsWith('InvestmentGroup:') && !id.startsWith('InvestmentType:') && !id.startsWith('OpportunityStatus:'));
    loadPage(
      currentPage,
      pageSize,
      {
        search: searchTerm,
        ownerEmployeeIds: ownerIds,
        closeDateFrom: closeAfter,
        closeDateTo: closeBefore,
      }
    );
  }, [loadPage, currentPage, searchTerm, sortField, sortOrder, selectedFilters, closeAfter, closeBefore]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC");
    } else {
      setSortField(field);
      setSortOrder("DESC");
    }
    setCurrentPage(1);
  };

  // Using OpportunityList for rendering the table to avoid incompatible Table API

  // Column visibility for Sales
  const [columnConfig, setColumnConfig] = useState<ColumnConfig[]>([
    { id: 'actions', label: 'Actions', visible: true, disabled: true },
    { id: 'opportunity', label: 'Opportunity', visible: true },
    { id: 'investment', label: 'Investment', visible: true },
    { id: 'saleAmount', label: 'Sale Amount', visible: true },
    { id: 'status', label: 'Status', visible: true },
    { id: 'revenue', label: 'Revenue', visible: true },
    { id: 'closeDate', label: 'Close Date', visible: true },
    { id: 'owner', label: 'Owner', visible: true },
    { id: 'created', label: 'Created', visible: false },
  ]);

  const visibleColumns = columnConfig.filter(c => c.visible).map(c => c.id);
  const handleColumnVisibilityChange = useCallback((columnId: string, visible: boolean) => {
    setColumnConfig(prev => prev.map(c => c.id === columnId ? { ...c, visible } : c));
  }, []);

  const columnToFilterMap: Record<string, string> = {
    opportunity: 'opportunityName',
    investment: 'investmentName',
    saleAmount: 'amountRange',
    status: 'opportunityStatus',
    revenue: 'revenueRange',
    closeDate: 'closeDate',
    owner: 'owner',
    created: 'creationDate',
  };

  const renderMetrics = () => {
    if (!metrics) return null;

    const widgets: WidgetItem[] = [
      {
        key: "total-sold",
        title: getTranslationFromI18nKeyAndLabel("total_sold", "Total Sold"),
        value: metrics.totalSold,
        prefix: <CheckCircle className="gba:h-5 gba:w-5 gba:text-green-600" />,
        color: '#52c41a', // Green theme for sales success
        span: { xs: 24, sm: 12, md: 12, lg: 6 },
        description: getTranslationFromI18nKeyAndLabel("successfully_sold_opportunities", "Successfully sold opportunities"),
        trend: {
          value: `${metrics.totalSold} ${getTranslationFromI18nKeyAndLabel("sold", "sold")}`,
          positive: true,
          description: getTranslationFromI18nKeyAndLabel("completed_exits", "completed exits")
        }
      },
      {
        key: "average-sale-amount",
        title: getTranslationFromI18nKeyAndLabel("average_sale_amount", "Average Sale Amount"),
        value: formatCurrency(metrics.averageRevenue),
        prefix: <Target className="gba:h-5 gba:w-5 gba:text-purple-600" />,
        color: '#722ed1', // Purple theme for average sale amount
        span: { xs: 24, sm: 12, md: 12, lg: 6 },
        description: getTranslationFromI18nKeyAndLabel("average_amount_per_sale", "Average amount per sale"),
        trend: {
          value: formatCurrency(metrics.averageRevenue),
          positive: true,
          description: getTranslationFromI18nKeyAndLabel("per_transaction", "per transaction")
        }
      },
      {
        key: "total-revenue",
        title: getTranslationFromI18nKeyAndLabel("total_revenue", "Total Revenue"),
        value: formatCurrency(metrics.totalRevenue),
        prefix: <DollarSign className="gba:h-5 gba:w-5 gba:text-green-600" />,
        color: '#389e0d', // Darker green for revenue
        span: { xs: 24, sm: 12, md: 12, lg: 6 },
        description: getTranslationFromI18nKeyAndLabel("total_revenue_generated", "Total revenue generated from sales"),
        trend: {
          value: formatCurrency(metrics.totalRevenue),
          positive: true,
          description: getTranslationFromI18nKeyAndLabel("revenue_generated", "revenue generated")
        }
      },
      {
        key: "average-revenue",
        title: getTranslationFromI18nKeyAndLabel("average_revenue", "Average Revenue"),
        value: formatCurrency(metrics.averageRevenue),
        prefix: <Award className="gba:h-5 gba:w-5 gba:text-blue-600" />,
        color: '#1890ff', // Blue theme for averages
        span: { xs: 24, sm: 12, md: 12, lg: 6 },
        description: getTranslationFromI18nKeyAndLabel("average_revenue_per_sale", "Average revenue per sale"),
        trend: {
          value: formatCurrency(metrics.averageRevenue),
          positive: true,
          description: getTranslationFromI18nKeyAndLabel("per_sale", "per sale")
        }
      }
    ];

    return (
      <WidgetGroup
        widgets={widgets}
        isLoading={loading}
        error={error}
        skeletonCount={4}
        defaultSpan={{ xs: 24, sm: 12, md: 12, lg: 6 }}
        emptyText={getTranslationFromI18nKeyAndLabel("no_metrics_available", "No metrics available")}
        data-testid="sales-metrics"
      />
    );
  };

  // Helper function to get status badge variant (for sold opportunities)
  const getSalesBadgeVariant = (): "secondary" => {
    return "secondary"; // All sold opportunities use secondary (success) variant
  };

  const renderSalesTable = () => {
    if (loading && soldOpportunities.length === 0) {
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
            <span>Error loading sales: {error instanceof Error ? error.message : String(error)}</span>
            <Button variant="outline" size="sm" onClick={() => loadPage(currentPage, pageSize)}>
              Retry
            </Button>
          </div>
        </Alert>
      );
    }

    return (
      <DataContainer
        dataControllerProps={{
          search: searchTerm,
          setSearch: handleSearch,
          debounceDelay: 500,
          filter: selectedFilters,
          setFilter: handleSetFilter,
          columnVisibility: {
            columns: columnConfig,
            onColumnVisibilityChange: handleColumnVisibilityChange,
            'data-testid': 'sales-column-visibility'
          },
          dateRange: {
            createdAfter: closeAfter,
            createdBefore: closeBefore,
            onClear: () => { setCloseAfter(undefined); setCloseBefore(undefined); }
          },
          listTitle: (
            <div className="gba:flex gba:items-center gba:gap-4">
              <div className="gba:flex gba:items-center gba:gap-2">
                <span>Sold Opportunities</span>
                <span className="gba:text-gray-500">({total})</span>
              </div>
            </div>
          ),
          actions: (
            <AppAction
              contextsArray={[FlowContextName.createInvestmentOpportunity]}
              accessToken={accessToken}
              data-testid="sales-add-action"
              emptyStateBehavior="hide"
            >
              <button
                className="gba:flex gba:flex-row gba:justify-center gba:items-center gba:px-3 gba:py-0 gba:h-8 gba:rounded gba:gap-1"
                data-testid="sales-add-action"
                type="button"
              >
                <span className="gba:h-4 gba:font-normal gba:text-sm gba:leading-4 gba:flex gba:items-center gba:text-black gba:flex-none order-1 gba:grow-0">
                  Add
                </span>
              </button>
            </AppAction>
          ),
        }}
        dataFilterProps={{
          filterGroups: [
            {
              id: 'opportunityName',
              title: 'Opportunity',
              filters: [],
              customComponent: React.createElement('input', {
                value: searchTerm,
                onChange: (e: any) => handleSearch(e?.target?.value || ''),
                placeholder: 'Search opportunity name',
                className: 'gba:w-full gba:h-8 gba:px-2 gba:text-sm gba:bg-gray-100/40 gba:rounded gba:border-none gba:outline-none',
              }),
              hideSearch: true,
            },
            {
              id: 'investmentName',
              title: 'Investment',
              filters: [],
              customComponent: React.createElement('input', {
                value: '',
                onChange: () => {},
                placeholder: 'Search investment',
                className: 'gba:w-full gba:h-8 gba:px-2 gba:text-sm gba:bg-gray-100/40 gba:rounded gba:border-none gba:outline-none',
              }),
              hideSearch: true,
            },
            {
              id: 'amountRange',
              title: 'Sale Amount',
              filters: [],
              customComponent: React.createElement('div', null),
              hideSearch: true,
            },
            {
              id: 'opportunityStatus',
              title: 'Status',
              filters: [
                { id: 'OpportunityStatus:v1:WON', label: 'Won', selected: selectedFilters.includes('OpportunityStatus:v1:WON') },
                { id: 'OpportunityStatus:v1:CLOSED', label: 'Closed', selected: selectedFilters.includes('OpportunityStatus:v1:CLOSED') },
              ],
            },
            {
              id: 'revenueRange',
              title: 'Revenue',
              filters: [],
              customComponent: React.createElement('div', null),
              hideSearch: true,
            },
            {
              id: 'owner',
              title: 'Owner',
              filters: [],
              backendSearch: (q: string) => {
                const term = (q || '').trim();
                if (term.length >= 2) {
                  void searchEmployees(term);
                }
                const opts = (employeeOptions || []).map((e) => ({ id: e.id, label: e.displayName, value: e.id, selected: selectedFilters.includes(e.id) }));
                return { filters: term.length >= 2 ? opts : [], loading: loadingEmployees, error: employeeError } as any;
              },
            },
            {
              id: 'closeDate',
              title: 'Close Date',
              filters: [],
              customComponent: (
                <DateRangeFilter
                  createdAfter={closeAfter}
                  createdBefore={closeBefore}
                  onDateRangeChange={(after?: string, before?: string) => { setCloseAfter(after); setCloseBefore(before); }}
                  className='gba:border-0 gba:shadow-none gba:p-0 gba:bg-transparent'
                />
              ),
              hideSearch: true,
            },
            {
              id: 'creationDate',
              title: 'Created',
              filters: [],
              customComponent: React.createElement(DateRangeFilter, {
                createdAfter: undefined,
                createdBefore: undefined,
                onDateRangeChange: () => {},
                className: 'gba:border-0 gba:shadow-none gba:p-0 gba:bg-transparent',
              }),
              hideSearch: true,
            }
          ].filter(g => {
            const targetCol = Object.keys(columnToFilterMap).find(c => columnToFilterMap[c] === g.id);
            return targetCol ? visibleColumns.includes(targetCol) : true;
          }),
          onFilterChange: (id, checked) => {
            setSelectedFilters((prev) => checked ? [...prev, id] : prev.filter(f => f !== id));
          },
        }}
        dataBody={
          <div className="gba:bg-white gba:rounded-lg gba:border">
            <Table>
              <TableHeader>
                <TableRow>
                  {visibleColumns.includes('opportunity') && (<TableHead className="gba:cursor-pointer" onClick={() => handleSort('name')}>Opportunity</TableHead>)}
                  {visibleColumns.includes('investment') && (<TableHead className="gba:cursor-pointer" onClick={() => handleSort('investmentName')}>Investment</TableHead>)}
                  {visibleColumns.includes('saleAmount') && (<TableHead className="gba:cursor-pointer" onClick={() => handleSort('estimatedAmount')}>Sale Amount</TableHead>)}
                  {visibleColumns.includes('status') && (<TableHead className="gba:cursor-pointer" onClick={() => handleSort('opportunityStatus')}>Status</TableHead>)}
                  {visibleColumns.includes('revenue') && (<TableHead className="gba:cursor-pointer" onClick={() => handleSort('revenueAmount')}>Revenue</TableHead>)}
                  {visibleColumns.includes('closeDate') && (<TableHead className="gba:cursor-pointer" onClick={() => handleSort('closeDate')}>Close Date</TableHead>)}
                  {visibleColumns.includes('owner') && (<TableHead className="gba:cursor-pointer" onClick={() => handleSort('ownerEmployee')}>Owner</TableHead>)}
                  {visibleColumns.includes('created') && (<TableHead className="gba:cursor-pointer" onClick={() => handleSort('createdAt')}>Created</TableHead>)}
                  {visibleColumns.includes('actions') && (<TableHead className="gba:w-[60px]">Actions</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {soldOpportunities.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="gba:text-center gba:py-12">
                      <div className="gba:flex gba:flex-col gba:items-center gba:gap-3">
                        <DollarSign className="gba:w-12 gba:h-12 gba:text-gray-400" />
                        <div className="gba:text-gray-600">
                          <p className="gba:font-medium gba:mb-1">
                            {getTranslationFromI18nKeyAndLabel("no_sales_found", "No sales found")}
                          </p>
                          <p className="gba:text-sm">
                            {getTranslationFromI18nKeyAndLabel(
                              "no_sold_opportunities_message", 
                              "No opportunities with 'WON' status found. Successfully closed divestment opportunities will appear here."
                            )}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  soldOpportunities.map((opportunity) => (
                    <TableRow 
                      key={opportunity.id} 
                      className="gba:cursor-pointer" 
                      onClick={() => handleRowClick(opportunity.id)}
                    >
                    {visibleColumns.includes('opportunity') && (<TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Building2 className="gba:w-4 gba:h-4 gba:text-green-600" />
                        <div className="gba:flex gba:flex-col">
                          <span className="gba:font-medium">{opportunity.name}</span>
                          {opportunity.code && (
                            <span className="gba:text-sm gba:text-gray-500">{opportunity.code}</span>
                          )}
                        </div>
                      </div>
                    </TableCell>)}
                    {visibleColumns.includes('investment') && (<TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Target className="gba:w-4 gba:h-4 gba:text-gray-500" />
                        <span>{opportunity.investmentName || opportunity.account?.name || "N/A"}</span>
                      </div>
                    </TableCell>)}
                    {visibleColumns.includes('saleAmount') && (<TableCell>
                      <span className="gba:font-medium gba:text-green-600">
                        {opportunity.estimatedAmount ? formatCurrency(opportunity.estimatedAmount) : "N/A"}
                      </span>
                    </TableCell>)}
                    {visibleColumns.includes('status') && (<TableCell>
                      <Badge variant={getSalesBadgeVariant()}>
                        Sold
                      </Badge>
                    </TableCell>)}
                    {visibleColumns.includes('revenue') && (<TableCell>
                      <div className="gba:flex gba:items-center gba:gap-1">
                        <DollarSign className="gba:w-4 gba:h-4 gba:text-green-600" />
                        <span className="gba:font-medium gba:text-green-600">
                          {opportunity.estimatedAmount ? formatCurrency(opportunity.estimatedAmount) : "N/A"}
                        </span>
                      </div>
                    </TableCell>)}
                    {visibleColumns.includes('closeDate') && (<TableCell>
                      {opportunity.closeDate ? (
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Calendar className="gba:w-4 gba:h-4 gba:text-gray-500" />
                          <span>{formatDate(opportunity.closeDate)}</span>
                        </div>
                      ) : (
                        <span className="gba:text-gray-400">N/A</span>
                      )}
                    </TableCell>)}
                    {visibleColumns.includes('owner') && (<TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <User className="gba:w-4 gba:h-4 gba:text-gray-600" />
                        <span>
                          {opportunity.ownerEmployee?.displayName || 
                           opportunity.ownerEmployee?.firstName && opportunity.ownerEmployee?.lastName
                             ? `${opportunity.ownerEmployee.firstName} ${opportunity.ownerEmployee.lastName}`
                             : "N/A"}
                        </span>
                      </div>
                    </TableCell>)}
                    {visibleColumns.includes('created') && (
                      <TableCell>
                        <span>{formatDate((opportunity as any).createdAt)}</span>
                      </TableCell>
                    )}
                    {visibleColumns.includes('actions') && (<TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="gba:flex gba:justify-start gba:gap-2">
                        <AppActionButton
                          data-testid={`sold-opportunity-update-button-${opportunity.id}`}
                          size="icon"
                          contextsArray={[FlowContextName.investmentOpportunityEntity]}
                          externalContextData={{ opportunityId: opportunity.id }}
                          prefixDataTestId={`sold-opportunity-update`}
                          accessToken={accessToken}
                          emptyStateBehavior="enable"
                          deferMainContextRequestsUntilClick
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </TableCell>)}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        }
      />
    );
  };

  return (
    <div data-testid="sales-container" className="gba:space-y-6">
      {/* Metrics */}
      {renderMetrics()}

      {/* Sales List */}
      {renderSalesTable()}
    </div>
  );
};

export default Sales;
