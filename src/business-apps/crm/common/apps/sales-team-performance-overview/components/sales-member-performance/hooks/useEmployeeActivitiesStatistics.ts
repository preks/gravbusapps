import { useState, useEffect, useCallback } from "react";
import {
  ActivityStatistics,
  ActivityType,
  ActivityEntityType,
  SalesActivity,
} from "../types/activitiesTypes";
import { useEmployeeActivitiesData } from "./useEmployeeActivitiesData";

interface UseEmployeeActivitiesStatisticsProps {
  employeeId: string;
  accessToken: string;
  periodInMonths?: number; // Default to 1 for "across all references"
}

interface UseEmployeeActivitiesStatisticsReturn {
  statistics: ActivityStatistics | null;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

// Calculate statistics from the same transformed activities data used in the table
const calculateStatistics = (
  activities: SalesActivity[],
  periodInMonths: number = 1
): ActivityStatistics => {
  const totalCount = activities.length;
  const periodLabel =
    periodInMonths === 1 ? "This month" : `Last ${periodInMonths} months`;

  if (totalCount === 0) {
    return {
      totalActivities: { count: 0, period: periodLabel },
      mostCommonActivity: { type: "Task", count: 0, percentage: 0 },
      mostWorkedEntity: { entityType: "Contact", count: 0, percentage: 0 },
      averageActivityScore: { score: 0, trend: 0 },
    };
  }

  // Count activity types from transformed data
  const activityTypeCounts: Record<string, number> = {};
  activities.forEach((activity) => {
    if (!activity) return;
    const type = activity.type || "Task";
    activityTypeCounts[type] = (activityTypeCounts[type] || 0) + 1;
  });

  // Find most common activity type
  const mostCommonActivityType = Object.keys(activityTypeCounts).reduce(
    (a, b) => (activityTypeCounts[a] > activityTypeCounts[b] ? a : b)
  ) as ActivityType;
  const mostCommonCount = activityTypeCounts[mostCommonActivityType] || 0;

  // Count entity types from transformed data
  const entityTypeCounts: Record<ActivityEntityType, number> = {
    Contact: 0,
    Lead: 0,
    Account: 0,
    Opportunity: 0,
  };

  activities.forEach((activity) => {
    if (!activity || !activity.reference) return;
    const entityType = activity.reference.entityType;
    if (entityType in entityTypeCounts) {
      entityTypeCounts[entityType]++;
    }
  });

  // Find most worked entity type
  const mostWorkedEntityType = (
    Object.keys(entityTypeCounts) as ActivityEntityType[]
  ).reduce((a, b) => (entityTypeCounts[a] > entityTypeCounts[b] ? a : b));
  const mostWorkedCount = entityTypeCounts[mostWorkedEntityType] || 0;

  // Calculate average activity score from the transformed data
  const totalScore = activities.reduce(
    (sum, activity) => sum + activity.activityScore,
    0
  );
  const averageScore = totalCount > 0 ? Math.round(totalScore / totalCount) : 0;

  // Calculate trend based on average score
  const trend =
    averageScore >= 90
      ? 8.5
      : averageScore >= 80
      ? 5.2
      : averageScore >= 70
      ? 2.8
      : averageScore >= 60
      ? 0.5
      : -1.2;

  return {
    totalActivities: {
      count: totalCount,
      period: periodLabel,
    },
    mostCommonActivity: {
      type: mostCommonActivityType,
      count: mostCommonCount,
      percentage:
        totalCount > 0 ? Math.round((mostCommonCount / totalCount) * 100) : 0,
    },
    mostWorkedEntity: {
      entityType: mostWorkedEntityType,
      count: mostWorkedCount,
      percentage:
        totalCount > 0 ? Math.round((mostWorkedCount / totalCount) * 100) : 0,
    },
    averageActivityScore: {
      score: averageScore,
      trend: trend,
    },
  };
};

export const useEmployeeActivitiesStatistics = ({
  employeeId,
  accessToken,
  periodInMonths = 1,
}: UseEmployeeActivitiesStatisticsProps): UseEmployeeActivitiesStatisticsReturn => {
  const [statistics, setStatistics] = useState<ActivityStatistics | null>(null);

  // Use the same data as the main activities table
  const { activities, loading, error, loadPage } = useEmployeeActivitiesData({
    employeeId,
    accessToken,
    search: "", // No search filter for statistics
    sortField: "createdAt",
    sortOrder: "DESC",
  });

  // Calculate statistics whenever activities data changes
  useEffect(() => {
    if (!loading && !error) {
      const calculatedStatistics = calculateStatistics(
        activities,
        periodInMonths
      );
      setStatistics(calculatedStatistics);
    }
  }, [activities, loading, error, periodInMonths]);

  // Refetch function - load same data as table for consistency
  const refetch = useCallback(() => {
    loadPage(1, 20); // Load same page size as table for consistency
  }, [loadPage]);

  // Load initial data
  useEffect(() => {
    if (employeeId && accessToken) {
      refetch();
    }
  }, [employeeId, accessToken, refetch]);

  return {
    statistics,
    loading,
    error,
    refetch,
  };
};
