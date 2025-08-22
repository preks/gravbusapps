import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Checkbox,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@newwork/nw-design-system";
import { Badge } from "@newwork/nw-design-system";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { OpportunitiesAnalytics } from "../types/analyticsTypes";
import { WidgetGroup } from "@/components/widget-group";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
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
  DollarCircleOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  RiseOutlined,
} from "@ant-design/icons";
import { PiChartLine, PiCalendar, PiEye } from "react-icons/pi";
import { OpportunityVelocityAnalysis } from "../components/OpportunityVelocityAnalysis";
import { DealHealthMatrix } from "../components/DealHealthMatrix";
import {
  useOpportunityTrendData,
  TimeFilter,
} from "../hooks/useOpportunityTrendData";
import { usePipelines } from "../hooks/usePipelines";
import { useOpportunitiesOverTime } from "../hooks/useOpportunitiesOverTime";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";

interface OpportunitiesAnalyticsTabProps extends BusinessAppContextProps {
  data?: OpportunitiesAnalytics;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export const OpportunitiesAnalyticsTab: React.FC<
  OpportunitiesAnalyticsTabProps
> = ({ data, ...context }) => {
  const [selectedTimeFilter, setSelectedTimeFilter] =
    useState<TimeFilter>("quarter");
  const [selectedPipelineId, setSelectedPipelineId] = useState<
    string | undefined
  >(undefined);
  const [selectedStagePipelineId, setSelectedStagePipelineId] = useState<
    string | undefined
  >(undefined);
  const [stageData, setStageData] = useState<any[]>([]);
  const [stageDataLoading, setStageDataLoading] = useState(false);
  const [visibleLines, setVisibleLines] = useState({
    opportunitiesCreated: true,
    opportunitiesWon: true,
  });

  // Fetch pipelines and opportunity trend data using real GraphQL
  const { pipelines, isLoading: pipelinesLoading } = usePipelines(
    context.accessToken
  );
  const { trendData, isLoading: trendLoading } = useOpportunityTrendData(
    context.accessToken,
    selectedTimeFilter,
    selectedPipelineId
  );
  const { data: chartData, isLoading: chartLoading } = useOpportunitiesOverTime(
    context.accessToken,
    selectedTimeFilter,
    selectedPipelineId
  );
  const graphqlClient = useGraphQLClient(context.accessToken);

  // Helper function to calculate trend with dynamic time period text
  const calculateTrend = (
    current: number,
    previous: number,
    timeFilter?: TimeFilter
  ): { value: string; positive: boolean; description: string } => {
    const currentPeriodText =
      timeFilter === "month"
        ? "this month"
        : timeFilter === "quarter"
        ? "this quarter"
        : timeFilter === "year"
        ? "this year"
        : timeFilter === "sixMonths"
        ? "in last 6 months"
        : "this period";

    const previousPeriodText =
      timeFilter === "month"
        ? "last month"
        : timeFilter === "quarter"
        ? "last quarter"
        : timeFilter === "year"
        ? "last year"
        : timeFilter === "sixMonths"
        ? "previous 6 months"
        : "previous period";

    if (previous === 0) {
      return {
        value: current > 0 ? "100%" : "0%",
        positive: current >= 0,
        description: `${current} ${currentPeriodText} vs ${previous} ${previousPeriodText}`,
      };
    }
    const change = ((current - previous) / previous) * 100;
    return {
      value: `${Math.abs(change).toFixed(1)}%`,
      positive: change >= 0,
      description: `${current} ${currentPeriodText} vs ${previous} ${previousPeriodText}`,
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
      key: "opportunitiesCreated" as keyof typeof visibleLines,
      label: "Opportunities Created",
      color: "#3B82F6",
    },
    {
      key: "opportunitiesWon" as keyof typeof visibleLines,
      label: "Opportunities Won",
      color: "#10B981",
    },
  ];

  // Handle pipeline selection
  const handlePipelineChange = (pipelineId: string) => {
    setSelectedPipelineId(pipelineId === "all" ? undefined : pipelineId);
  };

  // Handle stage chart pipeline selection (no "all" option)
  const handleStagePipelineChange = (pipelineId: string) => {
    setSelectedStagePipelineId(pipelineId);
  };

  // Toggle line visibility
  const toggleLineVisibility = (lineKey: keyof typeof visibleLines) => {
    setVisibleLines((prev) => ({
      ...prev,
      [lineKey]: !prev[lineKey],
    }));
  };

  // Use pipeline-filtered chart data directly from the hook
  const opportunitiesOverTimeFiltered = chartData || [];

  // Set default pipeline for stage chart when pipelines are loaded
  useEffect(() => {
    if (pipelines.length > 0 && !selectedStagePipelineId) {
      setSelectedStagePipelineId(pipelines[0].id);
    }
  }, [pipelines, selectedStagePipelineId]);

  // Fetch stage data when pipeline changes
  useEffect(() => {
    const fetchStageData = async () => {
      if (!selectedStagePipelineId || !context.accessToken) return;

      try {
        setStageDataLoading(true);

        const query = `
          query GetOpportunitiesByStage($pipelineId: String!) {
            opportunities: Opportunity(
              where: { 
                isDeleted: { _eq: false }
                salesPipeline: { id: { _eq: $pipelineId } }
              }
            ) {
              id
              stage
              estimatedAmount
            }
          }
        `;

        const variables = { pipelineId: selectedStagePipelineId };
        const result = await graphqlClient.request(query, variables);

        // Group opportunities by stage
        const stageGroups = result.opportunities.reduce(
          (acc: any, opp: any) => {
            const stage = opp.stage || "Unknown";
            if (!acc[stage]) {
              acc[stage] = { stage, count: 0, value: 0 };
            }
            acc[stage].count += 1;
            acc[stage].value += opp.estimatedAmount || 0;
            return acc;
          },
          {}
        );

        // Convert to array and sort by common stage order
        const stageOrder = [
          "Draft Proposal",
          "Negotiation",
          "Proposal In Progress",
          "In Qualification",
          "Unknown",
          "New Opportunity",
          "Closed",
          "Won",
          "Lost",
        ];

        const stageArray = Object.values(stageGroups).sort((a: any, b: any) => {
          const aIndex = stageOrder.indexOf(a.stage);
          const bIndex = stageOrder.indexOf(b.stage);
          if (aIndex === -1 && bIndex === -1)
            return a.stage.localeCompare(b.stage);
          if (aIndex === -1) return 1;
          if (bIndex === -1) return -1;
          return aIndex - bIndex;
        });

        setStageData(stageArray);
      } catch (error) {
        // Error handled by component state
        setStageData([]);
      } finally {
        setStageDataLoading(false);
      }
    };

    fetchStageData();
  }, [selectedStagePipelineId, context.accessToken, graphqlClient]);

  // Format stage names for better display
  const formatStageName = (stage: string): string => {
    if (!stage) return "Unknown";

    // Replace underscores and hyphens with spaces
    let formatted = stage.replace(/[_-]/g, " ");

    // Convert to title case
    formatted = formatted
      .toLowerCase()
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");

    // Handle common abbreviations and special cases
    const replacements: { [key: string]: string } = {
      Id: "ID",
      Crm: "CRM",
      Api: "API",
      Ui: "UI",
      Ai: "AI",
      "Proposal In Progress": "In Progress",
      "New Opportunity": "New Opp.",
      "In Qualification": "Qualifying",
    };

    Object.keys(replacements).forEach((key) => {
      formatted = formatted.replace(new RegExp(key, "gi"), replacements[key]);
    });

    return formatted;
  };

  // Truncate stage names for X-axis display
  const truncateStageName = (stage: string): string => {
    const formatted = formatStageName(stage);
    return formatted.length > 12
      ? formatted.substring(0, 10) + "..."
      : formatted;
  };

  // Use real pipeline-specific stage data with formatted names
  const filteredStageData = stageData.map((item) => ({
    ...item,
    stageFormatted: formatStageName(item.stage),
    stageTruncated: truncateStageName(item.stage),
  }));

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
      <div className="gba:p-6" data-testid="opportunities-analytics-empty">
        <Card>
          <CardContent className="gba:p-6">
            <div className="gba:text-center gba:text-gray-500">
              No opportunities data available
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  // Custom tooltip formatter that includes percentages
  const createPieTooltipFormatter = (
    dataArray: any[],
    valueKey: string,
    labelKey: string
  ) => {
    return (value: number, _name: string, props: any) => {
      const total =
        dataArray?.reduce((sum, item) => sum + item[valueKey], 0) || 0;
      const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : "0.0";
      return [`${value} (${percentage}%)`, props.payload[labelKey]];
    };
  };
  // Widget configuration for key metrics with real trend data
  const keyMetricsWidgets = [
    {
      key: "total-opportunities",
      title: "Total Opportunities",
      value: data.totalOpportunities,
      prefix: <DollarCircleOutlined />,
      description: "All opportunities in pipeline",
      // Add trend data for total opportunities with custom description format
      ...(trendData && !trendLoading
        ? {
            trend: calculateTrendWithTotalDescription(
              data.totalOpportunities,
              trendData.totalOpportunitiesLastMonth
            ),
          }
        : {}),
    },
    {
      key: "total-value",
      title: selectedPipelineId
        ? "Pipeline Value (Filtered)"
        : "Total Pipeline Value",
      value: `€${data.totalValue.toLocaleString()}`,
      prefix: <DollarCircleOutlined />,
      valueIsString: true,
      description: selectedPipelineId
        ? "Combined value of opportunities in selected pipeline"
        : "Combined value of all opportunities",
      // Add trend data for pipeline value
      ...(trendData && !trendLoading
        ? {
            trend: calculateTrendWithTotalDescription(
              data.totalValue,
              trendData.previousPeriodPipelineValue
            ),
          }
        : {}),
    },
    {
      key: "win-rate",
      title: "Win Rate",
      value: trendData?.actualWinRateThisMonth || data.winRate,
      suffix: "%",
      prefix: <TrophyOutlined />,
      description: `Percentage of won opportunities ${
        selectedTimeFilter === "month"
          ? "this month"
          : selectedTimeFilter === "quarter"
          ? "this quarter"
          : selectedTimeFilter === "year"
          ? "this year"
          : selectedTimeFilter === "sixMonths"
          ? "in last 6 months"
          : "in selected period"
      }`,
      // Compare current win rate to last month's win rate
      ...(trendData && !trendLoading
        ? {
            trend: {
              value: `${Math.abs(
                (trendData.actualWinRateThisMonth || data.winRate) -
                  trendData.actualWinRateLastMonth
              ).toFixed(1)}%`,
              positive:
                (trendData.actualWinRateThisMonth || data.winRate) >=
                trendData.actualWinRateLastMonth,
              description: `${(
                trendData.actualWinRateThisMonth || data.winRate
              ).toFixed(1)}% ${
                selectedTimeFilter === "month"
                  ? "this month"
                  : selectedTimeFilter === "quarter"
                  ? "this quarter"
                  : selectedTimeFilter === "year"
                  ? "this year"
                  : selectedTimeFilter === "sixMonths"
                  ? "in last 6 months"
                  : "this period"
              } vs ${trendData.actualWinRateLastMonth.toFixed(1)}% last month`,
            },
          }
        : {}),
    },
    {
      key: "avg-deal-size",
      title: "Avg. Deal Size",
      value: `€${(
        trendData?.actualAvgDealSizeThisMonth || data.avgDealSize
      ).toLocaleString()}`,
      prefix: <DollarCircleOutlined />,
      valueIsString: true,
      description: `Average opportunity value ${
        selectedTimeFilter === "month"
          ? "this month"
          : selectedTimeFilter === "quarter"
          ? "this quarter"
          : selectedTimeFilter === "year"
          ? "this year"
          : selectedTimeFilter === "sixMonths"
          ? "in last 6 months"
          : "in selected period"
      }`,
      // Compare current avg deal size to last month's avg deal size
      ...(trendData && !trendLoading
        ? {
            trend: {
              value: `€${Math.abs(
                (trendData.actualAvgDealSizeThisMonth || data.avgDealSize) -
                  trendData.actualAvgDealSizeLastMonth
              ).toLocaleString()}`,
              positive:
                (trendData.actualAvgDealSizeThisMonth || data.avgDealSize) >=
                trendData.actualAvgDealSizeLastMonth,
              description: `€${(
                trendData.actualAvgDealSizeThisMonth || data.avgDealSize
              ).toLocaleString()} ${
                selectedTimeFilter === "month"
                  ? "this month"
                  : selectedTimeFilter === "quarter"
                  ? "this quarter"
                  : selectedTimeFilter === "year"
                  ? "this year"
                  : selectedTimeFilter === "sixMonths"
                  ? "in last 6 months"
                  : "this period"
              } vs €${trendData.actualAvgDealSizeLastMonth.toLocaleString()} last month`,
            },
          }
        : {}),
    },

    {
      key: "opportunities-this-period",
      title: `New ${
        selectedTimeFilter === "month"
          ? "This Month"
          : selectedTimeFilter === "quarter"
          ? "This Quarter"
          : selectedTimeFilter === "year"
          ? "This Year"
          : selectedTimeFilter === "sixMonths"
          ? "In Last 6 Months"
          : "This Period"
      }`,
      value:
        trendData?.currentPeriodOpportunities ||
        opportunitiesOverTimeFiltered.reduce(
          (sum, item) => sum + item.count,
          0
        ),
      prefix: <RiseOutlined />,
      description: `Opportunities created in selected time period`,
      // Add trend data for new opportunities based on selected time filter
      ...(trendData && !trendLoading
        ? {
            trend: calculateTrend(
              trendData.currentPeriodOpportunities,
              trendData.previousPeriodOpportunities,
              selectedTimeFilter
            ),
          }
        : {}),
    },
    {
      key: "avg-sales-cycle",
      title: "Avg. Sales Cycle",
      value: trendData?.actualAvgSalesCycleThisMonth || data.avgSalesCycle,
      suffix: " days",
      prefix: <ClockCircleOutlined />,
      description: `Average time to close deals ${
        selectedTimeFilter === "month"
          ? "this month"
          : selectedTimeFilter === "quarter"
          ? "this quarter"
          : selectedTimeFilter === "year"
          ? "this year"
          : selectedTimeFilter === "sixMonths"
          ? "in last 6 months"
          : "in selected period"
      }`,
      // Add comparison logic for sales cycle
      ...(trendData && !trendLoading
        ? {
            trend: {
              value: `${Math.abs(
                (trendData.actualAvgSalesCycleThisMonth || data.avgSalesCycle) -
                  trendData.actualAvgSalesCycleLastMonth
              )} days`,
              positive:
                (trendData.actualAvgSalesCycleThisMonth ||
                  data.avgSalesCycle) <= trendData.actualAvgSalesCycleLastMonth, // Lower is better for sales cycle
              description: `${
                trendData.actualAvgSalesCycleThisMonth || data.avgSalesCycle
              } days ${
                selectedTimeFilter === "month"
                  ? "this month"
                  : selectedTimeFilter === "quarter"
                  ? "this quarter"
                  : selectedTimeFilter === "year"
                  ? "this year"
                  : selectedTimeFilter === "sixMonths"
                  ? "in last 6 months"
                  : "this period"
              } vs ${trendData.actualAvgSalesCycleLastMonth} days last month`,
            },
          }
        : {}),
    },
    {
      key: "conversion-rate",
      title: "Conversion Rate",
      value: trendData?.actualConversionRateThisMonth || 0,
      suffix: "%",
      prefix: <TrophyOutlined />,
      description: `Percentage of leads converted to opportunities ${
        selectedTimeFilter === "month"
          ? "this month"
          : selectedTimeFilter === "quarter"
          ? "this quarter"
          : selectedTimeFilter === "year"
          ? "this year"
          : selectedTimeFilter === "sixMonths"
          ? "in last 6 months"
          : "in selected period"
      }`,
      // Add comparison logic for conversion rate
      ...(trendData && !trendLoading
        ? {
            trend: {
              value: `${Math.abs(
                (trendData.actualConversionRateThisMonth || 0) -
                  (trendData.actualConversionRateLastMonth || 0)
              ).toFixed(1)}%`,
              positive:
                (trendData.actualConversionRateThisMonth || 0) >=
                (trendData.actualConversionRateLastMonth || 0),
              description: `${(
                trendData.actualConversionRateThisMonth || 0
              ).toFixed(1)}% ${
                selectedTimeFilter === "month"
                  ? "this month"
                  : selectedTimeFilter === "quarter"
                  ? "this quarter"
                  : selectedTimeFilter === "year"
                  ? "this year"
                  : selectedTimeFilter === "sixMonths"
                  ? "in last 6 months"
                  : "this period"
              } vs ${(trendData.actualConversionRateLastMonth || 0).toFixed(
                1
              )}% last month`,
            },
          }
        : {}),
    },
    {
      key: "pipeline-velocity",
      title: "Pipeline Velocity",
      value: data.pipelineVelocity || 0,
      suffix: " days",
      prefix: <RiseOutlined />,
      description: "Average time opportunities spend in pipeline",
      // Add comparison logic for pipeline velocity
      ...(trendData && !trendLoading
        ? {
            trend: {
              value: `${Math.abs(
                (data.pipelineVelocity || 0) -
                  (trendData.actualPipelineVelocityLastMonth || 0)
              )} days`,
              positive:
                (data.pipelineVelocity || 0) <=
                (trendData.actualPipelineVelocityLastMonth || 0), // Lower is better
              description: `${data.pipelineVelocity || 0} days this month vs ${
                trendData.actualPipelineVelocityLastMonth || 0
              } days last month`,
            },
          }
        : {}),
    },
  ];

  return (
    <div className="gba:space-y-6" data-testid="opportunities-analytics-tab">
      {/* Key Metrics */}
      <div>
        <h2 className="gba:text-2xl gba:font-bold gba:mb-4">
          Opportunities Analytics
        </h2>
        <WidgetGroup
          widgets={keyMetricsWidgets}
          data-testid="opportunities-key-metrics"
        />
      </div>

      {/* Opportunity Lifecycle Overview Chart */}
      <Card data-testid="opportunity-lifecycle-chart">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <div className="gba:flex gba:items-center gba:gap-4">
              <CardTitle className="gba:flex gba:items-center gba:gap-2">
                <PiChartLine size={20} />
                Opportunity Lifecycle Overview
              </CardTitle>

              {/* Pipeline Selector */}
              <div className="gba:min-w-48">
                <Select
                  value={selectedPipelineId || "all"}
                  onValueChange={handlePipelineChange}
                  disabled={pipelinesLoading}
                >
                  <SelectTrigger data-testid="opportunity-pipeline-selector">
                    <SelectValue placeholder="Select pipeline" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Pipelines</SelectItem>
                    {pipelines.map((pipeline) => (
                      <SelectItem key={pipeline.id} value={pipeline.id}>
                        {pipeline.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="gba:flex gba:items-center gba:gap-2">
              <PiCalendar size={16} className="gba:text-gray-500" />
              <div
                className="gba:flex gba:gap-1"
                data-testid="opportunity-time-filters"
              >
                {timeFilterOptions.map((option) => (
                  <Button
                    key={option.key}
                    variant={
                      selectedTimeFilter === option.key ? "default" : "outline"
                    }
                    size="sm"
                    onClick={() => setSelectedTimeFilter(option.key)}
                    data-testid={`opportunity-filter-${option.key}`}
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
                data-testid="opportunity-line-filters"
              >
                {lineOptions.map((line) => (
                  <label
                    key={line.key}
                    className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer"
                    data-testid={`opportunity-line-filter-${line.key}`}
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
          {chartLoading ? (
            <div
              className="gba:text-center gba:p-8"
              data-testid="opportunity-lifecycle-loading-state"
            >
              <div className="gba:animate-spin gba:mx-auto gba:h-12 gba:w-12 gba:border-4 gba:border-blue-500 gba:border-t-transparent gba:rounded-full"></div>
              <h3 className="gba:mt-2 gba:text-sm gba:font-medium gba:text-gray-900">
                Loading chart data...
              </h3>
              <p className="gba:mt-1 gba:text-sm gba:text-gray-500">
                Fetching opportunity data for the selected pipeline and time
                period.
              </p>
            </div>
          ) : opportunitiesOverTimeFiltered.length === 0 ? (
            <div
              className="gba:text-center gba:p-8"
              data-testid="opportunity-lifecycle-empty-state"
            >
              <PiChartLine className="gba:mx-auto gba:h-12 gba:w-12 gba:text-gray-400" />
              <h3 className="gba:mt-2 gba:text-sm gba:font-medium gba:text-gray-900">
                No data available
              </h3>
              <p className="gba:mt-1 gba:text-sm gba:text-gray-500">
                No opportunity lifecycle data found for the selected pipeline
                and time period.
              </p>
            </div>
          ) : (
            <div
              className="gba:h-80"
              data-testid="opportunity-lifecycle-chart-area"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={opportunitiesOverTimeFiltered}
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
                    formatter={(value: number, name: string, props: any) => {
                      const dataKey = props.dataKey;
                      let label = name;

                      if (dataKey === "opportunitiesCreated") {
                        label = "Opportunities Created";
                      } else if (dataKey === "opportunitiesWon") {
                        label = "Opportunities Won";
                      }

                      return [value, label];
                    }}
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

                  {/* Opportunities Created - Blue */}
                  {visibleLines.opportunitiesCreated && (
                    <Area
                      type="monotone"
                      dataKey="opportunitiesCreated"
                      stroke="#3B82F6"
                      fill="#3B82F6"
                      fillOpacity={0.1}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6, stroke: "#3B82F6", strokeWidth: 2 }}
                      name="Opportunities Created"
                    />
                  )}

                  {/* Opportunities Won - Green */}
                  {visibleLines.opportunitiesWon && (
                    <Area
                      type="monotone"
                      dataKey="opportunitiesWon"
                      stroke="#10B981"
                      fill="#10B981"
                      fillOpacity={0.1}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 6, stroke: "#10B981", strokeWidth: 2 }}
                      name="Opportunities Won"
                    />
                  )}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Innovative Opportunity Analytics Section */}
      <div className="gba:grid gba:grid-cols-1 xl:gba:grid-cols-2 gba:gap-6">
        {/* Opportunity Velocity Analysis */}
        <OpportunityVelocityAnalysis {...context} />

        {/* Deal Health Matrix */}
        <DealHealthMatrix {...context} />
      </div>

      {/* Traditional Charts Row (Stage Chart 3/4 + Pipeline Chart 1/4) */}
      <div className="gba:flex gba:flex-col lg:gba:flex-row gba:gap-6">
        {/* Opportunities by Stage - 3/4 width */}
        <div className="gba:flex-1 lg:gba:w-3/4">
          <Card data-testid="opportunities-by-stage-chart">
            <CardHeader>
              <div className="gba:flex gba:items-center gba:justify-between">
                <CardTitle>Opportunities by Stage</CardTitle>
                {/* Pipeline Selector for Stage Chart */}
                <div className="gba:min-w-48">
                  <Select
                    value={selectedStagePipelineId || pipelines[0]?.id || ""}
                    onValueChange={handleStagePipelineChange}
                    disabled={pipelinesLoading}
                  >
                    <SelectTrigger data-testid="stage-pipeline-selector">
                      <SelectValue placeholder="Select pipeline" />
                    </SelectTrigger>
                    <SelectContent>
                      {pipelines.map((pipeline) => (
                        <SelectItem key={pipeline.id} value={pipeline.id}>
                          {pipeline.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {stageDataLoading ? (
                <div
                  className="gba:text-center gba:p-8"
                  data-testid="stage-chart-loading-state"
                >
                  <div className="gba:animate-spin gba:mx-auto gba:h-12 gba:w-12 gba:border-4 gba:border-blue-500 gba:border-t-transparent gba:rounded-full"></div>
                  <h3 className="gba:mt-2 gba:text-sm gba:font-medium gba:text-gray-900">
                    Loading stage data...
                  </h3>
                  <p className="gba:mt-1 gba:text-sm gba:text-gray-500">
                    Fetching opportunities by stage for the selected pipeline.
                  </p>
                </div>
              ) : filteredStageData.length === 0 ? (
                <div
                  className="gba:text-center gba:p-8"
                  data-testid="stage-chart-empty-state"
                >
                  <h3 className="gba:mt-2 gba:text-sm gba:font-medium gba:text-gray-900">
                    No data available
                  </h3>
                  <p className="gba:mt-1 gba:text-sm gba:text-gray-500">
                    No opportunities found for the selected pipeline.
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={filteredStageData} margin={{ bottom: 60 }}>
                    {/* Removed CartesianGrid to remove gridlines */}
                    <XAxis
                      dataKey="stageTruncated"
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      tick={{ fontSize: 11 }}
                      interval={0}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value, name) => [
                        name === "Opportunities"
                          ? `${value}`
                          : `€${(value as number).toLocaleString()}`,
                        name === "Opportunities"
                          ? "Opportunities"
                          : "Total Value",
                      ]}
                      labelFormatter={(label) => {
                        // Find the full formatted name for the truncated label
                        const item = filteredStageData.find(
                          (d) => d.stageTruncated === label
                        );
                        return item
                          ? `Stage: ${item.stageFormatted}`
                          : `Stage: ${label}`;
                      }}
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #ccc",
                        borderRadius: "6px",
                        fontSize: "12px",
                        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <Legend
                      wrapperStyle={{ paddingTop: "10px", fontSize: "12px" }}
                    />
                    <Bar
                      dataKey="count"
                      fill="#3B82F6"
                      name="Opportunities"
                      radius={[2, 2, 0, 0]}
                    />
                    <Bar
                      dataKey="value"
                      fill="#10B981"
                      name="Total Value"
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Opportunities by Pipeline - 1/4 width */}
        <div className="gba:flex-1 lg:gba:w-1/4 lg:gba:flex-none">
          <Card data-testid="opportunities-by-pipeline-chart">
            <CardHeader>
              <CardTitle className="gba:text-sm">
                Opportunities by Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.opportunitiesByPipeline}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="count"
                    label={({ percentage }) => `${percentage}%`}
                  >
                    {data.opportunitiesByPipeline.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={createPieTooltipFormatter(
                      data.opportunitiesByPipeline,
                      "count",
                      "pipeline"
                    )}
                  />
                  <Legend
                    content={({ payload }) => (
                      <div className="gba:mt-2 gba:flex gba:flex-wrap gba:gap-4 gba:justify-center">
                        {data.opportunitiesByPipeline.map((item, index) => (
                          <div
                            key={item.pipeline}
                            className="gba:flex gba:items-center gba:gap-1 gba:text-xs"
                          >
                            <div
                              className="gba:w-3 gba:h-3 gba:rounded-sm"
                              style={{
                                backgroundColor: COLORS[index % COLORS.length],
                              }}
                            />
                            <span className="gba:text-gray-700">
                              {item.pipeline}: {item.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Top Deals */}
      <Card data-testid="top-deals-section">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <TrophyOutlined />
            Top Opportunities by Value
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.topDeals.length > 0 ? (
            <div className="gba:space-y-3">
              {data.topDeals.map((deal, index) => (
                <div
                  key={deal.id}
                  className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg"
                  data-testid={`top-deal-${index}`}
                >
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <Badge variant="outline">#{index + 1}</Badge>
                    <div>
                      <div className="gba:font-medium">{deal.name}</div>
                      <div className="gba:text-sm gba:text-gray-600">
                        {deal.stage} • {deal.winChance}% win chance •{" "}
                        {deal.owner}
                      </div>
                    </div>
                  </div>
                  <div className="gba:text-right">
                    <div className="gba:font-bold">
                      ${deal.value.toLocaleString()}
                    </div>
                    <div className="gba:text-sm gba:text-gray-600">
                      Opportunity Value
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="gba:text-center gba:text-gray-500 gba:py-8">
              No deal data available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
