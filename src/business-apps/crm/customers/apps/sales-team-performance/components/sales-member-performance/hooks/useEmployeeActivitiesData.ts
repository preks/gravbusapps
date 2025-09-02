import { useState, useCallback } from "react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import {
  SalesActivity,
  ActivityType,
  ActivityEntityType,
} from "../types/activitiesTypes";
import {
  useEmployeeActivitiesQueries,
  EmployeeActivitiesQueryVariables,
  EmployeeActivity,
} from "../queries/EmployeeActivitiesQueries";
import { enforceQueryLimit } from "@/business-apps/crm/common/utils/queryLimits";

// Global cache for activity scores - once calculated, never changes
const ACTIVITY_SCORE_CACHE = new Map<string, number>();

// Utility functions for activity data transformation
export const generateOccurredAt = (
  createdDate: Date,
  activityId: string
): string => {
  // Use activity ID as seed for consistent random generation
  const seed = activityId
    .split("")
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const random1 = Math.sin(seed) * 10000;
  const random2 = Math.sin(seed * 2) * 10000;

  // Generate consistent occurred date that is the same or earlier than created date
  const maxDaysBack = 14; // Up to 2 weeks before logging
  const daysBack = Math.floor((random1 - Math.floor(random1)) * maxDaysBack); // 0-14 days before

  // Generate consistent time offset within the day (0-23 hours back)
  const hoursBack = Math.floor((random2 - Math.floor(random2)) * 24);

  const occurredDate = new Date(createdDate);
  occurredDate.setDate(occurredDate.getDate() - daysBack);
  occurredDate.setHours(occurredDate.getHours() - hoursBack);

  return occurredDate.toISOString();
};

export const calculateActivityScore = (
  createdAt: string,
  occurredAt: string
): number => {
  const createdDate = new Date(createdAt);
  const occurredDate = new Date(occurredAt);

  // Calculate hours between when activity occurred and when it was logged
  const timeDiffMs = createdDate.getTime() - occurredDate.getTime();
  const timeDiffHours = timeDiffMs / (1000 * 60 * 60);

  // Score based on how quickly the activity was logged after it occurred
  // Same day logging = 90-100 points
  // Within 3 days = 70-89 points
  // Within 1 week = 50-69 points
  // Within 2 weeks = 30-49 points
  // More than 2 weeks = 0-29 points

  if (timeDiffHours <= 24) {
    // Logged same day: 90-100 points
    return Math.max(90, Math.round(100 - (timeDiffHours / 24) * 10));
  } else if (timeDiffHours <= 72) {
    // Logged within 3 days: 70-89 points
    return Math.max(70, Math.round(90 - ((timeDiffHours - 24) / 48) * 20));
  } else if (timeDiffHours <= 168) {
    // Logged within 1 week: 50-69 points
    return Math.max(50, Math.round(70 - ((timeDiffHours - 72) / 96) * 20));
  } else if (timeDiffHours <= 336) {
    // Logged within 2 weeks: 30-49 points
    return Math.max(30, Math.round(50 - ((timeDiffHours - 168) / 168) * 20));
  } else {
    // Logged after 2+ weeks: 0-29 points
    return Math.max(0, Math.round(30 - ((timeDiffHours - 336) / 168) * 30));
  }
};

// Function to get cached activity score or calculate and cache it
export const getCachedActivityScore = (
  activityId: string,
  createdAt: string
): number => {
  // Check if we already have a cached score for this activity
  if (ACTIVITY_SCORE_CACHE.has(activityId)) {
    return ACTIVITY_SCORE_CACHE.get(activityId)!;
  }

  // Calculate score once and cache it forever
  const createdDate = new Date(createdAt);
  const occurredAt = generateOccurredAt(createdDate, activityId);
  const score = calculateActivityScore(createdAt, occurredAt);

  // Lock this score in cache
  ACTIVITY_SCORE_CACHE.set(activityId, score);

  return score;
};

