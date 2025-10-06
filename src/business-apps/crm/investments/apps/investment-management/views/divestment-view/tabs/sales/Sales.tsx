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
  Target
} from "lucide-react";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { DataContainer } from "@/components/layout/dataContainer/DataContainer";
import { ColumnConfig } from "@/components/dataController";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';
import { OwnerDisplay } from "../../../../../../components/shared";
import { formatDate } from "../../utils";

// Custom formatter that only abbreviates millions and billions, not thousands
const formatCurrencyLarge = (amount: number | undefined, currencyCode: string = "EUR"): string => {
  if (amount === undefined || amount === null || !isFinite(amount)) return "-";
  
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  
  if (abs >= 1_000_000_000) {
    // Billions
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 1,
      minimumFractionDigits: 0
    }).format(abs / 1_000_000_000);
    return `${sign}${formatted}B`;
  }
  
  if (abs >= 1_000_000) {
    // Millions
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      maximumFractionDigits: 1,
      minimumFractionDigits: 0
    }).format(abs / 1_000_000);
    return `${sign}${formatted}M`;
  }
  
  // Thousands and below - show as normal currency
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    maximumFractionDigits: 0,
    minimumFractionDigits: 0
  }).format(amount);
};
import { DateRangeFilter } from '@/business-apps/crm/customers/apps/customer-relations/views/lead-view/components/DateRangeFilter';
import { useEmployeeSearch } from '@/common/data/employee/useEmployeeSearch';
import { useGetInvestmentOpportunities } from '@/common/data/investment/hooks/useInvestmentOpportunities';
import type { InvestmentOpportunity } from '@/common/data/investment/types';
import type { InvestmentOpportunityQueryVariables } from '@/common/data/investment/queries/investmentOpportunityQueries';

// Use InvestmentOpportunity directly but extend with display fields
export interface SoldOpportunity extends InvestmentOpportunity {
  displayValue?: string; // Override for "Sold" display
}

export interface SalesMetrics {
  totalSold: number;
  totalRevenue: number;
  averageOpportunityValue: number;
  averageRevenue: number;
  salesThisYear: number;
  salesThisYearChange?: number;
  totalSoldChange?: number;
  totalRevenueChange?: number;
  averageOpportunityValueChange?: number;
  averageRevenueChange?: number;
  averageWinRate?: number;
  winRateChange?: number;
}

interface SalesProps extends BusinessAppContextProps {}

