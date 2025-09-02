import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@newwork/nw-design-system";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import {
  TrophyOutlined,
  BankOutlined,
  DollarCircleOutlined,
  ContactsOutlined,
  PercentageOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { WidgetGroup } from "@/components/widget-group";
import { useKpiTrendData } from "./hooks/useKpiTrendData";
import { useRevenueTrends, TimeFilter } from "./hooks/useRevenueTrends";
import { usePipelineHealth } from "./hooks/usePipelineHealth";
import { useActivityHeatmap } from "./hooks/useActivityHeatmap";
import { useGeographicDistribution } from "./hooks/useGeographicDistribution";
import { RevenueTrendChart } from "./components/RevenueTrendChart";
import { ActivityHeatmapChart } from "./components/ActivityHeatmapChart";
import { GeographicChart } from "./components/GeographicChart";
import { OverviewAnalytics } from "../../types/analyticsTypes"; // Use OverviewAnalytics instead

interface OverviewTabProps extends BusinessAppContextProps {
  data: OverviewAnalytics; // Change to OverviewAnalytics
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  data,
  ...context
}) => {
  const [selectedPipelineId, setSelectedPipelineId] = useState<
    string | undefined
  >(undefined);
  const [isLargeScreen, setIsLargeScreen] = useState(false);
  const [revenueTimeFilter, setRevenueTimeFilter] =
    useState<TimeFilter>("sixMonths");

  // Check screen size for responsive layout
  useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 1280); // xl breakpoint is 1280px
    };

    checkScreenSize();
    window.addEventListener("resize", checkScreenSize);
    return () => window.removeEventListener("resize", checkScreenSize);
  }, []);

  // Use custom hooks for data fetching
  const { trendData, isLoading: trendLoading } = useKpiTrendData(
    context.accessToken
  );
  const { revenueTrends, isLoading: revenueLoading } = useRevenueTrends(
    context.accessToken,
    revenueTimeFilter,
    selectedPipelineId
  );
  const {
    pipelineHealth,
    isLoading: pipelineLoading,
    error: pipelineError,
  } = usePipelineHealth(context.accessToken, selectedPipelineId);
  const { activityData, isLoading: activityLoading } = useActivityHeatmap(
    context.accessToken
  );
  const { geographicData, isLoading: geographicLoading } =
    useGeographicDistribution(context.accessToken);

  const handlePipelineChange = (pipelineId: string | undefined) => {
    setSelectedPipelineId(pipelineId);
  };

  const handleRevenueTimeFilterChange = (timeFilter: TimeFilter) => {
    setRevenueTimeFilter(timeFilter);
  };

  // Add comprehensive null checking for data - check OverviewAnalytics properties directly
  if (!data || !data.totalCounts || !data.conversionMetrics) {
    return (
      <div
        className="gba:space-y-6"
        data-testid="overview-analytics-tab-loading"
      >
        <div className="gba:text-center gba:py-12">
          <div className="gba:animate-pulse gba:text-gray-500">
            Loading overview analytics...
          </div>
        </div>
      </div>
    );
  }

  // Helper function to calculate trend
  const calculateTrend = (current: number, previous: number) => {
    if (previous === 0)
      return { value: "0%", positive: true, description: "No previous data" };
    const change = ((current - previous) / previous) * 100;
    return {
      value: `${Math.abs(change).toFixed(1)}%`,
      positive: change >= 0,
      description: `${change >= 0 ? "Increase" : "Decrease"} from last period`,
    };
  };

  // Widget configuration for key metrics - access data directly
  const keyMetricsWidgets = [
    {
      key: "total-leads",
      title: "Total Leads",
      value: data.totalCounts.leads, // Remove .overview
      prefix: <UserOutlined />,
      description: "Active leads in system",
      ...(trendData && !trendLoading
        ? {
            trend: calculateTrend(
              trendData.totalLeadsThisMonth,
              trendData.totalLeadsLastMonth
            ),
          }
        : {}),
    },
    {
      key: "total-accounts",
      title: "Total Accounts",
      value: data.totalCounts.accounts, // Remove .overview
      prefix: <BankOutlined />,
      description: "Active accounts in system",
      ...(trendData && !trendLoading
        ? {
            trend: calculateTrend(
              trendData.totalAccountsThisMonth,
              trendData.totalAccountsLastMonth
            ),
          }
        : {}),
    },
    {
      key: "total-opportunities",
      title: "Total Opportunities",
      value: data.totalCounts.opportunities, // Remove .overview
      prefix: <DollarCircleOutlined />,
      description: "Active opportunities in pipeline",
      ...(trendData && !trendLoading
        ? {
            trend: calculateTrend(
              trendData.totalOpportunitiesThisMonth,
              trendData.totalOpportunitiesLastMonth
            ),
          }
        : {}),
    },
    {
      key: "total-contacts",
      title: "Total Contacts",
      value: data.totalCounts.contacts, // Remove .overview
      prefix: <ContactsOutlined />,
      description: "Active contacts in system",
      ...(trendData && !trendLoading
        ? {
            trend: calculateTrend(
              trendData.totalContactsThisMonth,
              trendData.totalContactsLastMonth
            ),
          }
        : {}),
    },
  ];

  // Conversion metrics widgets - access data directly
  const conversionWidgets = [
    {
      key: "lead-conversion-rate",
      title: "Lead to Opportunity Rate",
      value: `${data.conversionMetrics.leadToOpportunityRate}%`, // Remove .overview
      valueIsString: true,
      prefix: <PercentageOutlined />,
      description: "Lead conversion efficiency",
    },
    {
      key: "opportunity-win-rate",
      title: "Opportunity Win Rate",
      value: `${data.conversionMetrics.opportunityWinRate}%`, // Remove .overview
      valueIsString: true,
      prefix: <TrophyOutlined />,
      description: "Deal closing success rate",
      ...(trendData && !trendLoading
        ? {
            trend: calculateTrend(
              trendData.currentMonthWonOpportunities,
              trendData.previousMonthWonOpportunities
            ),
          }
        : {}),
    },
    {
      key: "avg-deal-size",
      title: "Avg Deal Size",
      value: data.conversionMetrics.avgDealSize, // Remove .overview
      prefix: <DollarCircleOutlined />,
      description: "Average opportunity value",
      valueFormatter: (value: number) =>
        new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(value),
    },
    {
      key: "sales-cycle-length",
      title: "Sales Cycle Length",
      value: `${data.conversionMetrics.salesCycleLength} days`, // Remove .overview
      valueIsString: true,
      prefix: <UserOutlined />,
      description: "Average time to close deals",
    },
  ];

  // Combine all KPIs into a single widget group
  const allKpiWidgets = [...keyMetricsWidgets, ...conversionWidgets];

  return (
    <div className="gba:space-y-6" data-testid="overview-analytics-tab">
      {/* KPI Widgets */}
      <div>
        <h2 className="gba:text-2xl gba:font-bold gba:mb-4">CRM Overview</h2>
        <WidgetGroup
          widgets={allKpiWidgets}
          isLoading={trendLoading}
          data-testid="overview-all-kpis"
        />
      </div>

      {/* Revenue Trends - Full Width */}
      <RevenueTrendChart
        data={revenueTrends}
        isLoading={revenueLoading}
        selectedTimeFilter={revenueTimeFilter}
        onTimeFilterChange={handleRevenueTimeFilterChange}
        accessToken={context.accessToken}
        selectedPipelineId={selectedPipelineId}
        onPipelineChange={handlePipelineChange}
      />

      {/* Analytics Charts Grid (Pipeline Health & Geographic Distribution) */}
      <div
        className="gba:flex gba:gap-6"
        style={{
          display: "flex",
          flexDirection: isLargeScreen ? "row" : "column",
          gap: "24px",
        }}
        data-testid="analytics-charts-container"
      >
        {/* Pipeline Health Metrics - Takes 2/3 width on large screens */}
        <div
          className="gba:min-w-0"
          style={{
            width: isLargeScreen ? "66.666667%" : "100%",
            minWidth: 0,
          }}
          data-testid="pipeline-health-container"
        >
          <Card className="gba:h-full">
            <CardHeader>
              <CardTitle>Pipeline Health Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {pipelineLoading ? (
                <div className="gba:flex gba:items-center gba:justify-center gba:h-32">
                  <div className="gba:text-gray-500">Loading pipeline health...</div>
                </div>
              ) : pipelineError ? (
                <div className="gba:text-red-500 gba:text-center gba:py-4">
                  Error loading pipeline health
                </div>
              ) : pipelineHealth ? (
                <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                  <div className="gba:text-center">
                    <div className="gba:text-3xl gba:font-bold gba:text-blue-600">
                      {pipelineHealth.healthScore}%
                    </div>
                    <div className="gba:text-sm gba:text-gray-600">Health Score</div>
                  </div>
                  <div className="gba:text-center">
                    <div className="gba:text-3xl gba:font-bold gba:text-green-600">
                      {pipelineHealth.totalOpportunities}
                    </div>
                    <div className="gba:text-sm gba:text-gray-600">Total Opportunities</div>
                  </div>
                  <div className="gba:text-center">
                    <div className="gba:text-3xl gba:font-bold gba:text-orange-600">
                      {pipelineHealth.avgOpportunityAge}d
                    </div>
                    <div className="gba:text-sm gba:text-gray-600">Avg Age</div>
                  </div>
                  <div className="gba:text-center">
                    <div className="gba:text-3xl gba:font-bold gba:text-purple-600">
                      {pipelineHealth.avgWinningChance}%
                    </div>
                    <div className="gba:text-sm gba:text-gray-600">Avg Win Rate</div>
                  </div>
                </div>
              ) : (
                <div className="gba:text-center gba:py-4 gba:text-gray-500">
                  No pipeline health data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Geographic Distribution - Takes 1/3 width on large screens */}
        <div
          className="gba:min-w-0"
          style={{
            width: isLargeScreen ? "33.333333%" : "100%",
            minWidth: 0,
          }}
          data-testid="geographic-chart-container"
        >
          <GeographicChart
            data={geographicData}
            isLoading={geographicLoading}
          />
        </div>
      </div>

      {/* Activity Heatmap */}
      <div className="gba:grid gba:grid-cols-1 xl:gba:grid-cols-1 gba:gap-6">
        <ActivityHeatmapChart data={activityData} isLoading={activityLoading} />
      </div>

      {/* Top Performers Section */}
      <Card data-testid="top-performers-section">
        <CardContent className="gba:p-6">
          <h3 className="gba:text-lg gba:font-semibold gba:mb-4 gba:flex gba:items-center gba:gap-2">
            <TrophyOutlined />
            Top Performers
          </h3>
          {data.topPerformers.length > 0 ? (
            <div className="gba:space-y-3">
              {data.topPerformers.map((performer: any, index: number) => (
                <div
                  key={performer.employeeId}
                  className="gba:flex gba:items-center gba:justify-between gba:p-4 gba:border gba:rounded-lg gba:hover:bg-gray-50 gba:transition-colors"
                  data-testid={`top-performer-${index}`}
                >
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <div className="gba:flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:bg-blue-100 gba:text-blue-600 gba:rounded-full gba:font-bold gba:text-sm">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="gba:font-medium">
                        {performer.employeeName}
                      </div>
                      <div className="gba:text-sm gba:text-gray-600">
                        {performer.dealsWon} deals won
                      </div>
                    </div>
                  </div>
                  <div className="gba:text-right">
                    <div className="gba:font-bold gba:text-lg">
                      ${performer.totalValue.toLocaleString()}
                    </div>
                    <div className="gba:text-sm gba:text-gray-600">
                      Total Value
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="gba:text-center gba:text-gray-500 gba:py-12">
              <TrophyOutlined className="gba:text-4xl gba:mb-4 gba:opacity-50" />
              <p>No performance data available</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};


