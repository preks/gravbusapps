import React from "react";
import { WidgetGroup, WidgetItem } from "@/components/widget-group";
import {
  UserOutlined,
  ContactsOutlined,
  DollarOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { usePerformanceStatisticsData } from "../../hooks";
import { useEmployeeTrendData } from "../../hooks/useEmployeeTrendData";

const DATA_TEST_ID_PREFIX = "PerformanceStatistics";

interface PerformanceStatisticsProps extends BusinessAppContextProps {
  employeeId: string;
  onRetry?: () => void;
}

export const PerformanceStatistics: React.FC<PerformanceStatisticsProps> = ({
  employeeId,
  accessToken,
  onRetry,
  ...context
}) => {
  // Fetch real performance statistics data
  const { statistics, isLoading, error, refetch } =
    usePerformanceStatisticsData({ accessToken, ...context }, employeeId);

  // Fetch trend data for comparisons
  const { trends, refetch: refetchTrends } = useEmployeeTrendData(
    accessToken,
    employeeId
  );

  // Handle retry - use both internal refetch and optional external onRetry
  const handleRetry = () => {
    refetch();
    refetchTrends();
    onRetry?.();
  };

  // Helper function to format trend percentage with proper sign
  const formatTrendPercent = (changePercent: number): string => {
    const sign = changePercent >= 0 ? "+" : "";
    return `${sign}${changePercent.toFixed(1)}%`;
  };

  // Transform stats data into widgets format with trend comparisons
  const widgets: WidgetItem[] = [
    {
      key: "leads-worked",
      title: "Leads Worked",
      value: statistics.leadsWorked.total,
      prefix: <UserOutlined />,
      color: "#1677ff",
      description: `${statistics.leadsWorked.converted} converted (${statistics.leadsWorked.conversionRate}%)`,
      trend: {
        value: `${statistics.leadsWorked.conversionRate}%`,
        positive: statistics.leadsWorked.conversionRate >= 50,
        description: "conversion rate",
      },
    },
    {
      key: "contacts-worked",
      title: "Contacts Worked",
      value: statistics.contactsWorked.total,
      prefix: <ContactsOutlined />,
      color: "#52c41a",
      description: `${statistics.contactsWorked.salesRelated} sales-related (${statistics.contactsWorked.percentage}%)`,
      trend: {
        value: `${statistics.contactsWorked.percentage}%`,
        positive: statistics.contactsWorked.percentage >= 70,
        description: "engagement rate",
      },
    },
    {
      key: "opportunities-managed",
      title: "Opportunities Managed",
      value: statistics.opportunitiesManaged.total,
      prefix: <DollarOutlined />,
      color: "#ff4d4f",
      description: `${statistics.opportunitiesManaged.won} won (${statistics.opportunitiesManaged.winRate}%)`,
      trend: {
        value: `${statistics.opportunitiesManaged.winRate}%`,
        positive: statistics.opportunitiesManaged.winRate >= 30,
        description: "win rate",
      },
    },
    {
      key: "activities-completed",
      title: "Activities Completed",
      value: trends.activitiesCompleted.currentValue,
      prefix: <TeamOutlined />,
      color: "#722ed1",
      description: "Focus on sales execution",
      precision: 0,
      trend: {
        value: formatTrendPercent(trends.activitiesCompleted.trendPercentage),
        positive: trends.activitiesCompleted.trend === "up",
        description: "vs last month",
      },
    },
  ];

  return (
    <div
      className="gba:w-full gba:mb-8"
      data-testid={`${DATA_TEST_ID_PREFIX}-container`}
    >
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading || trends.isLoading}
        error={
          error
            ? new Error(error)
            : trends.error
            ? new Error(trends.error)
            : null
        }
        onRetry={handleRetry}
        skeletonCount={4}
        emptyText="No performance statistics available."
        data-testid={DATA_TEST_ID_PREFIX}
      />
    </div>
  );
};

export default PerformanceStatistics;
