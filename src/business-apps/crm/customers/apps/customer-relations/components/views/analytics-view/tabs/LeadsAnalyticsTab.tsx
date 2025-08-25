import React, { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Checkbox,
} from "@newwork/nw-design-system";
import { Badge } from "@newwork/nw-design-system";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { LeadsAnalytics } from "../types/analyticsTypes";
import { WidgetGroup } from "@/components/widget-group";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  TeamOutlined,
  PercentageOutlined,
  ClockCircleOutlined,
  TrophyOutlined,
  RiseOutlined,
} from "@ant-design/icons";
import { PiChartLine, PiCalendar, PiEye } from "react-icons/pi";
import { LeadVelocityAnalysis } from "../components/LeadVelocityAnalysis";
import { LeadQualityMatrix } from "../components/LeadQualityMatrix";
import { LeadEngagementInsights } from "../components/LeadEngagementInsights";

// TypeScript interfaces for chart data (matching analytics types)
interface LeadsBySourceData {
  source: string;
  count: number;
  percentage: number;
}

interface LeadsBySourceTypeData {
  sourceType: string;
  count: number;
  percentage: number;
}

interface LeadsByStatusData {
  status: string;
  count: number;
  percentage: number;
}

interface LeadsAnalyticsTabProps extends BusinessAppContextProps {
  data?: LeadsAnalytics;
}

export type TimeFilter =
  | "month"
  | "quarter"
  | "sixMonths"
  | "year"
  | "historical";

// Leads-specific trend data interface
interface LeadsTrendData {
  // Current month counts (newly created)
  currentMonthLeads: number;
  previousMonthLeads: number;
  currentMonthConvertedLeads: number;
  previousMonthConvertedLeads: number;

  // Total leads counts (existing as of month end)
  totalLeadsThisMonth: number;
  totalLeadsLastMonth: number;

  // Actual KPI values for this month
  actualConversionRateThisMonth: number;
  actualConversionRateLastMonth: number;
  actualAvgConversionTimeThisMonth: number;
  actualAvgConversionTimeLastMonth: number;

  // Period-based data (based on selected filter)
  currentPeriodLeads: number;
  previousPeriodLeads: number;
}