const Sales: React.FC<SalesProps> = ({ accessToken, userInfo }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("closeDate");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  // Close Date range state
  const [closeAfter, setCloseAfter] = useState<string | undefined>(undefined);
  const [closeBefore, setCloseBefore] = useState<string | undefined>(undefined);
  // Owner backend search
  const { employees: employeeOptions, search: searchEmployees, loading: loadingEmployees, error: employeeError } = useEmployeeSearch(accessToken);
  const [accountSearchTerm, setAccountSearchTerm] = useState("");

  // State for sales data
  const [soldOpportunities, setSoldOpportunities] = useState<SoldOpportunity[]>([]);
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const context = { accessToken, userInfo };
  const { fetchInvestmentOpportunities } = useGetInvestmentOpportunities(context);

  // Transform function for sold opportunities
  const transformSoldOpportunityData = (investmentOpportunity: InvestmentOpportunity): SoldOpportunity => {
    return {
      ...investmentOpportunity,
      // Override WON status to display as "Sold"
      displayValue: investmentOpportunity.opportunityStatus?.value === "WON" ? "Sold" : investmentOpportunity.opportunityStatus?.value,
    };
  };

  // Data fetching function using central resources
  const loadPage = useCallback(async (
    page: number,
    pageSize = 20,
    additionalFilters?: any,
    overrideSortField?: string,
    overrideSortOrder?: "ASC" | "DESC" | ""
  ) => {
    if (!accessToken) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build query variables for InvestmentOpportunity
      const variables: InvestmentOpportunityQueryVariables = {
        limit: pageSize,
        offset: (page - 1) * pageSize,
        dealType: "DIVESTMENT_DEAL", // Filter for divestment opportunities
        search: additionalFilters?.search || searchTerm,
        accountSearch: additionalFilters?.accountSearch,
      };

      // Add sorting
      const sortFieldToUse = overrideSortField || sortField;
      const sortOrderToUse = overrideSortOrder || sortOrder;
      
      if (sortFieldToUse && sortFieldToUse !== "" && sortOrderToUse) {
        variables.orderBy = [{
          field: sortFieldToUse,
          direction: sortOrderToUse === "ASC" ? "ASC_NULLS_LAST" : "DESC_NULLS_LAST"
        }];
      }

      // Get current data
      const currentResult = await fetchInvestmentOpportunities(variables);

      // Get historical data (30 days ago)
      const currentDate = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(currentDate.getDate() - 30);

      // Fetch historical data by removing time-based filters and getting larger dataset
      const historicalVariables = { ...variables, limit: 1000, offset: 0 };
      const historicalResult = await fetchInvestmentOpportunities(historicalVariables);

      if (currentResult?.InvestmentOpportunity) {
        // Helper function to filter for WON opportunities
        const filterWonOpportunities = (opportunities: InvestmentOpportunity[]) => {
          return opportunities.filter(opp => {
            const statusValue = opp.opportunityStatus?.value?.toUpperCase();
            const statusCode = opp.opportunityStatus?.code?.toUpperCase();
            const statusAltCode = opp.opportunityStatus?.alternativeCode?.toUpperCase();
            const directStatus = (opp as any).status?.toUpperCase();
            
            // Check for various "WON" representations
            const wonVariations = ["WON", "CLOSED WON", "SOLD", "SUCCESS", "COMPLETED"];
            
            return wonVariations.some(variation => 
              statusValue === variation ||
              statusCode === variation ||
              statusAltCode === variation ||
              directStatus === variation ||
              statusValue?.includes("WON") ||
              statusCode?.includes("WON") ||
              statusAltCode?.includes("WON") ||
              directStatus?.includes("WON")
            );
          });
        };

        // Helper function to calculate metrics for a dataset
        const calculateMetrics = (opportunities: InvestmentOpportunity[], beforeDate?: Date) => {
          let filteredOpportunities = opportunities;
          
          // Filter by date if provided
          if (beforeDate) {
            filteredOpportunities = opportunities.filter(opp => {
              const updatedAt = new Date(opp.updatedAt);
              return updatedAt <= beforeDate;
            });
          }

          const wonOpportunities = filterWonOpportunities(filteredOpportunities);
          const totalValue = wonOpportunities.reduce((sum, opp) => sum + (opp.estimatedAmount || 0), 0);
          const averageValue = wonOpportunities.length > 0 ? totalValue / wonOpportunities.length : 0;
          const averageWinRate = wonOpportunities.length > 0 ? 
            wonOpportunities.reduce((sum, opp) => sum + (opp.probability || 0), 0) / wonOpportunities.length : 0;
          
          // Count sales closed this year (similar to opportunity view "this year" logic)
          const now = new Date();
          const thisYearStart = new Date(now.getFullYear(), 0, 1);
          const salesThisYear = wonOpportunities.filter(opp => {
            if (!opp.closeDate) return false;
            const closeDate = new Date(opp.closeDate);
            return closeDate >= thisYearStart;
          }).length;
          
          return {
            totalSold: wonOpportunities.length,
            totalRevenue: totalValue,
            averageRevenue: averageValue,
            averageOpportunityValue: averageValue,
            averageWinRate,
            salesThisYear,
          };
        };

        // Get WON opportunities for display
        const wonOpportunities = filterWonOpportunities(currentResult.InvestmentOpportunity);
        const transformedOpportunities = wonOpportunities.map(transformSoldOpportunityData);
        setSoldOpportunities(transformedOpportunities);
        setTotal(wonOpportunities.length);

        // Calculate current and historical metrics
        const current = calculateMetrics(currentResult.InvestmentOpportunity);
        const historical = historicalResult?.InvestmentOpportunity ? 
          calculateMetrics(historicalResult.InvestmentOpportunity, thirtyDaysAgo) : 
          { totalSold: 0, totalRevenue: 0, averageRevenue: 0, averageOpportunityValue: 0, averageWinRate: 0, salesThisYear: 0 };

        // Calculate percentage changes
        const calculatePercentageChange = (current: number, previous: number): number => {
          if (previous === 0) return current > 0 ? 100 : 0;
          return ((current - previous) / previous) * 100;
        };

        const totalSoldChange = calculatePercentageChange(current.totalSold, historical.totalSold);
        const totalRevenueChange = calculatePercentageChange(current.totalRevenue, historical.totalRevenue);
        const averageRevenueChange = calculatePercentageChange(current.averageRevenue, historical.averageRevenue);
        const winRateChange = calculatePercentageChange(current.averageWinRate, historical.averageWinRate);

        // Calculate year-over-year change for sales this year
        // Compare sales this year to same period last year
        const now = new Date();
        const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        
        const wonOpportunitiesLastYearSamePeriod = historicalResult?.InvestmentOpportunity 
          ? filterWonOpportunities(historicalResult.InvestmentOpportunity).filter(opp => {
              if (!opp.closeDate) return false;
              const closeDate = new Date(opp.closeDate);
              return closeDate >= lastYearStart && closeDate <= lastYearEnd;
            }).length
          : 0;

        const salesThisYearChange = calculatePercentageChange(current.salesThisYear, wonOpportunitiesLastYearSamePeriod);

        const metricsData: SalesMetrics = {
          ...current,
          totalSoldChange,
          totalRevenueChange,
          averageRevenueChange,
          winRateChange,
          salesThisYearChange,
        };
        setMetrics(metricsData);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to load sales data")
      );
    } finally {
      setLoading(false);
    }
  }, [fetchInvestmentOpportunities, searchTerm, sortField, sortOrder, accessToken]);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  const handleSetFilter = useCallback((filters: string[]) => {
    setSelectedFilters(filters);
    setCurrentPage(1);
  }, []);

  const handlePaginationChange = useCallback((page: number, newPageSize?: number) => {
    setCurrentPage(page);
    if (newPageSize) {
      setPageSize(newPageSize);
    }
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
        accountSearch: accountSearchTerm,
        ownerEmployeeIds: ownerIds,
        closeDateFrom: closeAfter,
        closeDateTo: closeBefore,
      }
    );
  }, [loadPage, currentPage, searchTerm, accountSearchTerm, sortField, sortOrder, selectedFilters, closeAfter, closeBefore]);

  // Listen for process completion events to refresh data
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        // Check for successful completion
        if (event.detail?.resolution === 'success') {
          loadPage(currentPage, pageSize);
          return;
        }
        
        // Check for different event structures
        const response = event.detail?.response;
        if (response?.detail?.resolution === 'success' || 
            response?.opportunity || 
            response?.investment) {
          loadPage(currentPage, pageSize);
          return;
        }
        
        // Check for continue events with payload
        if (event.type === 'com.newwork.process.continue' && event.detail?.payload) {
          loadPage(currentPage, pageSize);
        }
      } catch (err) {
        // Error handling process completion
      }
    };

    // Listen to multiple possible event names for updates
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
  }, [loadPage, currentPage, pageSize]);

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
    { id: 'account', label: 'Account', visible: true },
    { id: 'saleAmount', label: 'Sale Amount', visible: true },
    { id: 'status', label: 'Status', visible: true },
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
    account: 'accountName',
    saleAmount: 'amountRange',
    status: 'opportunityStatus',
    closeDate: 'closeDate',
    owner: 'owner',
    created: 'creationDate',
  };

  const renderMetrics = () => {
    if (!metrics) return null;

    // Helper function to format percentage change
    const formatPercentageChange = (change: number): string => {
      const sign = change >= 0 ? '+' : '';
      return `${sign}${change.toFixed(1)}%`;
    };

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
          value: formatPercentageChange(metrics.totalSoldChange || 0),
          positive: (metrics.totalSoldChange || 0) >= 0,
          description: getTranslationFromI18nKeyAndLabel("vs_last_30_days", "vs last 30 days")
        }
      },
      {
        key: "average-sale-amount",
        title: getTranslationFromI18nKeyAndLabel("average_sale_amount", "Average Sale Amount"),
        value: formatCurrencyLarge(metrics.averageRevenue),
        prefix: <Target className="gba:h-5 gba:w-5 gba:text-purple-600" />,
        color: '#722ed1', // Purple theme for average sale amount
        span: { xs: 24, sm: 12, md: 12, lg: 6 },
        description: getTranslationFromI18nKeyAndLabel("average_amount_per_sale", "Average amount per sale"),
        trend: {
          value: formatPercentageChange(metrics.averageRevenueChange || 0),
          positive: (metrics.averageRevenueChange || 0) >= 0,
          description: getTranslationFromI18nKeyAndLabel("vs_last_30_days", "vs last 30 days")
        }
      },
      {
        key: "total-revenue",
        title: getTranslationFromI18nKeyAndLabel("total_revenue", "Total Revenue"),
        value: formatCurrencyLarge(metrics.totalRevenue),
        prefix: <DollarSign className="gba:h-5 gba:w-5 gba:text-green-600" />,
        color: '#389e0d', // Darker green for revenue
        span: { xs: 24, sm: 12, md: 12, lg: 6 },
        description: getTranslationFromI18nKeyAndLabel("total_revenue_generated", "Total revenue generated from sales"),
        trend: {
          value: formatPercentageChange(metrics.totalRevenueChange || 0),
          positive: (metrics.totalRevenueChange || 0) >= 0,
          description: getTranslationFromI18nKeyAndLabel("vs_last_30_days", "vs last 30 days")
        }
      },
      {
        key: "sales-this-year",
        title: getTranslationFromI18nKeyAndLabel("sales_this_year", "Sales This Year"),
        value: metrics.salesThisYear,
        prefix: <Award className="gba:h-5 gba:w-5 gba:text-blue-600" />,
        color: '#1890ff', // Blue theme
        span: { xs: 24, sm: 12, md: 12, lg: 6 },
        description: getTranslationFromI18nKeyAndLabel("closed_sales_this_year", "Closed sales this year"),
        trend: {
          value: formatPercentageChange(metrics.salesThisYearChange || 0),
          positive: (metrics.salesThisYearChange || 0) >= 0,
          description: getTranslationFromI18nKeyAndLabel("vs_same_period_last_year", "vs same period last year")
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
            <span>Error loading sales: {error?.message || 'Unknown error'}</span>
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
              id: 'accountName',
              title: 'Account',
              filters: [],
              customComponent: React.createElement('input', {
                value: accountSearchTerm,
                onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                  setAccountSearchTerm(e.target.value);
                  setCurrentPage(1);
                },
                placeholder: 'Search account',
                className: 'gba:w-full gba:h-8 gba:px-2 gba:text-sm gba:bg-gray-100/40 gba:rounded gba:border-none gba:outline-none',
                'data-testid': 'sales-account-search-input',
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
                  {visibleColumns.includes('account') && (<TableHead className="gba:cursor-pointer" onClick={() => handleSort('accountName')}>Account</TableHead>)}
                  {visibleColumns.includes('saleAmount') && (<TableHead className="gba:cursor-pointer" onClick={() => handleSort('estimatedAmount')}>Sale Amount</TableHead>)}
                  {visibleColumns.includes('status') && (<TableHead className="gba:cursor-pointer" onClick={() => handleSort('opportunityStatus')}>Status</TableHead>)}
                  {visibleColumns.includes('closeDate') && (<TableHead className="gba:cursor-pointer" onClick={() => handleSort('closeDate')}>Close Date</TableHead>)}
                  {visibleColumns.includes('owner') && (<TableHead className="gba:cursor-pointer" onClick={() => handleSort('ownerEmployee')}>Owner</TableHead>)}
                  {visibleColumns.includes('created') && (<TableHead className="gba:cursor-pointer" onClick={() => handleSort('createdAt')}>Created</TableHead>)}
                  {visibleColumns.includes('actions') && (<TableHead className="gba:w-[60px]">Actions</TableHead>)}
                </TableRow>
              </TableHeader>
              <TableBody>
                {soldOpportunities.length === 0 && !loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="gba:text-center gba:py-12">
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
                        <span>{opportunity.investmentName || "N/A"}</span>
                      </div>
                    </TableCell>)}
                    {visibleColumns.includes('account') && (<TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Building2 className="gba:w-4 gba:h-4 gba:text-gray-500" />
                        <span>{opportunity.account?.name || "N/A"}</span>
                      </div>
                    </TableCell>)}
                    {visibleColumns.includes('saleAmount') && (<TableCell>
                      <span className="gba:font-medium gba:text-green-600">
                        {opportunity.estimatedAmount ? formatCurrencyLarge(opportunity.estimatedAmount) : "N/A"}
                      </span>
                    </TableCell>)}
                    {visibleColumns.includes('status') && (<TableCell>
                      <Badge variant={getSalesBadgeVariant()}>
                        Sold
                      </Badge>
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
                      <OwnerDisplay 
                        ownerEmployee={opportunity.ownerEmployee}
                        entityId={opportunity.id}
                        testIdPrefix="sales-opportunity"
                      />
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
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        />
                      </div>
                    </TableCell>)}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            
            {/* Pagination */}
            <div
              className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-4 gba:border-t"
              data-testid="sales-pagination"
            >
              <div
                className="gba:text-sm gba:text-muted-foreground"
                data-testid="sales-pagination-info"
              >
                {`${(currentPage - 1) * pageSize + 1}-${Math.min(
                  currentPage * pageSize,
                  total
                )} of ${total} sales`}
              </div>
              <div className="gba:flex gba:items-center gba:space-x-6 gba:lg:space-x-8">
                <div className="gba:flex gba:items-center gba:space-x-2">
                  <p className="gba:text-sm gba:font-medium">Rows per page</p>
                  <select
                    value={pageSize}
                    onChange={(e) => handlePaginationChange(1, Number(e.target.value))}
                    className="gba:h-8 gba:w-[70px] gba:rounded gba:border gba:border-input gba:px-3 gba:py-1 gba:text-sm"
                    data-testid="sales-page-size-select"
                  >
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                  </select>
                </div>
                <div
                  className="gba:flex gba:w-[100px] gba:items-center gba:justify-center gba:text-sm gba:font-medium"
                  data-testid="sales-page-info"
                >
                  Page {currentPage} of {Math.ceil(total / pageSize)}
                </div>
                <div className="gba:flex gba:items-center gba:space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePaginationChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    data-testid="sales-prev-page"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePaginationChange(currentPage + 1)}
                    disabled={currentPage >= Math.ceil(total / pageSize)}
                    data-testid="sales-next-page"
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
