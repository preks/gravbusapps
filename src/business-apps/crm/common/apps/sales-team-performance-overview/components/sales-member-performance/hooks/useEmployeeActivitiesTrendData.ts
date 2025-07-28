import { useState, useEffect, useCallback } from "react";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";

export interface ActivityTrendData {
  currentValue: number;
  previousValue: number;
  trend: "up" | "down" | "stable";
  trendPercentage: number;
}

export interface ActivityTypeBreakdown {
  type: string;
  count: number;
  percentage: number;
}

export interface EntityTypeBreakdown {
  entityType: string;
  count: number;
  percentage: number;
}

export interface EmployeeActivitiesTrends {
  totalActivities: ActivityTrendData;
  completedActivities: ActivityTrendData;
  mostCommonActivityType: {
    current: ActivityTypeBreakdown;
    previous: ActivityTypeBreakdown;
  };
  mostWorkedEntityType: {
    current: EntityTypeBreakdown;
    previous: EntityTypeBreakdown;
  };
  isLoading: boolean;
  error: string | null;
}

export const useEmployeeActivitiesTrendData = (
  accessToken: string,
  employeeId: string
) => {
  const [trends, setTrends] = useState<EmployeeActivitiesTrends>({
    totalActivities: {
      currentValue: 0,
      previousValue: 0,
      trend: "stable",
      trendPercentage: 0,
    },
    completedActivities: {
      currentValue: 0,
      previousValue: 0,
      trend: "stable",
      trendPercentage: 0,
    },
    mostCommonActivityType: {
      current: { type: "Task", count: 0, percentage: 0 },
      previous: { type: "Task", count: 0, percentage: 0 },
    },
    mostWorkedEntityType: {
      current: { entityType: "Contact", count: 0, percentage: 0 },
      previous: { entityType: "Contact", count: 0, percentage: 0 },
    },
    isLoading: true,
    error: null,
  });

  const graphqlClient = useGraphQLClient(accessToken);

  const calculateTrend = (
    current: number,
    previous: number
  ): { trend: "up" | "down" | "stable"; percentage: number } => {
    if (previous === 0 && current > 0) return { trend: "up", percentage: 100 };
    if (previous === 0 && current === 0)
      return { trend: "stable", percentage: 0 };

    const percentage = ((current - previous) / previous) * 100;
    const trend = percentage > 3 ? "up" : percentage < -3 ? "down" : "stable";

    return { trend, percentage: Math.abs(percentage) };
  };

  const getCurrentAndPreviousMonthDates = () => {
    const now = new Date();
    const currentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59
    );

    return {
      currentStart: currentMonth.toISOString(),
      previousStart: previousMonth.toISOString(),
      previousEnd: previousMonthEnd.toISOString(),
    };
  };

  const fetchActivitiesTrends = async () => {
    const { currentStart, previousStart, previousEnd } =
      getCurrentAndPreviousMonthDates();

    // Current month activities
    const currentActivitiesQuery = `
      query GetCurrentMonthActivities($employeeId: uuid!) {
        SalesActivity(
          where: {
            ownerEmployeeId: { _eq: $employeeId }
            createdAt: { _gte: "${currentStart}" }
            isDeleted: { _eq: false }
          }
        ) {
          id
          title
          activityType {
            value
          }
          completedAt
          contact { id }
          lead { id }
          account { id }
          opportunity { id }
        }
      }
    `;

    // Previous month activities
    const previousActivitiesQuery = `
      query GetPreviousMonthActivities($employeeId: uuid!) {
        SalesActivity(
          where: {
            ownerEmployeeId: { _eq: $employeeId }
            createdAt: { _gte: "${previousStart}", _lte: "${previousEnd}" }
            isDeleted: { _eq: false }
          }
        ) {
          id
          title
          activityType {
            value
          }
          completedAt
          contact { id }
          lead { id }
          account { id }
          opportunity { id }
        }
      }
    `;

    try {
      const [currentResult, previousResult] = await Promise.all([
        graphqlClient.request(currentActivitiesQuery, { employeeId }),
        graphqlClient.request(previousActivitiesQuery, { employeeId }),
      ]);

      const currentActivities = (currentResult as any).SalesActivity;
      const previousActivities = (previousResult as any).SalesActivity;

      // Calculate total activities trend
      const currentTotal = currentActivities.length;
      const previousTotal = previousActivities.length;
      const totalTrend = calculateTrend(currentTotal, previousTotal);

      // Calculate completed activities trend
      const currentCompleted = currentActivities.filter(
        (a: any) => a.completedAt
      ).length;
      const previousCompleted = previousActivities.filter(
        (a: any) => a.completedAt
      ).length;
      const completedTrend = calculateTrend(
        currentCompleted,
        previousCompleted
      );

      // Calculate activity type breakdowns
      const getActivityTypeBreakdown = (
        activities: any[]
      ): ActivityTypeBreakdown => {
        const typeCounts: Record<string, number> = {};
        activities.forEach((activity) => {
          const type = activity.activityType?.value || "Task";
          typeCounts[type] = (typeCounts[type] || 0) + 1;
        });

        if (Object.keys(typeCounts).length === 0) {
          return { type: "Task", count: 0, percentage: 0 };
        }

        const mostCommonType = Object.keys(typeCounts).reduce((a, b) =>
          typeCounts[a] > typeCounts[b] ? a : b
        );

        return {
          type: mostCommonType,
          count: typeCounts[mostCommonType],
          percentage:
            activities.length > 0
              ? Math.round(
                  (typeCounts[mostCommonType] / activities.length) * 100
                )
              : 0,
        };
      };

      // Calculate entity type breakdowns
      const getEntityTypeBreakdown = (
        activities: any[]
      ): EntityTypeBreakdown => {
        const entityCounts: Record<string, number> = {
          Contact: 0,
          Lead: 0,
          Account: 0,
          Opportunity: 0,
        };

        activities.forEach((activity) => {
          if (activity.contact?.id) entityCounts["Contact"]++;
          else if (activity.lead?.id) entityCounts["Lead"]++;
          else if (activity.account?.id) entityCounts["Account"]++;
          else if (activity.opportunity?.id) entityCounts["Opportunity"]++;
        });

        const mostWorkedEntity = Object.keys(entityCounts).reduce((a, b) =>
          entityCounts[a] > entityCounts[b] ? a : b
        );

        return {
          entityType: mostWorkedEntity,
          count: entityCounts[mostWorkedEntity],
          percentage:
            activities.length > 0
              ? Math.round(
                  (entityCounts[mostWorkedEntity] / activities.length) * 100
                )
              : 0,
        };
      };

      return {
        totalActivities: {
          currentValue: currentTotal,
          previousValue: previousTotal,
          trend: totalTrend.trend,
          trendPercentage: totalTrend.percentage,
        },
        completedActivities: {
          currentValue: currentCompleted,
          previousValue: previousCompleted,
          trend: completedTrend.trend,
          trendPercentage: completedTrend.percentage,
        },
        mostCommonActivityType: {
          current: getActivityTypeBreakdown(currentActivities),
          previous: getActivityTypeBreakdown(previousActivities),
        },
        mostWorkedEntityType: {
          current: getEntityTypeBreakdown(currentActivities),
          previous: getEntityTypeBreakdown(previousActivities),
        },
      };
    } catch (error) {
      console.error("Error fetching activities trends:", error);
      throw error;
    }
  };

  const fetchAllActivitiesTrends = useCallback(async () => {
    if (!accessToken || !employeeId) return;

    setTrends((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const activitiesTrends = await fetchActivitiesTrends();

      setTrends({
        ...activitiesTrends,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setTrends((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch activities trend data",
      }));
    }
  }, [accessToken, employeeId]);

  useEffect(() => {
    fetchAllActivitiesTrends();
  }, [fetchAllActivitiesTrends]);

  return {
    trends,
    refetch: fetchAllActivitiesTrends,
  };
};
