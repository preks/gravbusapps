import React, { useState, useEffect, useCallback } from "react";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger,
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
  List, 
  Grid3X3, 
  TrendingUp, 
  DollarSign, 
  Target, 
  CheckCircle, 
  Building2, 
  Calendar, 
  User,
  Phone,
  Award
} from "lucide-react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { DataContainer } from "@/components/layout/dataContainer/DataContainer";
import { AppAction } from "@/components/app-action/AppAction";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { OpportunityBoard } from "@/business-apps/crm/investments/apps/investment-relations/views/opportunity-view/components/opportunity-board/OpportunityBoard";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils';
import { formatCurrency, formatDate } from "../../utils";
import { useGetInvestmentOpportunities, InvestmentOpportunity, InvestmentOpportunityQueryVariables } from "@/common/data/investment";

interface ExitOpportunitiesMetrics {
  totalCount: number;
  totalValue: number;
  averageValue: number;
  averageWinRate: number;
  totalWonValue: number;
  wonCount: number;
  // Percentage changes
  countChange: number;
  totalValueChange: number;
  averageValueChange: number;
  winRateChange: number;
}

interface ExitOpportunitiesProps extends BusinessAppContextProps {
  initialSubTab?: string;
  onSubTabChange?: (subTab: string) => void;
}

