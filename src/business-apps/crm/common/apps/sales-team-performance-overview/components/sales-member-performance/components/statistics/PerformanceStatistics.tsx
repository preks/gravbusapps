import React from "react";
import { WidgetGroup, WidgetItem } from "@/components/widget-group";
import {
  UserOutlined,
  ContactsOutlined,
  DollarOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { PiTrendUp, PiTrendDown, PiChartLine } from "react-icons/pi";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { usePerformanceStatisticsData } from "../../hooks";
import { useEmployeeTrendData } from "../../hooks/useEmployeeTrendData";
import { formatCurrency } from "../../../../../../utils/currencyUtils";

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

  // Helper functions for trend visualization
  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <PiTrendUp />;
      case "down":
        return <PiTrendDown />;
      default:
        return <PiChartLine />;
    }
  };

  const getTrendColor = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return "#10b981";
      case "down":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getTrendDescription = (
    trend: "up" | "down" | "stable",
    percentage: number,
    baseDescription: string
  ) => {
    if (trend === "stable") return `${baseDescription} • Stable vs last month`;
    const direction = trend === "up" ? "increase" : "decrease";
    return `${baseDescription} • ${percentage.toFixed(
      1
    )}% ${direction} vs last month`;
  };

  // Transform stats data into widgets format with trend comparisons
  const widgets: WidgetItem[] = [
    {
      key: "leads-worked",
      title: "Leads Worked",
      value: statistics.leadsWorked.total,
      prefix: getTrendIcon(trends.leadsWorked.trend),
      color: getTrendColor(trends.leadsWorked.trend),
      description: getTrendDescription(
        trends.leadsWorked.trend,
        trends.leadsWorked.trendPercentage,
        `${statistics.leadsWorked.converted} converted (${statistics.leadsWorked.conversionRate}%)`
      ),
    },
    {
      key: "contacts-worked",
      title: "Contacts Worked",
      value: statistics.contactsWorked.total,
      prefix: getTrendIcon(trends.contactsWorked.trend),
      color: getTrendColor(trends.contactsWorked.trend),
      description: getTrendDescription(
        trends.contactsWorked.trend,
        trends.contactsWorked.trendPercentage,
        `${statistics.contactsWorked.salesRelated} sales-related (${statistics.contactsWorked.percentage}%)`
      ),
    },
    {
      key: "opportunities-managed",
      title: "Opportunities Managed",
      value: statistics.opportunitiesManaged.total,
      prefix: getTrendIcon(trends.opportunitiesManaged.trend),
      color: getTrendColor(trends.opportunitiesManaged.trend),
      description: getTrendDescription(
        trends.opportunitiesManaged.trend,
        trends.opportunitiesManaged.trendPercentage,
        `${statistics.opportunitiesManaged.won} won (${statistics.opportunitiesManaged.winRate}%)`
      ),
    },
    {
      key: "activities-completed",
      title: "Activities Completed",
      value: trends.activitiesCompleted.currentValue,
      prefix: getTrendIcon(trends.activitiesCompleted.trend),
      color: getTrendColor(trends.activitiesCompleted.trend),
      description: getTrendDescription(
        trends.activitiesCompleted.trend,
        trends.activitiesCompleted.trendPercentage,
        `Focus on sales execution`
      ),
      precision: 0,
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