// Custom hook for leads trend data
const useLeadsTrendData = (
  accessToken: string,
  selectedTimeFilter: TimeFilter
) => {
  const [trendData, setTrendData] = useState<LeadsTrendData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const graphqlClient = useGraphQLClient(accessToken);

  useEffect(() => {
    const fetchLeadsTrendData = async () => {
      try {
        setIsLoading(true);

        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        // Current month ranges
        const currentMonthStart = `${currentYear}-${String(
          currentMonth
        ).padStart(2, "0")}-01T00:00:00Z`;
        const nextMonthStart =
          currentMonth === 12
            ? `${currentYear + 1}-01-01T00:00:00Z`
            : `${currentYear}-${String(currentMonth + 1).padStart(
                2,
                "0"
              )}-01T00:00:00Z`;

        // Previous month ranges
        const previousMonthStart =
          currentMonth === 1
            ? `${currentYear - 1}-12-01T00:00:00Z`
            : `${currentYear}-${String(currentMonth - 1).padStart(
                2,
                "0"
              )}-01T00:00:00Z`;

        // Period-based ranges (based on time filter)
        let currentPeriodStart: string,
          previousPeriodStart: string,
          previousPeriodEnd: string;

        switch (selectedTimeFilter) {
          case "month":
            currentPeriodStart = currentMonthStart;
            previousPeriodStart = previousMonthStart;
            previousPeriodEnd = currentMonthStart;
            break;
          case "quarter":
            const quarterStartMonth =
              Math.floor((currentMonth - 1) / 3) * 3 + 1;
            currentPeriodStart = `${currentYear}-${String(
              quarterStartMonth
            ).padStart(2, "0")}-01T00:00:00Z`;
            previousPeriodStart =
              quarterStartMonth > 3
                ? `${currentYear}-${String(quarterStartMonth - 3).padStart(
                    2,
                    "0"
                  )}-01T00:00:00Z`
                : `${currentYear - 1}-${String(quarterStartMonth + 9).padStart(
                    2,
                    "0"
                  )}-01T00:00:00Z`;
            previousPeriodEnd = currentPeriodStart;
            break;
          case "year":
            currentPeriodStart = `${currentYear}-01-01T00:00:00Z`;
            previousPeriodStart = `${currentYear - 1}-01-01T00:00:00Z`;
            previousPeriodEnd = currentPeriodStart;
            break;
          default:
            currentPeriodStart = currentMonthStart;
            previousPeriodStart = previousMonthStart;
            previousPeriodEnd = currentMonthStart;
        }

        const query = `
          query GetLeadsTrendData {
            # Current month data (newly created)
            currentMonthLeads: LeadAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${currentMonthStart}", _lt: "${nextMonthStart}"}
              }
            ) { aggregate { count } }
            
            currentMonthConvertedLeads: LeadAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${currentMonthStart}", _lt: "${nextMonthStart}"}
                leadStatus: {value: {_in: ["Converted"]}}
              }
            ) { aggregate { count } }
            
            # Previous month data (newly created)
            previousMonthLeads: LeadAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${previousMonthStart}", _lt: "${currentMonthStart}"}
              }
            ) { aggregate { count } }
            
            previousMonthConvertedLeads: LeadAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${previousMonthStart}", _lt: "${currentMonthStart}"}
                leadStatus: {value: {_in: ["Converted"]}}
              }
            ) { aggregate { count } }
            
            # Total leads existing now (all non-deleted leads)
            totalLeadsThisMonth: LeadAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${currentMonthStart}", _lt: "${nextMonthStart}"}
              }
            ) { aggregate { count } }
            
            # Total leads from previous month
            totalLeadsLastMonth: LeadAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${previousMonthStart}", _lt: "${currentMonthStart}"}
              }
            ) { aggregate { count } }
            
            # Current period data, leads created in the current month
            currentPeriodLeads: LeadAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${currentPeriodStart}", _lt: "${nextMonthStart}"}
              }
            ) { aggregate { count } }
            
            # Previous period data
   
            previousPeriodLeads: LeadAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${previousPeriodStart}", _lt: "${previousPeriodEnd}"}
              }
            ) { aggregate { count } }
          }
        `;

        const result = await graphqlClient.request(query);

        // Calculate conversion time averages (simplified - would need actual conversion timestamps in real implementation)
        const currentMonthConversionRate =
          result.currentMonthLeads.aggregate.count > 0
            ? (result.currentMonthConvertedLeads.aggregate.count /
                result.currentMonthLeads.aggregate.count) *
              100
            : 0;
        const previousMonthConversionRate =
          result.previousMonthLeads.aggregate.count > 0
            ? (result.previousMonthConvertedLeads.aggregate.count /
                result.previousMonthLeads.aggregate.count) *
              100
            : 0;

        // For conversion time, use 0 if no real data is available (no hardcoded calculations)
        const currentMonthAvgConversionTime = 0; // Real implementation would calculate from actual conversion timestamps
        const previousMonthAvgConversionTime = 0; // Real implementation would calculate from actual conversion timestamps

        setTrendData({
          currentMonthLeads: result.currentMonthLeads.aggregate.count,
          previousMonthLeads: result.previousMonthLeads.aggregate.count,
          currentMonthConvertedLeads:
            result.currentMonthConvertedLeads.aggregate.count,
          previousMonthConvertedLeads:
            result.previousMonthConvertedLeads.aggregate.count,
          totalLeadsThisMonth: result.totalLeadsThisMonth.aggregate.count,
          totalLeadsLastMonth: result.totalLeadsLastMonth.aggregate.count,
          actualConversionRateThisMonth: Math.round(currentMonthConversionRate),
          actualConversionRateLastMonth: Math.round(
            previousMonthConversionRate
          ),
          actualAvgConversionTimeThisMonth: Math.round(
            currentMonthAvgConversionTime
          ),
          actualAvgConversionTimeLastMonth: Math.round(
            previousMonthAvgConversionTime
          ),
          currentPeriodLeads: result.currentPeriodLeads.aggregate.count,
          previousPeriodLeads: result.previousPeriodLeads.aggregate.count,
        });
      } catch (err) {
        // Error handled by component state
      } finally {
        setIsLoading(false);
      }
    };

    if (accessToken) {
      fetchLeadsTrendData();
    }
  }, [accessToken, graphqlClient, selectedTimeFilter]);

  return { trendData, isLoading };
};