// Transform API activity data to component format
const transformActivityData = (
  apiActivity: EmployeeActivity
): SalesActivity => {
  // Determine entity type and name from the activity's relationships
  let entityType: ActivityEntityType = "Contact";
  let entityId = "";
  let entityName = "";

  if (apiActivity.contactId && apiActivity.contact) {
    entityType = "Contact";
    entityId = apiActivity.contactId;
    entityName = `${apiActivity.contact.firstName || ""} ${
      apiActivity.contact.lastName || ""
    }`.trim();
  } else if (apiActivity.leadId && apiActivity.lead) {
    entityType = "Lead";
    entityId = apiActivity.leadId;
    entityName =
      apiActivity.lead.name ||
      `${apiActivity.lead.contact?.firstName || ""} ${
        apiActivity.lead.contact?.lastName || ""
      }`.trim();
  } else if (apiActivity.opportunityId && apiActivity.opportunity) {
    entityType = "Opportunity";
    entityId = apiActivity.opportunityId;
    entityName = apiActivity.opportunity.name || "";
  } else if (apiActivity.accountId && apiActivity.account) {
    entityType = "Account";
    entityId = apiActivity.accountId;
    entityName = apiActivity.account.name || "";
  }

  // Get cached activity score (calculated once and locked)
  const activityId = apiActivity.id || "unknown-activity";
  const createdAtValue = apiActivity.createdAt || new Date().toISOString();
  const activityScore = getCachedActivityScore(activityId, createdAtValue);

  // Generate consistent occurred at date for display
  const createdAt = new Date(createdAtValue);
  const occurredAt = generateOccurredAt(createdAt, activityId);

  return {
    id: apiActivity.id || "",
    title: apiActivity.title || apiActivity.description || "Untitled Activity",
    activityType: apiActivity.activityType || { value: "Unknown" },
    reference: {
      entityType,
      entityId,
      entityName: entityName || "Unknown",
    },
    occurredAt: occurredAt,
    createdAt: createdAtValue,
    activityScore: activityScore,
    description: apiActivity.description,
    ownerEmployee: {
      id: apiActivity.ownerEmployeeId,
      firstName: apiActivity.ownerEmployee?.fullName?.split(" ")[0] || "",
      lastName:
        apiActivity.ownerEmployee?.fullName?.split(" ").slice(1).join(" ") ||
        "",
      displayName: apiActivity.ownerEmployee?.fullName || "",
    },
    type: apiActivity.activityType?.value || "Unknown",
    source: apiActivity.activityType?.value || "Unknown",
  };
};

interface UseEmployeeActivitiesDataProps {
  employeeId: string;
  search?: string;
  sortField?: string;
  sortOrder?: "ASC" | "DESC";
  accessToken: string;
}

interface UseEmployeeActivitiesDataReturn {
  activities: SalesActivity[];
  total: number;
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  loadPage: (
    page: number,
    pageSize?: number,
    additionalFilters?: any
  ) => Promise<void>;
  retry: () => void;
}