const ExitOpportunities: React.FC<ExitOpportunitiesProps> = ({
  accessToken,
  userInfo,
  initialSubTab = "list",
  onSubTabChange,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("DESC");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  // State for exit opportunities data
  const [opportunities, setOpportunities] = useState<InvestmentOpportunity[]>([]);
  const [metrics, setMetrics] = useState<ExitOpportunitiesMetrics | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const context = { accessToken, userInfo };
  const { fetchInvestmentOpportunities } = useGetInvestmentOpportunities(context);

  // Data fetching function using central resources
  const loadPage = useCallback(async (
    page: number,
    pageSize = 20,
    additionalFilters?: any,
    overrideSortField?: string,
    overrideSortOrder?: "ASC" | "DESC" | ""
  ) => {
    if (!accessToken) {
      console.warn("No access token provided for exit opportunities data loading");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build query variables for InvestmentOpportunity
      const variables: InvestmentOpportunityQueryVariables = {
        limit: pageSize,
        offset: (page - 1) * pageSize,
        dealType: "DIVESTMENT_DEAL", // Filter for divestment opportunities using dealType
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
        setOpportunities(currentResult.InvestmentOpportunity);
        
        const totalCount = currentResult.InvestmentOpportunityAggregate?.aggregate?.count || 0;
        setTotal(totalCount);

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

          const totalValue = filteredOpportunities.reduce((sum, opp) => sum + (opp.estimatedAmount || 0), 0);
          const averageValue = filteredOpportunities.length > 0 ? totalValue / filteredOpportunities.length : 0;
          
          // For won opportunities, check status
          const wonOpportunities = filteredOpportunities.filter(opp => 
            opp.opportunityStatus?.alternativeCode?.toUpperCase() === "WON" ||
            opp.opportunityStatus?.value?.toUpperCase() === "WON"
          );
          
          return {
            totalCount: filteredOpportunities.length,
            totalValue,
            averageValue,
            averageWinRate: filteredOpportunities.length > 0 ? 
              filteredOpportunities.reduce((sum, opp) => sum + (opp.probability || 0), 0) / filteredOpportunities.length : 0,
            wonCount: wonOpportunities.length,
            totalWonValue: wonOpportunities.reduce((sum, opp) => sum + (opp.estimatedAmount || 0), 0),
          };
        };

        // Calculate current and historical metrics
        const current = calculateMetrics(currentResult.InvestmentOpportunity);
        const historical = historicalResult?.InvestmentOpportunity ? 
          calculateMetrics(historicalResult.InvestmentOpportunity, thirtyDaysAgo) : 
          { totalCount: 0, totalValue: 0, averageValue: 0, averageWinRate: 0, wonCount: 0, totalWonValue: 0 };

        // Calculate percentage changes
        const calculatePercentageChange = (current: number, previous: number): number => {
          if (previous === 0) return current > 0 ? 100 : 0;
          return ((current - previous) / previous) * 100;
        };

        const countChange = calculatePercentageChange(current.totalCount, historical.totalCount);
        const totalValueChange = calculatePercentageChange(current.totalValue, historical.totalValue);
        const averageValueChange = calculatePercentageChange(current.averageValue, historical.averageValue);
        const winRateChange = calculatePercentageChange(current.averageWinRate, historical.averageWinRate);

        const metricsData: ExitOpportunitiesMetrics = {
          ...current,
          countChange,
          totalValueChange,
          averageValueChange,
          winRateChange,
        };
        setMetrics(metricsData);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to load exit opportunities")
      );
      console.error("Error loading exit opportunities:", err);
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
      fromSubView: 'exit-opportunities'
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
        console.log('ExitOpportunities: Process completion event received:', event.type);
        
        // Check for successful completion
        if (event.detail?.resolution === 'success') {
          console.log('ExitOpportunities: Process completed successfully, refreshing exit opportunities data');
          loadPage(currentPage, pageSize);
          return;
        }
        
        // Check for different event structures
        const response = event.detail?.response;
        if (response?.detail?.resolution === 'success' || 
            response?.opportunity || 
            response?.investment) {
          console.log('ExitOpportunities: Opportunity/Investment data detected, refreshing exit opportunities list');
          loadPage(currentPage, pageSize);
          return;
        }
        
        // Check for continue events with payload
        if (event.type === 'com.newwork.process.continue' && event.detail?.payload) {
          console.log('ExitOpportunities: Continue event with payload detected, refreshing data');
          loadPage(currentPage, pageSize);
        }
      } catch (err) {
        console.error('Error handling process completion in ExitOpportunities:', err);
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

  const handleTabChange = (value: string) => {
    onSubTabChange?.(value);
  };

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
        key: "total-opportunities",
        title: getTranslationFromI18nKeyAndLabel("total_opportunities", "Total Opportunities"),
        value: metrics.totalCount,
        prefix: <TrendingUp className="gba:h-5 gba:w-5 gba:text-blue-600" />,
        color: '#1890ff', // Blue theme for opportunities
        span: { xs: 24, sm: 12, md: 12, lg: 6 },
        description: getTranslationFromI18nKeyAndLabel("active_exit_opportunities", "Active exit opportunities"),
        trend: {
          value: formatPercentageChange(metrics.countChange),
          positive: metrics.countChange >= 0,
          description: getTranslationFromI18nKeyAndLabel("vs_previous_period", "vs previous period")
        }
      },
      {
        key: "total-value",
        title: getTranslationFromI18nKeyAndLabel("total_value", "Total Value"),
        value: formatCurrency(metrics.totalValue),
        prefix: <TrendingUp className="gba:h-5 gba:w-5 gba:text-green-600" />,
        color: '#52c41a', // Green theme for value
        span: { xs: 24, sm: 12, md: 12, lg: 6 },
        description: getTranslationFromI18nKeyAndLabel("estimated_opportunity_value", "Estimated opportunity value"),
        trend: {
          value: formatPercentageChange(metrics.totalValueChange),
          positive: metrics.totalValueChange >= 0,
          description: getTranslationFromI18nKeyAndLabel("vs_previous_period", "vs previous period")
        }
      },
      {
        key: "average-value",
        title: getTranslationFromI18nKeyAndLabel("average_value", "Average Value"),
        value: formatCurrency(metrics.averageValue),
        prefix: <Target className="gba:h-5 gba:w-5 gba:text-purple-600" />,
        color: '#722ed1', // Purple theme for averages
        span: { xs: 24, sm: 12, md: 12, lg: 6 },
        description: getTranslationFromI18nKeyAndLabel("average_opportunity_size", "Average opportunity size"),
        trend: {
          value: formatPercentageChange(metrics.averageValueChange),
          positive: metrics.averageValueChange >= 0,
          description: getTranslationFromI18nKeyAndLabel("vs_previous_period", "vs previous period")
        }
      },
      {
        key: "average-win-rate",
        title: getTranslationFromI18nKeyAndLabel("average_win_rate", "Average Win Rate"),
        value: `${metrics.averageWinRate.toFixed(1)}%`,
        prefix: <CheckCircle className="gba:h-5 gba:w-5 gba:text-orange-600" />,
        color: '#fa8c16', // Orange theme for win rate
        span: { xs: 24, sm: 12, md: 12, lg: 6 },
        description: getTranslationFromI18nKeyAndLabel("success_probability", "Success probability"),
        trend: {
          value: formatPercentageChange(metrics.winRateChange),
          positive: metrics.winRateChange >= 0,
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
        data-testid="exit-opportunities-metrics"
      />
    );
  };

  // Helper function to get status badge variant
  const getStatusBadgeVariant = (status?: string): "default" | "secondary" | "destructive" | "outline" => {
    if (!status) return "outline";
    const statusLower = status.toLowerCase();
    if (statusLower.includes('active') || statusLower.includes('open')) return "default";
    if (statusLower.includes('won') || statusLower.includes('success')) return "secondary";
    if (statusLower.includes('lost') || statusLower.includes('failed')) return "destructive";
    return "outline";
  };

  // Helper function to get stage badge variant
  const getStageBadgeVariant = (stage?: string): "default" | "secondary" | "destructive" | "outline" => {
    if (!stage) return "outline";
    const stageLower = stage.toLowerCase();
    if (stageLower.includes('discovery')) return "default";
    if (stageLower.includes('qualification')) return "secondary";
    if (stageLower.includes('negotiation')) return "default";
    return "outline";
  };

  const renderOpportunityTable = () => {
    if (loading && opportunities.length === 0) {
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
            <span>Error loading exit opportunities: {error?.message || 'Unknown error'}</span>
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
                <span>Exit Opportunities</span>
                <span className="gba:text-gray-500">({total})</span>
              </div>
            </div>
          ),
          actions: (
            <AppAction
              contextsArray={[FlowContextName.createOpportunity]}
              accessToken={accessToken}
              data-testid="exit-opportunities-add-action"
              emptyStateBehavior="hide"
            >
              <button
                className="gba:flex gba:flex-row gba:justify-center gba:items-center gba:px-3 gba:py-0 gba:h-8 gba:rounded gba:gap-1"
                data-testid="exit-opportunities-add-action"
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
                  <TableHead>Amount</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Probability</TableHead>
                  <TableHead>Close Date</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="gba:w-[60px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {opportunities.map((opportunity) => (
                  <TableRow 
                    key={opportunity.id} 
                    className="gba:cursor-pointer" 
                    onClick={() => handleRowClick(opportunity.id)}
                  >
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Building2 className="gba:w-4 gba:h-4 gba:text-gray-500" />
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
                      <span className="gba:font-medium">
                        {opportunity.estimatedAmount ? formatCurrency(opportunity.estimatedAmount) : "N/A"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStageBadgeVariant(opportunity.opportunityPipelineStage?.value)}>
                        {opportunity.opportunityPipelineStage?.value || opportunity.stage?.value || "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(opportunity.opportunityStatus?.value)}>
                        {opportunity.opportunityStatus?.value || "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-1">
                        <Award className="gba:w-4 gba:h-4 gba:text-gray-500" />
                        <span>{opportunity.probability ? `${opportunity.probability}%` : "N/A"}</span>
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
                          data-testid={`exit-opportunity-update-button-${opportunity.id}`}
                          size="icon"
                          contextsArray={[FlowContextName.investmentOpportunityEntity]}
                          externalContextData={{ opportunityId: opportunity.id }}
                          prefixDataTestId={`exit-opportunity-update`}
                          accessToken={accessToken}
                          emptyStateBehavior="enable"
                          deferMainContextRequestsUntilClick
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        }
      />
    );
  };

  return (
    <div data-testid="exit-opportunities-container" className="gba:space-y-6">
      {/* Metrics */}
      {renderMetrics()}

      <Tabs value={initialSubTab} onValueChange={handleTabChange} className="gba:mt-6">
        <TabsList className="gba:grid gba:w-full gba:max-w-md gba:grid-cols-2">
          <TabsTrigger 
            value="list" 
            className="gba:flex gba:items-center gba:gap-2"
            data-testid="exit-opportunities-list-tab"
          >
            <List className="gba:h-4 gba:w-4" />
            {getTranslationFromI18nKeyAndLabel("list_view", "List View")}
          </TabsTrigger>
          <TabsTrigger 
            value="board" 
            className="gba:flex gba:items-center gba:gap-2"
            data-testid="exit-opportunities-board-tab"
          >
            <Grid3X3 className="gba:h-4 gba:w-4" />
            {getTranslationFromI18nKeyAndLabel("board_view", "Board View")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="gba:mt-6">
          {renderOpportunityTable()}
        </TabsContent>

        <TabsContent value="board" className="gba:mt-6">
          <div className="gba:mb-4">
            <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900 gba:mb-2">
              {getTranslationFromI18nKeyAndLabel("exit_opportunities_board", "Exit Opportunities Board")}
            </h3>
            <p className="gba:text-sm gba:text-gray-600">
              {getTranslationFromI18nKeyAndLabel(
                "exit_opportunities_board_desc",
                "Kanban board view of opportunities related to investments planned for exit"
              )}
            </p>
          </div>
          <OpportunityBoard
            accessToken={accessToken}
            userInfo={userInfo}
            dealType="DIVESTMENT_DEAL"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExitOpportunities;
