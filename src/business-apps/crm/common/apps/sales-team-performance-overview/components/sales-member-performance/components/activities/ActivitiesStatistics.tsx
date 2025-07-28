import React from "react";
import { WidgetGroup, WidgetItem } from "@/components/widget-group";
import {
  PiChartBar,
  PiUsers,
  PiTarget,
  PiTrophy,
  PiTrendUp,
  PiTrendDown,
  PiChartLine,
} from "react-icons/pi";
import { ActivitiesStatisticsProps } from "../../types/activitiesTypes";
import { useEmployeeActivitiesStatistics } from "../../hooks/useEmployeeActivitiesStatistics";
import { useEmployeeActivitiesTrendData } from "../../hooks/useEmployeeActivitiesTrendData";

const DATA_TEST_ID_PREFIX = "ActivitiesStatistics";

export const ActivitiesStatistics: React.FC<ActivitiesStatisticsProps> = ({
  employeeId,
  onRetry,
  accessToken,
  ...context
}) => {
  // Fetch real activities statistics
  const { statistics, loading, error, refetch } =
    useEmployeeActivitiesStatistics({
      employeeId,
      accessToken,
      periodInMonths: 1, // Across all references
    });

  // Fetch trend data for real comparisons
  const { trends, refetch: refetchTrends } = useEmployeeActivitiesTrendData(
    accessToken,
    employeeId
  );

  // Handle retry
  const handleRetry = () => {
    refetch();
    refetchTrends();
    if (onRetry) {
      onRetry();
    }
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

  // Transform stats data into widgets format with real trend comparisons
  const widgets: WidgetItem[] = statistics
    ? [
        {
          key: "total-activities",
          title: "Total Activities",
          value: statistics.totalActivities.count,
          prefix: getTrendIcon(trends.totalActivities.trend),
          color: getTrendColor(trends.totalActivities.trend),
          description: getTrendDescription(
            trends.totalActivities.trend,
            trends.totalActivities.trendPercentage,
            statistics.totalActivities.period
          ),
        },
        {
          key: "completed-activities",
          title: "Completed Activities",
          value: trends.completedActivities.currentValue,
          prefix: getTrendIcon(trends.completedActivities.trend),
          color: getTrendColor(trends.completedActivities.trend),
          description: getTrendDescription(
            trends.completedActivities.trend,
            trends.completedActivities.trendPercentage,
            `Execution focus`
          ),
          precision: 0,
        },
        {
          key: "most-common-activity",
          title: "Most Common Activity",
          value:
            trends.mostCommonActivityType.current.count === 0
              ? "No data"
              : trends.mostCommonActivityType.current.type,
          prefix: <PiUsers />,
          color: "#722ed1",
          valueIsString: true,
          description:
            trends.mostCommonActivityType.current.count === 0
              ? "No activities found"
              : `${trends.mostCommonActivityType.current.count} activities (${trends.mostCommonActivityType.current.percentage}%)`,
        },
        {
          key: "most-worked-entity",
          title: "Most Worked Entity",
          value:
            trends.mostWorkedEntityType.current.count === 0
              ? "No data"
              : trends.mostWorkedEntityType.current.entityType,
          prefix: <PiTarget />,
          color: "#52c41a",
          valueIsString: true,
          description:
            trends.mostWorkedEntityType.current.count === 0
              ? "No activities found"
              : `${trends.mostWorkedEntityType.current.count} activities (${trends.mostWorkedEntityType.current.percentage}%)`,
        },
      ]
    : [];

  return (
    <div data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <WidgetGroup
        widgets={widgets}
        isLoading={loading || trends.isLoading}
        error={error || (trends.error ? new Error(trends.error) : null)}
        onRetry={handleRetry}
        skeletonCount={4}
        emptyText="No activity statistics available."
        data-testid={`${DATA_TEST_ID_PREFIX}-widget-group`}
      />
    </div>
  );
};

export default ActivitiesStatistics;