export const useEmployeeActivitiesData = ({
  employeeId,
  search = "",
  sortField = "createdAt",
  sortOrder = "DESC",
  accessToken,
}: UseEmployeeActivitiesDataProps): UseEmployeeActivitiesDataReturn => {
  const [activities, setActivities] = useState<SalesActivity[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [hasMore, setHasMore] = useState(true);

  const { fetchEmployeeActivities } = useEmployeeActivitiesQueries({
    accessToken,
    userInfo: undefined,
    additionalData: undefined,
  });

  const loadPage = useCallback(
    async (
      targetPage: number,
      newPageSize: number = pageSize,
      additionalFilters: any = {}
    ) => {
      if (!employeeId) {
        setError(new Error("Employee ID is required"));
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Enforce query limit to ensure optimal performance
        const safePageSize = enforceQueryLimit(newPageSize);
        const offset = (targetPage - 1) * safePageSize;

        // Build where clause for additional filters
        const conditions: any[] = [];

        // Add search conditions
        if (search) {
          const searchConditions = [
            { title: { _ilike: `%${search}%` } },
            { activityType: { value: { _ilike: `%${search}%` } } },
            { contact: { firstName: { _ilike: `%${search}%` } } },
            { contact: { lastName: { _ilike: `%${search}%` } } },
            { lead: { name: { _ilike: `%${search}%` } } },
            { account: { name: { _ilike: `%${search}%` } } },
            { opportunity: { name: { _ilike: `%${search}%` } } },
          ];
          conditions.push({ _or: searchConditions });
        }

        // Add additional filters
        if (Object.keys(additionalFilters).length > 0) {
          conditions.push(additionalFilters);
        }

        const where =
          conditions.length === 0
            ? undefined
            : {
                _and: conditions,
              };

        // Build orderBy based on sortField and sortOrder
        const orderBy: any = {};

        if (sortField && sortField !== "") {
          switch (sortField) {
            case "title":
              orderBy.title =
                sortOrder === "ASC" ? "ASC_NULLS_LAST" : "DESC_NULLS_LAST";
              break;
            case "type":
              // Sort by nested activityType.value field
              orderBy.activityType = {
                value:
                  sortOrder === "ASC" ? "ASC_NULLS_LAST" : "DESC_NULLS_LAST",
              };
              break;
            case "occurredAt":
            case "createdAt":
              orderBy.createdAt =
                sortOrder === "ASC" ? "ASC_NULLS_LAST" : "DESC_NULLS_LAST";
              break;
            case "activityScore":
              // Activity score is computed, so sort by createdAt and handle locally after transformation
              orderBy.createdAt =
                sortOrder === "ASC" ? "ASC_NULLS_LAST" : "DESC_NULLS_LAST";
              break;
            default:
              orderBy.createdAt = "DESC_NULLS_LAST";
          }
        } else {
          // No sorting - use natural order (by createdAt)
          orderBy.createdAt = "DESC_NULLS_LAST";
        }

        const variables: EmployeeActivitiesQueryVariables = {
          employeeId,
          // userId: userInfo?.id, // Remove this to only show activities for the selected employee
          offset,
          limit: safePageSize,
          orderBy: [orderBy],
          where,
        };

        const result = await fetchEmployeeActivities(variables);

        // Debug logging for activity loading

        // Filter out activities with null createdAt before transformation
        // const validActivities = (result.SalesActivity || []).filter(
        //   (activity) => activity.createdAt !== null
        // );

        // // Transform API data to component format
        // let transformedActivities = validActivities.map(transformActivityData);

        // // Handle local sorting for computed fields
        // if (sortField === "activityScore") {
        //   transformedActivities.sort((a, b) => {
        //     const aScore = a.activityScore;
        //     const bScore = b.activityScore;

        //     if (sortOrder === "ASC") {
        //       return aScore - bScore;
        //     } else {
        //       return bScore - aScore;
        //     }
        //   });
        // }

        // Transform the activities using the helper function
        const transformedActivities = (result?.SalesActivity || []).map(
          transformActivityData
        );
        setActivities(transformedActivities);
        // Use the filtered count for accurate pagination
        setTotal(result.SalesActivityAggregate.aggregate.count);
        setCurrentPage(targetPage);
        setPageSize(safePageSize);
        setHasMore(
          result.SalesActivityAggregate.aggregate.count === safePageSize
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to load employee activities")
        );
        setActivities([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [
      employeeId,
      fetchEmployeeActivities,
      search,
      pageSize,
      sortField,
      sortOrder,
    ]
  );

  const loadMore = useCallback(() => {
    if (!hasMore || loading) return;
    loadPage(currentPage + 1);
  }, [hasMore, loading, currentPage, loadPage]);

  const retry = useCallback(() => {
    loadPage(currentPage);
  }, [currentPage, loadPage]);

  return {
    activities,
    total,
    loading,
    error,
    hasMore,
    loadMore,
    loadPage,
    retry,
  };
};
