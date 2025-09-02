import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Spinner,
  Alert,
  Button,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@newwork/nw-design-system";
import {
  PiPhone,
  PiEnvelope,
  PiUsers,
  PiListChecks,
  PiCalendar,
  PiCaretLeft,
  PiCaretRight,
  PiUser,
  PiBuilding,
  PiTarget,
  PiHandshake,
} from "react-icons/pi";

import {
  ActivitiesTableProps,
  SalesActivity,
  ActivityEntityType,
} from "../../types/activitiesTypes";
import { getActivityScoreBadgeVariant, ACTIVITY_TYPE_COLORS } from "./types";
import { useEmployeeActivitiesData } from "../../hooks/useEmployeeActivitiesData";
import dayjs from "dayjs";
import weekday from "dayjs/plugin/weekday";
import localeData from "dayjs/plugin/localeData";

dayjs.extend(weekday);
dayjs.extend(localeData);

const DATA_TEST_ID_PREFIX = "EmployeeActivitiesCalendar";

export const ActivitiesCalendar: React.FC<ActivitiesTableProps> = ({
  employeeId,
  accessToken,
  userInfo: _userInfo,
  onTotalChange,
}) => {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [hookError, setHookError] = useState<string | null>(null);

  // Safely use the data hook with error handling
  let hookResult;
  try {
    if (!employeeId || !accessToken) {
      throw new Error("Employee ID and access token are required");
    }

    hookResult = useEmployeeActivitiesData({
      employeeId,
      search: "",
      sortField: "createdAt", // Use same field as ActivitiesTable
      sortOrder: "DESC",
      accessToken,
      // userInfo - removed as it's not expected by the hook interface
    });
  } catch (err) {
    setHookError(
      err instanceof Error ? err.message : "Unknown error in data hook"
    );
    hookResult = null;
  }

  // Defensive destructuring to prevent errors if hook returns unexpected data
  const {
    activities = [],
    total = 0,
    loading = false,
    error = null,
    loadPage = () => Promise.resolve(),
    retry = () => {},
  } = hookResult || {};

  // Load initial data when component mounts
  useEffect(() => {
    if (employeeId && accessToken) {
      loadPage(1, 200); // Load more items for calendar view
    }
  }, [employeeId, accessToken, loadPage]);

  // Report total change to parent component
  useEffect(() => {
    if (onTotalChange) {
      onTotalChange(total);
    }
  }, [total, onTotalChange]);

  // Get activities for a specific date (check both occurredAt and createdAt)
  const getActivitiesForDate = (date: dayjs.Dayjs): SalesActivity[] => {
    const dateStr = date.format("YYYY-MM-DD");
    const dayActivities = activities.filter((activity) => {
      // Check if activity occurred on this date
      if (activity.occurredAt) {
        const occurredDate = dayjs(activity.occurredAt).format("YYYY-MM-DD");
        if (occurredDate === dateStr) return true;
      }

      // Check if activity was created on this date
      if (activity.createdAt) {
        const createdDate = dayjs(activity.createdAt).format("YYYY-MM-DD");
        if (createdDate === dateStr) return true;
      }

      return false;
    });

    // Sort activities within the day by time (earliest first)
    // Sort independently - no fallback between occurredAt and createdAt
    return dayActivities.sort((a, b) => {
      // If both have occurredAt, sort by occurredAt
      if (a.occurredAt && b.occurredAt) {
        const timeA = dayjs(a.occurredAt);
        const timeB = dayjs(b.occurredAt);
        return timeA.isAfter(timeB) ? 1 : -1;
      }

      // If both have createdAt but not occurredAt, sort by createdAt
      if (!a.occurredAt && !b.occurredAt && a.createdAt && b.createdAt) {
        const timeA = dayjs(a.createdAt);
        const timeB = dayjs(b.createdAt);
        return timeA.isAfter(timeB) ? 1 : -1;
      }

      // Prioritize activities with occurredAt over those without
      if (a.occurredAt && !b.occurredAt) return -1;
      if (!a.occurredAt && b.occurredAt) return 1;

      // If one has createdAt and the other doesn't, prioritize the one with data
      if (a.createdAt && !b.createdAt) return -1;
      if (!a.createdAt && b.createdAt) return 1;

      // If we reach here, both have similar data availability, maintain original order
      return 0;
    });
  };

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const startOfMonth = currentDate.startOf("month");
    const endOfMonth = currentDate.endOf("month");
    const startOfCalendar = startOfMonth.startOf("week");
    const endOfCalendar = endOfMonth.endOf("week");

    const days = [];
    let day = startOfCalendar;

    while (day.isBefore(endOfCalendar) || day.isSame(endOfCalendar)) {
      days.push({
        date: day,
        isCurrentMonth: day.month() === currentDate.month(),
        isToday: day.isSame(dayjs(), "day"),
        activities: getActivitiesForDate(day),
      });
      day = day.add(1, "day");
    }

    return days;
  }, [currentDate, activities]);

  // Get activity type icon
  const getActivityTypeIcon = (type: string, size = 12) => {
    switch (type) {
      case "Call":
        return <PiPhone size={size} />;
      case "Email":
        return <PiEnvelope size={size} />;
      case "Meeting":
        return <PiUsers size={size} />;
      case "Task":
        return <PiListChecks size={size} />;
      default:
        return <PiListChecks size={size} />;
    }
  };

  // Get entity name from activity data (same as ActivitiesTable)
  const getEntityName = (activity: any): string => {
    // Use reference object if available (preferred method)
    if (activity.reference?.entityName) {
      return activity.reference.entityName;
    }

    // Fallback to nested object structure
    // Check if it's an account
    if (activity.account?.name) {
      return activity.account.name;
    }

    // Check if it's a contact
    if (activity.contact?.firstName || activity.contact?.lastName) {
      const firstName = activity.contact.firstName || "";
      const lastName = activity.contact.lastName || "";
      return `${firstName} ${lastName}`.trim();
    }

    // Check if it's a lead
    if (activity.lead?.name) {
      return activity.lead.name;
    }

    // Check if lead has contact info
    if (activity.lead?.contact?.firstName || activity.lead?.contact?.lastName) {
      const firstName = activity.lead.contact.firstName || "";
      const lastName = activity.lead.contact.lastName || "";
      return `${firstName} ${lastName}`.trim();
    }

    // Check if it's an opportunity
    if (activity.opportunity?.name) {
      return activity.opportunity.name;
    }

    return "Unknown";
  };

  // Get entity type based on activity data (same as ActivitiesTable)
  const getEntityType = (activity: any): ActivityEntityType => {
    // Use reference object if available (preferred method)
    if (activity.reference?.entityType) {
      return activity.reference.entityType as ActivityEntityType;
    }

    // Fallback to nested object structure
    // Check if it's an account
    if (activity.account?.name) {
      return "Account";
    }

    // Check if it's a contact
    if (activity.contact?.firstName || activity.contact?.lastName) {
      return "Contact";
    }

    // Check if it's a lead
    if (activity.lead?.name || activity.lead?.contact) {
      return "Lead";
    }

    // Check if it's an opportunity
    if (activity.opportunity?.name) {
      return "Opportunity";
    }

    return "Contact"; // Default fallback
  };

  // Get entity type icon
  const getEntityTypeIcon = (entityType: ActivityEntityType, size = 10) => {
    switch (entityType) {
      case "Contact":
        return <PiUser size={size} />;
      case "Lead":
        return <PiTarget size={size} />;
      case "Opportunity":
        return <PiHandshake size={size} />;
      case "Account":
        return <PiBuilding size={size} />;
      default:
        return <PiUser size={size} />;
    }
  };

  // Format time
  const formatTime = (dateString: string): string => {
    return dayjs(dateString).format("HH:mm");
  };

  // Format created date for tooltip
  const formatCreatedDate = (dateString: string): string => {
    return dayjs(dateString).format("MMM D, YYYY [at] HH:mm");
  };

  // Navigation handlers
  const goToPreviousMonth = () => {
    setCurrentDate(currentDate.subtract(1, "month"));
  };

  const goToNextMonth = () => {
    setCurrentDate(currentDate.add(1, "month"));
  };

  const goToToday = () => {
    setCurrentDate(dayjs());
  };

  // Loading state
  if (loading && activities.length === 0) {
    return (
      <div
        className="gba:flex gba:justify-center gba:p-8"
        data-testid={`${DATA_TEST_ID_PREFIX}-loading`}
      >
        <Spinner size="lg" />
      </div>
    );
  }

  // Hook initialization error
  if (hookError) {
    return (
      <div
        className="gba:p-4"
        data-testid={`${DATA_TEST_ID_PREFIX}-hook-error`}
      >
        <Alert variant="destructive">
          <div className="gba:flex gba:justify-between gba:items-center">
            <div>
              <div className="gba:font-medium">
                Calendar Initialization Error
              </div>
              <div className="gba:text-sm gba:mt-1">{hookError}</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              data-testid={`${DATA_TEST_ID_PREFIX}-reload-button`}
            >
              Reload
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="gba:p-4" data-testid={`${DATA_TEST_ID_PREFIX}-error`}>
        <Alert variant="destructive">
          <div className="gba:flex gba:justify-between gba:items-center">
            <div>
              <div className="gba:font-medium">Error Loading Activities</div>
              <div className="gba:text-sm gba:mt-1">{String(error)}</div>
            </div>
            <Button variant="outline" size="sm" onClick={retry}>
              Retry
            </Button>
          </div>
        </Alert>
      </div>
    );
  }

  return (
    <Card data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle
            data-testid={`${DATA_TEST_ID_PREFIX}-title`}
            className="gba:flex gba:items-center gba:gap-2"
          >
            <PiCalendar className="gba:text-black" size={20} />
            Sales Activities Calendar
          </CardTitle>

          {/* Calendar Navigation */}
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={goToPreviousMonth}
              data-testid={`${DATA_TEST_ID_PREFIX}-prev-month`}
              className="gba:flex gba:items-center gba:gap-1"
            >
              <PiCaretLeft size={14} />
              Previous
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={goToToday}
              data-testid={`${DATA_TEST_ID_PREFIX}-today`}
            >
              Today
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={goToNextMonth}
              data-testid={`${DATA_TEST_ID_PREFIX}-next-month`}
              className="gba:flex gba:items-center gba:gap-1"
            >
              Next
              <PiCaretRight size={14} />
            </Button>
          </div>
        </div>

        {/* Month/Year Display */}
        <div
          className="gba:text-center gba:text-lg gba:font-medium gba:text-gray-700"
          data-testid={`${DATA_TEST_ID_PREFIX}-month-year`}
        >
          {currentDate.format("MMMM YYYY")}
        </div>
      </CardHeader>

      <CardContent className="gba:p-0">
        {/* Calendar Grid */}
        <div className="gba:grid gba:grid-cols-7 gba:border-t">
          {/* Day Headers */}
          {[
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
          ].map((day) => (
            <div
              key={day}
              className="gba:p-3 gba:text-center gba:text-sm gba:font-medium gba:text-gray-600 gba:bg-gray-50 gba:border-b gba:border-r last:gba:border-r-0"
              data-testid={`${DATA_TEST_ID_PREFIX}-day-header-${day.toLowerCase()}`}
            >
              {day.substring(0, 3)}
            </div>
          ))}

          {/* Calendar Days */}
          {calendarDays.map((dayInfo, index) => (
            <div
              key={index}
              className={`
                gba:min-h-[140px] gba:p-2 gba:border-b gba:border-r last:gba:border-r-0 gba:relative
                ${dayInfo.isCurrentMonth ? "gba:bg-white" : "gba:bg-gray-50"}
                ${dayInfo.isToday ? "gba:bg-blue-50" : ""}
              `}
              data-testid={`${DATA_TEST_ID_PREFIX}-day-${dayInfo.date.format(
                "YYYY-MM-DD"
              )}`}
            >
              {/* Day Number */}
              <div
                className={`
                  gba:text-sm gba:font-medium gba:mb-2
                  ${
                    dayInfo.isCurrentMonth
                      ? "gba:text-gray-900"
                      : "gba:text-gray-400"
                  }
                  ${dayInfo.isToday ? "gba:text-blue-600 gba:font-bold" : ""}
                `}
              >
                {dayInfo.date.format("D")}
              </div>

              {/* Activities for this day */}
              <div
                className={`gba:space-y-1 ${
                  dayInfo.activities.length > 3
                    ? "gba:max-h-[200px] gba:overflow-y-auto gba:pr-1"
                    : ""
                }`}
                style={
                  dayInfo.activities.length > 3
                    ? { scrollbarWidth: "thin" }
                    : {}
                }
              >
                {dayInfo.activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="gba:p-1 gba:rounded gba:text-xs gba:relative"
                    style={{
                      backgroundColor: `${
                        ACTIVITY_TYPE_COLORS[
                          activity.activityType?.value || activity.type
                        ]
                      }15`,
                    }}
                    data-testid={`${DATA_TEST_ID_PREFIX}-activity-${activity.id}`}
                  >
                    <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
                      <div
                        style={{
                          color:
                            ACTIVITY_TYPE_COLORS[
                              activity.activityType?.value || activity.type
                            ],
                        }}
                      >
                        {getActivityTypeIcon(
                          activity.activityType?.value || activity.type,
                          10
                        )}
                      </div>
                      <span
                        className="gba:font-medium gba:truncate gba:flex-1"
                        style={{
                          color:
                            ACTIVITY_TYPE_COLORS[
                              activity.activityType?.value || activity.type
                            ],
                        }}
                      >
                        {activity.occurredAt
                          ? formatTime(activity.occurredAt)
                          : "No time"}
                      </span>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant={getActivityScoreBadgeVariant(
                                activity.activityScore
                              )}
                              className="gba:text-[10px] gba:px-1 gba:py-0 gba:cursor-help"
                            >
                              {activity.activityScore}%
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="gba:text-xs gba:space-y-1">
                              <p>
                                <span className="gba:font-medium">
                                  Occurred:
                                </span>{" "}
                                {activity.occurredAt
                                  ? formatCreatedDate(activity.occurredAt)
                                  : "No data"}
                              </p>
                              <p>
                                <span className="gba:font-medium">
                                  Created:
                                </span>{" "}
                                {activity.createdAt
                                  ? formatCreatedDate(activity.createdAt)
                                  : "No data"}
                              </p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    <div className="gba:text-gray-700 gba:font-medium gba:truncate gba:text-[11px] gba:mb-1">
                      {activity.title}
                    </div>

                    <div className="gba:flex gba:items-center gba:gap-1 gba:text-gray-500">
                      {getEntityTypeIcon(getEntityType(activity), 8)}
                      <span className="gba:truncate gba:text-[10px]">
                        {getEntityName(activity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Summary Stats */}
        <div className="gba:p-4 gba:border-t gba:bg-gray-50">
          <div className="gba:text-sm gba:text-gray-500 gba:text-center">
            {total > 0
              ? `${total} activit${total !== 1 ? "ies" : "y"} found`
              : "No activities found"}
            {loading && <span> • Loading...</span>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
