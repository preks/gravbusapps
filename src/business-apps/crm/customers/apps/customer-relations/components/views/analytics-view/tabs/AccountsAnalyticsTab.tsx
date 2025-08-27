import React, { useState, useMemo, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@newwork/nw-design-system";
import { Badge } from "@newwork/nw-design-system";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { AccountsAnalytics } from "../types/analyticsTypes";
import { WidgetGroup } from "@/components/widget-group";
import {
  BankOutlined,
  TeamOutlined,
  DollarCircleOutlined,
  RiseOutlined,
  TrophyOutlined,
} from "@ant-design/icons";
import { AccountGrowthAnalysis } from "../components/AccountGrowthAnalysis";
import { AccountHealthMatrix } from "../components/AccountHealthMatrix";
import { AccountRelationshipInsights } from "../components/AccountRelationshipInsights";
import { AccountLifecycleChart } from "../components/AccountLifecycleChart";

interface AccountsAnalyticsTabProps extends BusinessAppContextProps {
  data?: AccountsAnalytics;
}

export type TimeFilter =
  | "month"
  | "quarter"
  | "sixMonths"
  | "year"
  | "historical";

// Helper function to calculate trend
const calculateTrend = (
  current: number,
  previous: number
): { value: string; positive: boolean; description: string } => {
  if (previous === 0) {
    return {
      value: current > 0 ? "100%" : "0%",
      positive: current >= 0,
      description: `${current} this period vs ${previous} last period`,
    };
  }
  const change = ((current - previous) / previous) * 100;
  return {
    value: `${Math.abs(change).toFixed(1)}%`,
    positive: change >= 0,
    description: `${current} this period vs ${previous} last period`,
  };
};

export const AccountsAnalyticsTab: React.FC<AccountsAnalyticsTabProps> = ({
  data,
  accessToken,
}) => {
  const [selectedTimeFilter, setSelectedTimeFilter] =
    useState<TimeFilter>("quarter");
  const [visibleLines, setVisibleLines] = useState({
    accountsCreated: true,
    accountsWithOpportunities: true,
    accountsActive: true,
  });

  // Trend data state
  const [trendData, setTrendData] = useState<any>(null);
  const [trendLoading, setTrendLoading] = useState(true);
  const graphqlClient = useGraphQLClient(accessToken);

  // Fetch trend data for comparisons
  useEffect(() => {
    const fetchTrendData = async () => {
      if (!accessToken) return;

      try {
        setTrendLoading(true);
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth() + 1;

        // Calculate current and previous period ranges
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

        const previousMonthStart =
          currentMonth === 1
            ? `${currentYear - 1}-12-01T00:00:00Z`
            : `${currentYear}-${String(currentMonth - 1).padStart(
                2,
                "0"
              )}-01T00:00:00Z`;

        const query = `
          query GetAccountsTrendData {
            # Current month accounts
            currentMonthAccounts: AccountAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${currentMonthStart}", _lt: "${nextMonthStart}"}
              }
            ) { aggregate { count } }
            
            # Previous month accounts
            previousMonthAccounts: AccountAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${previousMonthStart}", _lt: "${currentMonthStart}"}
              }
            ) { aggregate { count } }
            
            # Current month new opportunities count
            currentMonthOpportunities: OpportunityAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${currentMonthStart}", _lt: "${nextMonthStart}"}
              }
            ) { aggregate { count } }
            
            # Previous month new opportunities count
            previousMonthOpportunities: OpportunityAggregate(
              where: {
                isDeleted: {_eq: false}
                createdAt: {_gte: "${previousMonthStart}", _lt: "${currentMonthStart}"}
              }
            ) { aggregate { count } }
          }
        `;

        const result = await graphqlClient.request(query);
        setTrendData({
          currentMonthAccounts:
            result.currentMonthAccounts?.aggregate?.count || 0,
          previousMonthAccounts:
            result.previousMonthAccounts?.aggregate?.count || 0,
          currentMonthOpportunities:
            result.currentMonthOpportunities?.aggregate?.count || 0,
          previousMonthOpportunities:
            result.previousMonthOpportunities?.aggregate?.count || 0,
        });
      } catch (error) {
        // Error handled by component state
        setTrendData(null);
      } finally {
        setTrendLoading(false);
      }
    };

    fetchTrendData();
  }, [accessToken, graphqlClient]);

  // Toggle line visibility
  const toggleLineVisibility = (lineKey: string) => {
    const key = lineKey as keyof typeof visibleLines;
    setVisibleLines((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Custom tooltip formatter
  const formatTooltip = (value: any, name: string) => {
    const labelMap: Record<string, string> = {
      accountsCreated: "Accounts Created",
      accountsWithOpportunities: "Accounts with Opportunities",
      accountsActive: "Active Accounts",
    };
    return [value, labelMap[name] || name];
  };

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

  // Generate account lifecycle data based on selected time filter (EXACT SAME LOGIC AS LeadsAnalyticsTab)
  const accountsOverTimeFiltered = useMemo(() => {
    if (!data?.accountsOverTime) return [];

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
      return data.accountsOverTime.filter((item) => item.date >= startDateStr);
    } else {
      // Aggregate daily data into monthly periods
      const monthlyData = new Map<
        string,
        {
          date: string;
          count: number;
          accountsCreated: number;
          accountsWithOpportunities: number;
          accountsActive: number;
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
          accountsCreated: 0,
          accountsWithOpportunities: 0,
          accountsActive: 0,
        });
        current.setMonth(current.getMonth() + 1);
      }

      // Aggregate daily data into monthly buckets
      const startDateStr = startDate.toISOString().split("T")[0];
      data.accountsOverTime
        .filter((item) => item.date >= startDateStr)
        .forEach((dailyData) => {
          const date = new Date(dailyData.date);
          const monthKey = `${date.getFullYear()}-${String(
            date.getMonth() + 1
          ).padStart(2, "0")}-01`;
          const monthData = monthlyData.get(monthKey);
          if (monthData) {
            monthData.count += dailyData.count;
            monthData.accountsCreated += dailyData.accountsCreated;
            monthData.accountsWithOpportunities +=
              dailyData.accountsWithOpportunities;
            monthData.accountsActive += dailyData.accountsActive;
          }
        });

      return Array.from(monthlyData.values()).sort((a, b) =>
        a.date.localeCompare(b.date)
      );
    }
  }, [data?.accountsOverTime, selectedTimeFilter]);

  if (!data) {
    return (
      <div className="gba:p-6" data-testid="accounts-analytics-empty">
        <Card>
          <CardContent className="gba:p-6">
            <div className="gba:text-center gba:text-gray-500">
              No accounts data available
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Widget configuration for key metrics with trend comparisons
  const keyMetricsWidgets = [
    {
      key: "total-accounts",
      title: "Total Accounts",
      value: data.totalAccounts || 0,
      prefix: <BankOutlined />,
      description: "All accounts in the system",
      // Show growth indicator based on new account creation trends
      ...(trendData && !trendLoading
        ? {
            trend: {
              value: `+${trendData.currentMonthAccounts}`,
              positive: trendData.currentMonthAccounts > 0,
              description: `${trendData.currentMonthAccounts} new accounts this month`,
            },
          }
        : {}),
    },
    {
      key: "accounts-with-opportunities",
      title: "Accounts with Opportunities",
      value: data.accountsWithOpportunities || 0,
      prefix: <DollarCircleOutlined />,
      description: "Accounts that have opportunities",
      // Add trend comparison for new opportunities created (as indicator of account activity)
      ...(trendData && !trendLoading
        ? {
            trend: {
              value: `${Math.abs(
                trendData.currentMonthOpportunities -
                  trendData.previousMonthOpportunities
              )}`,
              positive:
                trendData.currentMonthOpportunities >=
                trendData.previousMonthOpportunities,
              description: `${trendData.currentMonthOpportunities} new opportunities this month vs ${trendData.previousMonthOpportunities} last month`,
            },
          }
        : {}),
    },
    {
      key: "avg-opportunities-per-account",
      title: "Avg. Opportunities",
      value: data.avgOpportunitiesPerAccount || 0,
      precision: 1,
      prefix: <TeamOutlined />,
      description: "Average opportunities per account",
      // Show opportunity creation activity trends
      ...(trendData && !trendLoading
        ? {
            trend: {
              value: `${Math.abs(
                trendData.currentMonthOpportunities -
                  trendData.previousMonthOpportunities
              )}`,
              positive:
                trendData.currentMonthOpportunities >=
                trendData.previousMonthOpportunities,
              description: `${
                trendData.currentMonthOpportunities >
                trendData.previousMonthOpportunities
                  ? "Increased"
                  : "Decreased"
              } opportunity activity`,
            },
          }
        : {}),
    },
    {
      key: "accounts-this-period",
      title: `New This Month`,
      value:
        trendData?.currentMonthAccounts ||
        accountsOverTimeFiltered.reduce(
          (sum, item) => sum + item.accountsCreated,
          0
        ),
      prefix: <RiseOutlined />,
      description: `Accounts created this month`,
      // Add trend comparison for new accounts this month vs last month
      ...(trendData && !trendLoading
        ? {
            trend: calculateTrend(
              trendData.currentMonthAccounts,
              trendData.previousMonthAccounts
            ),
          }
        : {}),
    },
  ];

  return (
    <div className="gba:space-y-6" data-testid="accounts-analytics-tab">
      {/* Key Metrics */}
      <div>
        <h2 className="gba:text-2xl gba:font-bold gba:mb-4">
          Accounts Analytics
        </h2>
        <WidgetGroup
          widgets={keyMetricsWidgets}
          data-testid="accounts-key-metrics"
        />
      </div>

      {/* Account Lifecycle Overview Chart */}
      <AccountLifecycleChart
        data={accountsOverTimeFiltered}
        selectedTimeFilter={selectedTimeFilter}
        onTimeFilterChange={setSelectedTimeFilter}
        visibleLines={visibleLines}
        onToggleLineVisibility={toggleLineVisibility}
        formatXAxisLabel={formatXAxisLabel}
        formatTooltip={formatTooltip}
      />

      {/* Innovative Account Analytics Section */}
      <div className="gba:grid gba:grid-cols-1 xl:gba:grid-cols-2 gba:gap-6">
        {/* Account Growth Analysis */}
        <AccountGrowthAnalysis data={data} />

        {/* Account Health Matrix */}
        <AccountHealthMatrix data={data} />
      </div>

      {/* Account Relationship Insights */}
      <AccountRelationshipInsights data={data} />

      {/* Top Accounts by Revenue */}
      <Card data-testid="top-accounts-section">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <TrophyOutlined />
            Top Accounts by Revenue
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.topAccounts.length > 0 ? (
            <div className="gba:space-y-3">
              {data.topAccounts.map((account, index) => (
                <div
                  key={account.id}
                  className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border gba:rounded-lg"
                  data-testid={`top-account-${index}`}
                >
                  <div className="gba:flex gba:items-center gba:gap-3">
                    <Badge variant="outline">#{index + 1}</Badge>
                    <div>
                      <div className="gba:font-medium">{account.name}</div>
                      <div className="gba:text-sm gba:text-gray-600">
                        {account.industry} •{" "}
                        {account.wonOpportunities || account.opportunityCount}{" "}
                        won opportunities
                      </div>
                    </div>
                  </div>
                  <div className="gba:text-right">
                    <div className="gba:font-bold">
                      ${account.totalValue.toLocaleString()}
                    </div>
                    <div className="gba:text-sm gba:text-gray-600">Revenue</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="gba:text-center gba:text-gray-500 gba:py-8">
              No accounts with revenue available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
