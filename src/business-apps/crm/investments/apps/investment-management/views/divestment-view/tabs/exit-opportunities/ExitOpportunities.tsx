import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@newwork/nw-design-system";
import { WidgetGroup, WidgetItem } from "@/components/widget-group";
import { List, Grid3X3, Search, TrendingUp, DollarSign, Target, CheckCircle } from "lucide-react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { OpportunityBoard } from "@/business-apps/crm/investments/apps/investment-relations/views/opportunity-view/components/opportunity-board/OpportunityBoard";
import { getTranslationFromI18nKeyAndLabel } from "@/common/utils/windowUtils";
import { DebouncedInput } from "@/components/data-filter";
import { useExitOpportunitiesData } from "./hooks/useExitOpportunitiesData";
import { OpportunityList } from "@/business-apps/crm/investments/apps/investment-relations/views/opportunity-view/components/OpportunityList";

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
  const pageSize = 20;

  const context = { accessToken, userInfo };

  const {
    opportunities,
    metrics,
    total,
    loading,
    error,
    loadPage,
  } = useExitOpportunitiesData({
    search: searchTerm,
    sortField,
    sortOrder,
    context,
    statusFilter: "active", // Exclude WON opportunities (those are for Sales tab)
  });

  // Helper function to format currency
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  useEffect(() => {
    loadPage(currentPage, pageSize);
  }, [loadPage, currentPage, searchTerm, sortField, sortOrder]);

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
          value: `${metrics.totalCount} ${getTranslationFromI18nKeyAndLabel("active", "active")}`,
          positive: true,
          description: getTranslationFromI18nKeyAndLabel("ready_for_divestment", "ready for divestment")
        }
      },
      {
        key: "total-value",
        title: getTranslationFromI18nKeyAndLabel("total_value", "Total Value"),
        value: formatCurrency(metrics.totalValue),
        prefix: <DollarSign className="gba:h-5 gba:w-5 gba:text-green-600" />,
        color: '#52c41a', // Green theme for value
        span: { xs: 24, sm: 12, md: 12, lg: 6 },
        description: getTranslationFromI18nKeyAndLabel("estimated_opportunity_value", "Estimated opportunity value"),
        trend: {
          value: formatCurrency(metrics.totalValue),
          positive: true,
          description: getTranslationFromI18nKeyAndLabel("total_pipeline", "total pipeline")
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
          value: formatCurrency(metrics.averageValue),
          positive: true,
          description: getTranslationFromI18nKeyAndLabel("per_opportunity", "per opportunity")
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
          value: `${metrics.averageWinRate.toFixed(1)}% ${getTranslationFromI18nKeyAndLabel("win_rate", "win rate")}`,
          positive: metrics.averageWinRate > 50,
          description: getTranslationFromI18nKeyAndLabel("conversion_rate", "conversion rate")
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

  const renderOpportunityList = () => (
    <OpportunityList
      opportunities={opportunities}
      isLoading={loading}
      totalCount={total}
      currentPage={currentPage}
      pageSize={pageSize}
      onPageChange={setCurrentPage}
      onSort={handleSort}
      sortField={sortField}
      sortOrder={sortOrder || "ASC"}
      accessToken={accessToken}
      userInfo={userInfo}
    />
  );

  return (
    <div data-testid="exit-opportunities-container" className="gba:space-y-6">
      <div className="gba:border-b gba:border-gray-200 gba:pb-6">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
          <div>
            <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900">
              {getTranslationFromI18nKeyAndLabel("exit_opportunities", "Exit Opportunities")}
            </h2>
            <p className="gba:text-sm gba:text-gray-600 gba:mt-1">
              {getTranslationFromI18nKeyAndLabel(
                "exit_opportunities_description", 
                "Opportunities assigned to investments planned for exit"
              )}
            </p>
          </div>
        </div>

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
            <div className="gba:mb-6">
              <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
                <h3 className="gba:text-lg gba:font-semibold gba:text-gray-900">
                  {getTranslationFromI18nKeyAndLabel("exit_opportunities_list", "Exit Opportunities List")}
                </h3>
                <div className="gba:relative gba:w-80">
                  <Search className="gba:absolute gba:left-3 gba:top-1/2 gba:transform gba:-translate-y-1/2 gba:h-4 gba:w-4 gba:text-gray-400" />
                  <DebouncedInput
                    placeholder={getTranslationFromI18nKeyAndLabel(
                      "search_opportunities",
                      "Search opportunities..."
                    )}
                    value={searchTerm}
                    onChange={setSearchTerm}
                    className="gba:w-full gba:pl-10 gba:pr-4 gba:py-2 gba:border gba:border-gray-300 gba:rounded-md gba:focus:ring-2 gba:focus:ring-blue-500 gba:focus:border-blue-500"
                    data-testid="exit-opportunities-search"
                  />
                </div>
              </div>
              <p className="gba:text-sm gba:text-gray-600 gba:mb-4">
                {getTranslationFromI18nKeyAndLabel(
                  "exit_opportunities_list_desc",
                  "List of all active opportunities related to investments planned for exit"
                )}
              </p>
            </div>
            {renderOpportunityList()}
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
              dealType="DINVESTMENT_DEAL"
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ExitOpportunities;