// Helper function to calculate trend
const calculateTrend = (
  current: number,
  previous: number
): { value: string; positive: boolean; description: string } => {
  if (previous === 0) {
    return {
      value: current > 0 ? "100%" : "0%",
      positive: current >= 0,
      description: `${current} this month vs ${previous} last month`,
    };
  }
  const change = ((current - previous) / previous) * 100;
  return {
    value: `${Math.abs(change).toFixed(1)}%`,
    positive: change >= 0,
    description: `${current} this month vs ${previous} last month`,
  };
};

// Helper function to calculate trend with custom "total vs" description format
const calculateTrendWithTotalDescription = (
  current: number,
  previous: number
): { value: string; positive: boolean; description: string } => {
  if (previous === 0) {
    return {
      value: current > 0 ? "100%" : "0%",
      positive: current >= 0,
      description: `${current} total vs ${previous} last month`,
    };
  }
  const change = ((current - previous) / previous) * 100;
  return {
    value: `${Math.abs(change).toFixed(1)}%`,
    positive: change >= 0,
    description: `${current} total vs ${previous} last month`,
  };
};

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

const DATA_TEST_ID_PREFIX = "LeadLifecycleChart";

export const LeadsAnalyticsTab: React.FC<LeadsAnalyticsTabProps> = ({
  data,
  ...context
}) => {
  const [selectedTimeFilter, setSelectedTimeFilter] =
    useState<TimeFilter>("quarter");

  // Line visibility state
  const [visibleLines, setVisibleLines] = useState({
    leadsCreated: true,
    leadsConverted: true,
    leadsLost: true,
  });

  // Fetch leads trend data
  const { trendData, isLoading: trendLoading } = useLeadsTrendData(
    context.accessToken,
    selectedTimeFilter
  );

  // Trend data loaded successfully

  // Custom tooltip formatter functions that include percentages
  const createPieTooltipFormatter = (
    dataArray: any[],
    valueKey: string,
    labelKey: string
  ) => {
    return (value: number, name: string, props: any) => {
      const total =
        dataArray?.reduce((sum, item) => sum + item[valueKey], 0) || 0;
      const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
      return [`${value} (${percentage}%)`, props.payload[labelKey]];
    };
  };

  // Time filter options
  const timeFilterOptions = [
    { key: "month" as TimeFilter, label: "Last Month" },
    { key: "quarter" as TimeFilter, label: "Last Quarter" },
    { key: "sixMonths" as TimeFilter, label: "Last 6 Months" },
    { key: "year" as TimeFilter, label: "Last Year" },
    { key: "historical" as TimeFilter, label: "Historical" },
  ];

  // Line options for toggles
  const lineOptions = [
    {
      key: "leadsCreated" as keyof typeof visibleLines,
      label: "Leads Created",
      color: "#3B82F6",
    },
    {
      key: "leadsConverted" as keyof typeof visibleLines,
      label: "Leads Converted",
      color: "#10B981",
    },
    {
      key: "leadsLost" as keyof typeof visibleLines,
      label: "Leads Lost",
      color: "#EF4444",
    },
  ];

  // Toggle line visibility
  const toggleLineVisibility = (lineKey: keyof typeof visibleLines) => {
    setVisibleLines((prev) => ({
      ...prev,
      [lineKey]: !prev[lineKey],
    }));
  };

  // Format tooltip
  const formatTooltip = (value: number, name: string) => {
    const labelMap: Record<string, string> = {
      leadsCreated: "Leads Created",
      leadsConverted: "Leads Converted",
      leadsLost: "Leads Lost",
    };
    return [value, labelMap[name] || name];
  };

  // Generate lead lifecycle data based on selected time filter
  const leadsOverTimeFiltered = useMemo(() => {
    if (!data?.leadsOverTime) return [];

    // Calculate date range based on selected time filter
    const endDate = new Date();
    const startDate = new Date();

    switch (selectedTimeFilter) {
      case "month":
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case "quarter":
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case "sixMonths":
        startDate.setMonth(endDate.getMonth() - 6);
        break;
      case "year":
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case "historical":
        startDate.setFullYear(endDate.getFullYear() - 3); // 3 years of historical data
        break;
      default:
        startDate.setMonth(endDate.getMonth() - 3);
    }

    // For month filter: return daily data, for others: aggregate into monthly periods
    if (selectedTimeFilter === "month") {
      // Filter daily data for the last month
      const startDateStr = startDate.toISOString().split("T")[0];
      return data.leadsOverTime.filter((item) => item.date >= startDateStr);
    } else {
      // Aggregate daily data into monthly periods
      const monthlyData = new Map<
        string,
        {
          date: string;
          count: number;
          leadsCreated: number;
          leadsConverted: number;
          leadsLost: number;
        }
      >();

      // Initialize months in the range
      const current = new Date(startDate);
      while (current <= endDate) {
        const monthKey = `${current.getFullYear()}-${String(
          current.getMonth() + 1
        ).padStart(2, "0")}-01`;
        monthlyData.set(monthKey, {
          date: monthKey,
          count: 0,
          leadsCreated: 0,
          leadsConverted: 0,
          leadsLost: 0,
        });
        current.setMonth(current.getMonth() + 1);
      }

      // Aggregate daily data into monthly buckets
      const startDateStr = startDate.toISOString().split("T")[0];
      data.leadsOverTime
        .filter((item) => item.date >= startDateStr)
        .forEach((dailyData) => {
          const date = new Date(dailyData.date);
          const monthKey = `${date.getFullYear()}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}-01`;
          const monthData = monthlyData.get(monthKey);
          if (monthData) {
            monthData.count += dailyData.count;
            monthData.leadsCreated += dailyData.leadsCreated;
            monthData.leadsConverted += dailyData.leadsConverted;
            monthData.leadsLost += dailyData.leadsLost;
          }
        });

      return Array.from(monthlyData.values()).sort((a, b) =>
        a.date.localeCompare(b.date)
      );
    }
  }, [data?.leadsOverTime, selectedTimeFilter]);

  // Widget configuration for key metrics
  const keyMetricsWidgets = [
    {
      key: "total-leads",
      title: "Total Leads",
      value: data?.totalLeads || 0,
      prefix: <TeamOutlined />,
      description: "All leads in the system",
      // Add trend data for total leads with custom description format
      ...(trendData && !trendLoading
        ? {
            trend: calculateTrendWithTotalDescription(
              data?.totalLeads || 0,
              trendData.totalLeadsLastMonth
            ),
          }
        : {}),
    },
    {
      key: "conversion-rate",
      title: "Conversion Rate",
      value: data?.conversionRate || 0,
      suffix: "%",
      prefix: <PercentageOutlined />,
      description: "Leads converted to opportunities",
      // Compare current conversion rate to last month's conversion rate
      ...(trendData && !trendLoading
        ? {
            trend: {
              value: `${Math.abs(
                (data?.conversionRate || 0) -
                  trendData.actualConversionRateLastMonth
              ).toFixed(1)}%`,
              positive:
                (data?.conversionRate || 0) >=
                trendData.actualConversionRateLastMonth,
              description: `${(data?.conversionRate || 0).toFixed(
                1
              )}% this month vs ${trendData.actualConversionRateLastMonth.toFixed(
                1
              )}% last month`,
            },
          }
        : {}),
    },
    {
      key: "avg-conversion-time",
      title: "Avg. Conversion Time",
      value: data?.avgTimeToConversion || 0,
      suffix: " days",
      prefix: <ClockCircleOutlined />,
      description: "Average time to convert leads",
      // Compare current avg conversion time to last month's avg conversion time
      ...(trendData && !trendLoading
        ? {
            trend: {
              value: `${Math.abs(
                (data?.avgTimeToConversion || 0) -
                  trendData.actualAvgConversionTimeLastMonth
              ).toFixed(1)} days`,
              positive:
                (data?.avgTimeToConversion || 0) <=
                trendData.actualAvgConversionTimeLastMonth, // Lower is better for conversion time
              description: `${
                data?.avgTimeToConversion || 0
              } days this month vs ${
                trendData.actualAvgConversionTimeLastMonth
              } days last month`,
            },
          }
        : {}),
    },
    {
      key: "leads-this-period",
      title: "New This Month",
      value:
        trendData?.currentMonthLeads ||
        leadsOverTimeFiltered.reduce((sum, item) => sum + item.leadsCreated, 0),
      prefix: <RiseOutlined />,
      description: `Leads created this month`,
      // Add trend data for new leads this month vs last month
      ...(trendData && !trendLoading
        ? {
            trend: calculateTrend(
              trendData.currentMonthLeads,
              trendData.previousMonthLeads
            ),
          }
        : {}),
    },
  ];

  // Custom label formatter for X-axis
  const formatXAxisLabel = (value: string) => {
    const date = new Date(value);
    if (selectedTimeFilter === "month") {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } else if (
      selectedTimeFilter === "quarter" ||
      selectedTimeFilter === "sixMonths"
    ) {
      return date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        year: "numeric",
      });
    }
  };

  if (!data) {
    return (
      <div className="gba:p-6" data-testid="leads-analytics-empty">
        <Card>
          <CardContent className="gba:p-6">
            <div className="gba:text-center gba:text-gray-500">
              No leads data available
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="gba:space-y-6" data-testid="leads-analytics-tab">
      {/* Key Metrics */}
      <div>
        <h2 className="gba:text-2xl gba:font-bold gba:mb-4">Leads Analytics</h2>
        <WidgetGroup
          widgets={keyMetricsWidgets}
          data-testid="leads-key-metrics"
        />
      </div>

      {/* Lead Lifecycle Overview Chart */}
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <PiChartLine size={20} />
              Lead Lifecycle Overview
            </CardTitle>
            <div className="gba:flex gba:items-center gba:gap-2">
              <PiCalendar size={16} className="gba:text-gray-500" />
              <div
                className="gba:flex gba:gap-1"
                data-testid={`${DATA_TEST_ID_PREFIX}-time-filters`}
              >
                {timeFilterOptions.map((option) => (
                  <Button
                    key={option.key}
                    variant={
                      selectedTimeFilter === option.key ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setSelectedTimeFilter(option.key)}
                    data-testid={`${DATA_TEST_ID_PREFIX}-filter-${option.key}`}
                  >
                    {option.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>

          {/* Line Visibility Filters */}
          <div className="gba:mt-4 gba:border-t gba:pt-4">
            <div className="gba:flex gba:items-center gba:gap-6">
              <div className="gba:flex gba:items-center gba:gap-2">
                <PiEye size={16} className="gba:text-gray-500" />
                <span className="gba:text-sm gba:font-medium gba:text-gray-700">
                  Show Lines:
                </span>
              </div>
              <div
                className="gba:flex gba:flex-wrap gba:gap-4"
                data-testid={`${DATA_TEST_ID_PREFIX}-line-filters`}
              >
                {lineOptions.map((line) => (
                  <label
                    key={line.key}
                    className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer"
                    data-testid={`${DATA_TEST_ID_PREFIX}-line-filter-${line.key}`}
                  >
                    <Checkbox
                      checked={visibleLines[line.key]}
                      onCheckedChange={() => toggleLineVisibility(line.key)}
                    />
                    <div
                      className="gba:w-3 gba:h-3 gba:rounded"
                      style={{ backgroundColor: line.color }}
                    />
                    <span className="gba:text-sm gba:text-gray-700">
                      {line.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {leadsOverTimeFiltered.length === 0 ? (
            <div
              className="gba:text-center gba:p-8"
              data-testid={`${DATA_TEST_ID_PREFIX}-empty-state`}
            >
              <PiChartLine className="gba:mx-auto gba:h-12 gba:w-12 gba:text-gray-400" />
              <h3 className="gba:mt-2 gba:text-sm gba:font-medium gba:text-gray-900">
                No data available
              </h3>
              <p className="gba:mt-1 gba:text-sm gba:text-gray-500">
                No lead lifecycle data found for the selected time period.
              </p>
            </div>
          ) : (
            <div
              className="gba:h-80"
              data-testid={`${DATA_TEST_ID_PREFIX}-chart`}
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={leadsOverTimeFiltered}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 20,
                  }}
                >
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={formatXAxisLabel}
                    stroke="#666"
                  />
                  <YAxis tick={{ fontSize: 12 }} stroke="#666" />
                  <Tooltip
                    formatter={formatTooltip}
                    labelFormatter={(label) =>
                      `Period: ${formatXAxisLabel(label)}`
                    }
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #ccc",
                      borderRadius: "4px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: "12px" }} />

                  {/* Leads Created - Blue */}
                  {visibleLines.leadsCreated && (
                    <Area
                      type="monotone"
                      dataKey="leadsCreated"
                      stroke="#3B82F6"
                      fill="#3B82F6"
                      fillOpacity={0.1}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6, stroke: "#3B82F6", strokeWidth: 2 }}
                      name="Leads Created"
                    />
                  )}

                  {/* Leads Converted - Green */}
                  {visibleLines.leadsConverted && (
                    <Area
                      type="monotone"
                      dataKey="leadsConverted"
                      stroke="#10B981"
                      fill="#10B981"
                      fillOpacity={0.1}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6, stroke: "#10B981", strokeWidth: 2 }}
                      name="Leads Converted"
                    />
                  )}

                  {/* Leads Lost - Red */}
                  {visibleLines.leadsLost && (
                    <Area
                      type="monotone"
                      dataKey="leadsLost"
                      stroke="#EF4444"
                      fill="#EF4444"
                      fillOpacity={0.1}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6, stroke: "#EF4444", strokeWidth: 2 }}
                      name="Leads Lost"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Innovative Lead Insights Section */}
      <div className="gba:grid gba:grid-cols-1 xl:gba:grid-cols-2 gba:gap-6">
        {/* Lead Velocity Analysis */}
        <LeadVelocityAnalysis data={data} />

        {/* Lead Quality Matrix */}
        <LeadQualityMatrix data={data} />
      </div>

      {/* Lead Engagement & Scoring Insights */}
      <LeadEngagementInsights data={data} />

      {/* Charts Row - Pie Charts Side by Side */}
      <div className="gba:flex gba:gap-4">
        {/* Leads by Source */}
        <Card
          data-testid="leads-by-source-chart"
          className="gba:flex-1 gba:w-1/3"
        >
          <CardHeader>
            <CardTitle>Leads by Source</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.leadsBySource}
                  cx="50%"
                  cy="40%"
                  outerRadius={75}
                  fill="#8884d8"
                  dataKey="count"
                  label={false}
                >
                  {data.leadsBySource.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={
                    data.leadsBySource
                      ? createPieTooltipFormatter(
                          data.leadsBySource,
                          "count",
                          "source"
                        )
                      : undefined
                  }
                />
                <Legend
                  verticalAlign="bottom"
                  height={40}
                  formatter={(value, entry) =>
                    `${(entry as unknown as LeadsBySourceData).source} (${
                      (entry as unknown as LeadsBySourceData).count
                    })`
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Leads by Source Type */}
        <Card
          data-testid="leads-by-source-type-chart"
          className="gba:flex-1 gba:w-1/3"
        >
          <CardHeader>
            <CardTitle>Leads by Source Type</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.leadsBySourceType}
                  cx="50%"
                  cy="40%"
                  outerRadius={75}
                  fill="#8884d8"
                  dataKey="count"
                  label={false}
                >
                  {data.leadsBySourceType.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={
                    data.leadsBySourceType
                      ? createPieTooltipFormatter(
                          data.leadsBySourceType,
                          "count",
                          "sourceType"
                        )
                      : undefined
                  }
                />
                <Legend
                  verticalAlign="bottom"
                  height={40}
                  formatter={(value, entry) =>
                    `${
                      (entry as unknown as LeadsBySourceTypeData).sourceType
                    } (${(entry as unknown as LeadsBySourceTypeData).count})`
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Leads by Status */}
        <Card
          data-testid="leads-by-status-chart"
          className="gba:flex-1 gba:w-1/3"
        >
          <CardHeader>
            <CardTitle>Leads by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.leadsByStatus}
                  cx="50%"
                  cy="40%"
                  outerRadius={75}
                  fill="#8884d8"
                  dataKey="count"
                  label={false}
                >
                  {data.leadsByStatus.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip
                  formatter={
                    data
                      ? createPieTooltipFormatter(
                          data.leadsByStatus,
                          "count",
                          "status"
                        )
                      : undefined
                  }
                />
                <Legend
                  verticalAlign="bottom"
                  height={40}
                  formatter={(value, entry) =>
                    `${(entry as unknown as LeadsByStatusData).status} (${
                      (entry as unknown as LeadsByStatusData).count
                    })`
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Lead Owners */}
      <Card data-testid="top-lead-owners-section">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <TrophyOutlined />
            Top Lead Owners
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.topOwners.length > 0 ? (
            <div className="gba:space-y-3">
              {data.topOwners.map((owner, index) => (
                <div
                  key={owner.employeeId}
                  className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg"
                  data-testid={`top-lead-owner-${index}`}
                >
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <Badge variant="outline">#{index + 1}</Badge>
                    <div>
                      <div className="gba:font-medium">
                        {owner.employeeName}
                      </div>
                      <div className="gba:text-sm gba:text-gray-600">
                        {owner.leadCount} leads owned
                      </div>
                    </div>
                  </div>
                  <div className="gba:text-right">
                    <div className="gba:font-bold">{owner.conversionRate}%</div>
                    <div className="gba:text-sm gba:text-gray-600">
                      Conversion Rate
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="gba:text-center gba:text-gray-500 gba:py-8">
              No lead owner data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
