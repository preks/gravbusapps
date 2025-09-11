import React, { useState, useEffect, useCallback } from "react";
import { 
  Card,
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
  TrendingUp, 
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
import { AppAction } from "@/components/app-action/AppAction";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';
import { formatCurrency, formatDate } from "../../utils";
import { useGetInvestmentOpportunities, InvestmentOpportunity, InvestmentOpportunityQueryVariables } from "@/common/data/investment";

// Extended interface for sold opportunities with display fields
interface SoldOpportunity extends InvestmentOpportunity {
  displayValue?: string; // Override for "Sold" display
}

interface SalesMetrics {
  totalSold: number;
  totalRevenue: number;
  averageRevenue: number;
  averageWinRate: number;
  // Percentage changes
  totalSoldChange: number;
  totalRevenueChange: number;
  averageRevenueChange: number;
  winRateChange: number;
}

interface SalesProps extends BusinessAppContextProps {}

const Sales: React.FC<SalesProps> = ({ accessToken, userInfo }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("closeDate");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

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
      console.warn("No access token provided for sales data loading");
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
            const directStatus = opp.status?.toUpperCase();
            
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
          
          return {
            totalSold: wonOpportunities.length,
            totalRevenue: totalValue,
            averageRevenue: averageValue,
            averageWinRate,
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
          { totalSold: 0, totalRevenue: 0, averageRevenue: 0, averageWinRate: 0 };

        // Calculate percentage changes
        const calculatePercentageChange = (current: number, previous: number): number => {
          if (previous === 0) return current > 0 ? 100 : 0;
          return ((current - previous) / previous) * 100;
        };

        const totalSoldChange = calculatePercentageChange(current.totalSold, historical.totalSold);
        const totalRevenueChange = calculatePercentageChange(current.totalRevenue, historical.totalRevenue);
        const averageRevenueChange = calculatePercentageChange(current.averageRevenue, historical.averageRevenue);
        const winRateChange = calculatePercentageChange(current.averageWinRate, historical.averageWinRate);

        const metricsData: SalesMetrics = {
          ...current,
          totalSoldChange,
          totalRevenueChange,
          averageRevenueChange,
          winRateChange,
        };
        setMetrics(metricsData);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to load sales data")
      );
      console.error("Error loading sales data:", err);
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

  const handleRowClick = useCallback((opportunityId: string) => {
    const detailsUrl = buildPlatformUrl('/platform/irm/opportunity-record', { 
      opportunityId,
      fromView: 'divestments',
      fromSubView: 'sales'
    });
    navigateTo(detailsUrl);
  }, []);

  useEffect(() => {
    loadPage(currentPage, pageSize);
  }, [loadPage, currentPage, searchTerm, sortField, sortOrder]);

  // Listen for process completion events to refresh data
  useEffect(() => {
    const handleProcessCompletion = (event: any) => {
      try {
        console.log('Sales: Process completion event received:', event.type);
        
        // Check for successful completion
        if (event.detail?.resolution === 'success') {
          console.log('Sales: Process completed successfully, refreshing sales data');
          loadPage(currentPage, pageSize);
          return;
        }
        
        // Check for different event structures
        const response = event.detail?.response;
        if (response?.detail?.resolution === 'success' || 
            response?.opportunity || 
            response?.investment) {
          console.log('Sales: Opportunity/Investment data detected, refreshing sales list');
          loadPage(currentPage, pageSize);
          return;
        }
        
        // Check for continue events with payload
        if (event.type === 'com.newwork.process.continue' && event.detail?.payload) {
          console.log('Sales: Continue event with payload detected, refreshing data');
          loadPage(currentPage, pageSize);
        }
      } catch (err) {
        console.error('Error handling process completion in Sales:', err);
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
          value: formatPercentageChange(metrics.totalSoldChange),
          positive: metrics.totalSoldChange >= 0,
          description: getTranslationFromI18nKeyAndLabel("vs_previous_period", "vs previous period")
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
          value: formatPercentageChange(metrics.averageRevenueChange),
          positive: metrics.averageRevenueChange >= 0,
          description: getTranslationFromI18nKeyAndLabel("vs_previous_period", "vs previous period")
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
          value: formatPercentageChange(metrics.totalRevenueChange),
          positive: metrics.totalRevenueChange >= 0,
          description: getTranslationFromI18nKeyAndLabel("vs_previous_period", "vs previous period")
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
          value: formatPercentageChange(metrics.averageRevenueChange),
          positive: metrics.averageRevenueChange >= 0,
          description: getTranslationFromI18nKeyAndLabel("vs_previous_period", "vs previous period")
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
              contextsArray={[FlowContextName.createOpportunity]}
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
          filterGroups: [],
          onFilterChange: () => {},
        }}
        dataBody={
          <div className="gba:bg-white gba:rounded-lg gba:border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Opportunity</TableHead>
                  <TableHead>Investment</TableHead>
                  <TableHead>Sale Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Close Date</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="gba:w-[60px]">Actions</TableHead>
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
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Building2 className="gba:w-4 gba:h-4 gba:text-green-600" />
                        <div className="gba:flex gba:flex-col">
                          <span className="gba:font-medium">{opportunity.name}</span>
                          {opportunity.code && (
                            <span className="gba:text-sm gba:text-gray-500">{opportunity.code}</span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Target className="gba:w-4 gba:h-4 gba:text-gray-500" />
                        <span>{opportunity.investmentName || opportunity.account?.displayName || "N/A"}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="gba:font-medium gba:text-green-600">
                        {opportunity.estimatedAmount ? formatCurrency(opportunity.estimatedAmount) : "N/A"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getSalesBadgeVariant()}>
                        Sold
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-1">
                        <DollarSign className="gba:w-4 gba:h-4 gba:text-green-600" />
                        <span className="gba:font-medium gba:text-green-600">
                          {opportunity.estimatedAmount ? formatCurrency(opportunity.estimatedAmount) : "N/A"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {opportunity.closeDate ? (
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Calendar className="gba:w-4 gba:h-4 gba:text-gray-500" />
                          <span>{formatDate(opportunity.closeDate)}</span>
                        </div>
                      ) : (
                        <span className="gba:text-gray-400">N/A</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <User className="gba:w-4 gba:h-4 gba:text-gray-600" />
                        <span>
                          {opportunity.ownerEmployee?.displayName || 
                           opportunity.ownerEmployee?.firstName && opportunity.ownerEmployee?.lastName
                             ? `${opportunity.ownerEmployee.firstName} ${opportunity.ownerEmployee.lastName}`
                             : "N/A"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
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
                    </TableCell>
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
