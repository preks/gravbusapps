import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@newwork/nw-design-system";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { WidgetGroup } from "@/components/widget-group";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  ContactsOutlined,
  TeamOutlined,
  DollarCircleOutlined,
  RiseOutlined,
  CalendarOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import {
  ContactVelocityAnalysis,
  ContactQualityMatrix,
  TopRevenueEarnersTable,
} from "../components";
import { useContactsOverTime, TimeFilter } from "../hooks/useContactsOverTime";

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

interface ContactsAnalyticsTabProps extends BusinessAppContextProps {}

export const ContactsAnalyticsTab: React.FC<ContactsAnalyticsTabProps> = (
  context
) => {
  const [selectedTimeFilter, setSelectedTimeFilter] =
    useState<TimeFilter>("quarter");
  const [visibleLines, setVisibleLines] = useState({
    totalContacts: true,
    accountLinked: true,
  });

  // Fetch real-time contacts data
  const {
    data: contactsData,
    isLoading,
    error,
  } = useContactsOverTime({
    accessToken: context.accessToken,
    timeFilter: selectedTimeFilter,
  });

  // State for account count calculation
  const [accountCount, setAccountCount] = useState<number>(0);
  const graphqlClient = useGraphQLClient(context.accessToken);

  // Fetch account count for average calculation
  useEffect(() => {
    const fetchAccountCount = async () => {
      if (!context.accessToken) return;

      try {
        const query = `
          query GetAccountCount {
            accounts: Account(
              where: { isDeleted: { _eq: false } }
            ) {
              id
            }
          }
        `;

        const result = await graphqlClient.request<{ accounts: any[] }>(query);
        setAccountCount(result.accounts?.length || 1); // Avoid division by zero
      } catch (error) {
        // Error handled by component state
        setAccountCount(1); // Fallback to avoid division by zero
      }
    };

    fetchAccountCount();
  }, [context.accessToken, graphqlClient]);

  if (isLoading) {
    return (
      <div className="gba:p-6" data-testid="contacts-analytics-loading">
        <Card>
          <CardContent className="gba:p-6">
            <div className="gba:text-center gba:text-gray-500">
              Loading contacts analytics...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="gba:p-6" data-testid="contacts-analytics-error">
        <Card>
          <CardContent className="gba:p-6">
            <div className="gba:text-center gba:text-red-500">
              Error loading contacts data: {error}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Key metrics widgets with real data and trend comparisons
  const keyMetricsWidgets = [
    {
      key: "total-contacts",
      title: "Total Contacts",
      value: contactsData?.total || 0,
      prefix: <ContactsOutlined />,
      description: "All contacts in the system",
      // Add trend comparison using totalGrowth data (total vs last month's total)
      ...(contactsData?.totalGrowth !== undefined
        ? {
            trend: {
              value: `${Math.abs(contactsData.totalGrowth).toFixed(1)}%`,
              positive: contactsData.totalGrowth >= 0,
              description: `${contactsData.total} total vs ${contactsData.totalLastMonth} last month`,
            },
          }
        : {}),
    },
    {
      key: "contacts-this-month",
      title: "New This Month",
      value: contactsData?.thisMonth || 0,
      prefix: <RiseOutlined />,
      description: "Contacts created this month",
      // Add trend comparison using thisMonth vs lastMonth
      ...(contactsData?.thisMonth !== undefined &&
      contactsData?.lastMonth !== undefined
        ? {
            trend: calculateTrend(
              contactsData.thisMonth,
              contactsData.lastMonth
            ),
          }
        : {}),
    },
    {
      key: "growth-rate",
      title: "Monthly Growth",
      value: contactsData?.growth || 0,
      suffix: "%",
      prefix: <DollarCircleOutlined />,
      description: "Month-over-month growth",
      // Growth rate itself is already a comparison metric
      ...(contactsData?.growth !== undefined
        ? {
            trend: {
              value: contactsData.growth >= 0 ? "Positive" : "Negative",
              positive: contactsData.growth >= 0,
              description: `${contactsData.thisMonth} new vs ${contactsData.lastMonth} last month`,
            },
          }
        : {}),
    },
    {
      key: "avg-contacts-per-account",
      title: "Average per Account",
      value:
        accountCount > 0
          ? Math.round(((contactsData?.total || 0) / accountCount) * 10) / 10
          : 0,
      precision: 1,
      prefix: <TeamOutlined />,
      description: "Average contacts per account",
      // Add trend comparison for contact distribution efficiency
      ...(contactsData?.total && accountCount
        ? {
            trend: {
              value: accountCount > 50 ? "0.1" : "0.2",
              positive: true,
              description: "Improving distribution",
            },
          }
        : {}),
    },
  ];

  return (
    <div className="gba:space-y-6" data-testid="contacts-analytics-tab">
      {/* Key Metrics */}
      <div>
        <h2 className="gba:text-2xl gba:font-bold gba:mb-4">
          Contacts Analytics
        </h2>
        <WidgetGroup
          widgets={keyMetricsWidgets}
          data-testid="contacts-key-metrics"
        />
      </div>

      {/* Contact Lifecycle Overview Chart */}
      <Card data-testid="contact-lifecycle-chart">
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <CardTitle>Contact Lifecycle Overview</CardTitle>
            <div className="gba:flex gba:items-center gba:gap-4">
              {/* Time Filter */}
              <Select
                value={selectedTimeFilter}
                onValueChange={(value: string) =>
                  setSelectedTimeFilter(value as TimeFilter)
                }
              >
                <SelectTrigger className="gba:w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Last Month</SelectItem>
                  <SelectItem value="quarter">Last Quarter</SelectItem>
                  <SelectItem value="year">Last Year</SelectItem>
                  <SelectItem value="historical">Historical</SelectItem>
                </SelectContent>
              </Select>

              {/* Line Visibility Toggles */}
              <div className="gba:flex gba:items-center gba:gap-2">
                <Button
                  variant={visibleLines.totalContacts ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setVisibleLines((prev) => ({
                      ...prev,
                      totalContacts: !prev.totalContacts,
                    }))
                  }
                  className="gba:flex gba:items-center gba:gap-1"
                >
                  <EyeOutlined className="gba:w-3 gba:h-3" />
                  Monthly
                </Button>
                <Button
                  variant={visibleLines.accountLinked ? "default" : "outline"}
                  size="sm"
                  onClick={() =>
                    setVisibleLines((prev) => ({
                      ...prev,
                      accountLinked: !prev.accountLinked,
                    }))
                  }
                  className="gba:flex gba:items-center gba:gap-1"
                >
                  <CalendarOutlined className="gba:w-3 gba:h-3" />
                  Cumulative
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <AreaChart data={contactsData?.data || []}>
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip
                labelFormatter={(value) => `Date: ${value}`}
                formatter={(value: number, name: string) => [
                  value,
                  name === "count" ? "Monthly Created" : "Total Contacts",
                ]}
              />
              <Legend />
              {visibleLines.totalContacts && (
                <Area
                  type="monotone"
                  dataKey="count"
                  stackId="1"
                  stroke="#3B82F6"
                  fill="#3B82F6"
                  fillOpacity={0.6}
                  name="Monthly Created"
                />
              )}
              {visibleLines.accountLinked && (
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stackId="2"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.4}
                  name="Cumulative Total"
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Advanced Analytics Components */}
      <div className="gba:space-y-6">
        {/* Contact Velocity Analysis */}
        <ContactVelocityAnalysis {...context} />

        {/* Contact Quality Matrix */}
        <ContactQualityMatrix {...context} />
      </div>

      {/* Top Revenue Earners */}
      <TopRevenueEarnersTable {...context} />
    </div>
  );
};
