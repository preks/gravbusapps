import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Spinner,
  Alert,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@newwork/nw-design-system";
import {
  PiCalendar,
  PiCaretLeft,
  PiCaretRight,
  PiPhone,
  PiEnvelope,
  PiUsers,
  PiListChecks,
} from "react-icons/pi";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { SalesTeamMember } from "../../sales-members-list/types";
import {
  useTeamActivitiesData,
  TeamSalesActivity,
} from "../hooks/useTeamActivitiesData";
import dayjs from "dayjs";
import weekday from "dayjs/plugin/weekday";
import localeData from "dayjs/plugin/localeData";

dayjs.extend(weekday);
dayjs.extend(localeData);

const DATA_TEST_ID_PREFIX = "TeamActivitiesCalendar";

interface TeamActivitiesCalendarProps extends BusinessAppContextProps {
  teamId?: string;
  teamMembers: SalesTeamMember[];
}

export const TeamActivitiesCalendar: React.FC<TeamActivitiesCalendarProps> = ({
  teamId: _teamId,
  teamMembers,
  accessToken,
  userInfo,
}) => {
  const [currentDate, setCurrentDate] = useState(dayjs());
  const [selectedMember, setSelectedMember] = useState<string>("all");
  const [selectedDayActivities, setSelectedDayActivities] = useState<{
    date: dayjs.Dayjs;
    activities: TeamSalesActivity[];
  } | null>(null);

  // Get employee IDs for data fetching (including manager/supervisor)
  const employeeIds = useMemo(() => {
    const memberIds = teamMembers
      .map((member) => member.employeeId || member.id)
      .filter((id): id is string => !!id);

    // Extract manager IDs from team members (all team members should have the same manager)
    const managerIds = teamMembers
      .map((member) => member.manager?.id)
      .filter((id): id is string => !!id);

    // Remove duplicates by converting to Set and back to Array
    const allIds = Array.from(new Set([...memberIds, ...managerIds]));

    return allIds;
  }, [teamMembers]);

  // Use real data hook for team activities
  const {
    activities,
    loading: isLoading,
    error,
    loadActivities,
    retry,
  } = useTeamActivitiesData({
    employeeIds,
    accessToken,
    userInfo,
    sortField: "occurredAt",
    sortOrder: "DESC",
    limit: 500, // Load more for calendar view
  });

  // Load data when component mounts or dependencies change
  useEffect(() => {
    if (employeeIds.length > 0) {
      loadActivities();
    }
  }, [employeeIds, loadActivities]);

  // Get unique manager info for dropdown
  const managerInfo = useMemo(() => {
    const managers = teamMembers
      .map((member) => member.manager)
      .filter((manager): manager is NonNullable<typeof manager> => !!manager);

    // Return the first manager (all team members should have the same manager)
    return managers.length > 0 ? managers[0] : null;
  }, [teamMembers]);

  // Filter activities by selected member (including manager)
  const filteredActivities = useMemo(() => {
    if (selectedMember === "all") return activities;
    if (selectedMember === "manager" && managerInfo) {
      return activities.filter(
        (activity) => activity.ownerEmployeeId === managerInfo.id
      );
    }
    return activities.filter(
      (activity) =>
        activity.ownerEmployeeId === selectedMember ||
        activity.ownerEmployee?.fullName === selectedMember
    );
  }, [activities, selectedMember, managerInfo]);

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const startOfMonth = currentDate.startOf("month");
    const endOfMonth = currentDate.endOf("month");
    const startOfCalendar = startOfMonth.startOf("week");
    const endOfCalendar = endOfMonth.endOf("week");

    const days = [];
    let day = startOfCalendar;

    while (day.isBefore(endOfCalendar) || day.isSame(endOfCalendar)) {
      const dayActivities = filteredActivities.filter((activity) => {
        // Check if activity occurred on this date
        if (activity.occurredAt) {
          const occurredDate = dayjs(activity.occurredAt).format("YYYY-MM-DD");
          if (occurredDate === day.format("YYYY-MM-DD")) return true;
        }

        // Check if activity was created on this date
        if (activity.createdAt) {
          const createdDate = dayjs(activity.createdAt).format("YYYY-MM-DD");
          if (createdDate === day.format("YYYY-MM-DD")) return true;
        }

        return false;
      });

      days.push({
        date: day,
        isCurrentMonth: day.month() === currentDate.month(),
        isToday: day.isSame(dayjs(), "day"),
        activities: dayActivities,
      });
      day = day.add(1, "day");
    }

    return days;
  }, [currentDate, filteredActivities]);

  // Get activity type icon
  const getActivityIcon = (activityType: string) => {
    const type = activityType?.toLowerCase() || "";
    if (type.includes("call") || type.includes("phone"))
      return <PiPhone className="gba:w-3 gba:h-3" />;
    if (type.includes("email") || type.includes("message"))
      return <PiEnvelope className="gba:w-3 gba:h-3" />;
    if (type.includes("meeting") || type.includes("demo"))
      return <PiUsers className="gba:w-3 gba:h-3" />;
    return <PiListChecks className="gba:w-3 gba:h-3" />;
  };

  // Get activity type color
  const getActivityColor = (activityType: string) => {
    const type = activityType?.toLowerCase() || "";
    if (type.includes("call") || type.includes("phone")) return "#3b82f6"; // blue
    if (type.includes("email") || type.includes("message")) return "#22c55e"; // green
    if (type.includes("meeting") || type.includes("demo")) return "#a855f7"; // purple
    return "#f59e0b"; // orange for tasks and others
  };

  // Get entity name from activity data (same logic as individual calendar)
  const getEntityName = (activity: TeamSalesActivity): string => {
    // Use reference object if available (preferred method)
    if (activity.reference?.entityName) {
      return activity.reference.entityName;
    }

    // Fallback to nested object structure
    if (activity.account?.name) return activity.account.name;
    if (activity.contact?.firstName && activity.contact?.lastName) {
      return `${activity.contact.firstName} ${activity.contact.lastName}`;
    }
    if (activity.lead?.name) return activity.lead.name;
    if (activity.opportunity?.name) return activity.opportunity.name;
    return "Unknown Entity";
  };

  const goToPreviousMonth = () => {
    setCurrentDate(currentDate.subtract(1, "month"));
  };

  const goToNextMonth = () => {
    setCurrentDate(currentDate.add(1, "month"));
  };

  // Handle opening drawer with all activities for a specific day
  const handleShowMoreActivities = (
    date: dayjs.Dayjs,
    activities: TeamSalesActivity[]
  ) => {
    setSelectedDayActivities({ date, activities });
  };

  if (error) {
    return (
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-error`}>
        <CardContent className="gba:p-6">
          <Alert variant="destructive">
            <span>Error loading team activities</span>
            <Button
              variant="outline"
              size="sm"
              onClick={retry}
              className="gba:ml-2"
            >
              Retry
            </Button>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card data-testid={DATA_TEST_ID_PREFIX}>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <PiCalendar className="gba:w-5 gba:h-5 gba:text-blue-600" />
              Team Activities Calendar
            </CardTitle>
            <div className="gba:flex gba:items-center gba:gap-4">
              {/* Member Filter */}
              <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger className="gba:w-48">
                  <SelectValue placeholder="Filter by member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Team Members</SelectItem>
                  {managerInfo && (
                    <SelectItem value="manager">
                      {managerInfo.name} (Manager)
                    </SelectItem>
                  )}
                  {teamMembers.map((member) => (
                    <SelectItem
                      key={member.id}
                      value={member.employeeId || member.id}
                    >
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Month Navigation */}
              <div className="gba:flex gba:items-center gba:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousMonth}
                  data-testid={`${DATA_TEST_ID_PREFIX}-prev-month`}
                >
                  <PiCaretLeft className="gba:w-4 gba:h-4" />
                </Button>
                <span className="gba:font-medium gba:min-w-32 gba:text-center">
                  {currentDate.format("MMMM YYYY")}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextMonth}
                  data-testid={`${DATA_TEST_ID_PREFIX}-next-month`}
                >
                  <PiCaretRight className="gba:w-4 gba:h-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="gba:flex gba:justify-center gba:p-8">
              <Spinner size="lg" />
            </div>
          ) : (
            <div className="gba:grid gba:grid-cols-7 gba:gap-1">
              {/* Calendar Header */}
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div
                  key={day}
                  className="gba:p-3 gba:text-center gba:font-medium gba:text-gray-500 gba:text-sm"
                >
                  {day}
                </div>
              ))}

              {/* Calendar Days */}
              {calendarDays.map((day, index) => (
                <div
                  key={index}
                  className={`
                    gba:min-h-28 gba:p-2 gba:border gba:border-gray-200 gba:rounded-sm
                    ${day.isCurrentMonth ? "gba:bg-white" : "gba:bg-gray-50"}
                    ${day.isToday ? "gba:ring-2 gba:ring-blue-500" : ""}
                  `}
                  data-testid={`${DATA_TEST_ID_PREFIX}-day-${day.date.format(
                    "YYYY-MM-DD"
                  )}`}
                >
                  <div
                    className={`
                    gba:text-sm gba:font-medium gba:mb-1
                    ${
                      day.isCurrentMonth
                        ? "gba:text-gray-900"
                        : "gba:text-gray-400"
                    }
                    ${day.isToday ? "gba:text-blue-600" : ""}
                  `}
                  >
                    {day.date.format("D")}
                  </div>

                  <div className="gba:space-y-1">
                    {day.activities.slice(0, 3).map((activity) => {
                      const activityType =
                        activity.activityType?.value || "Task";
                      const employeeName =
                        activity.ownerEmployee?.fullName || "Unknown";
                      const entityName = getEntityName(activity);
                      const time = activity.createdAt
                        ? dayjs(activity.createdAt).format("MMM DD, YYYY HH:mm")
                        : "No time";

                      // Check if this activity belongs to the manager
                      const isManagerActivity =
                        managerInfo &&
                        activity.ownerEmployeeId === managerInfo.id;

                      return (
                        <Tooltip key={activity.id}>
                          <TooltipTrigger asChild>
                            <div
                              className={`gba:px-1 gba:py-0.5 gba:rounded gba:text-xs gba:text-white gba:flex gba:items-center gba:gap-1 gba:truncate gba:cursor-pointer ${
                                isManagerActivity
                                  ? "gba:ring-1 gba:ring-yellow-300 gba:ring-opacity-50"
                                  : ""
                              }`}
                              style={{
                                backgroundColor: getActivityColor(activityType),
                              }}
                            >
                              {getActivityIcon(activityType)}
                              <span className="gba:truncate gba:flex-1">
                                {isManagerActivity && (
                                  <span className="gba:text-yellow-200">
                                    [MGR]{" "}
                                  </span>
                                )}
                                <span className="gba:font-medium">
                                  {employeeName.split(" ")[0]}
                                </span>
                                : {activity.title}
                              </span>
                              <span className="gba:text-[10px] gba:opacity-80">
                                {time}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>
                            <div className="gba:text-xs gba:space-y-1">
                              <p>
                                <span className="gba:font-medium">
                                  Employee:
                                </span>{" "}
                                {employeeName}
                                {isManagerActivity && (
                                  <span className="gba:text-yellow-600 gba:ml-1">
                                    (Manager)
                                  </span>
                                )}
                              </p>
                              <p>
                                <span className="gba:font-medium">
                                  Activity:
                                </span>{" "}
                                {activity.title}
                              </p>
                              <p>
                                <span className="gba:font-medium">Type:</span>{" "}
                                {activityType}
                              </p>
                              <p>
                                <span className="gba:font-medium">Entity:</span>{" "}
                                {entityName}
                              </p>
                              <p>
                                <span className="gba:font-medium">
                                  Created:
                                </span>{" "}
                                {time}
                              </p>
                              {activity.occurredAt && (
                                <p>
                                  <span className="gba:font-medium">
                                    Occurred:
                                  </span>{" "}
                                  {dayjs(activity.occurredAt).format(
                                    "MMM DD, YYYY"
                                  )}
                                </p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}

                    {day.activities.length > 3 && (
                      <div
                        className="gba:text-xs gba:text-blue-600 gba:text-center gba:cursor-pointer gba:hover:text-blue-800 gba:hover:underline gba:transition-colors"
                        onClick={() =>
                          handleShowMoreActivities(day.date, day.activities)
                        }
                        data-testid={`${DATA_TEST_ID_PREFIX}-show-more-${day.date.format(
                          "YYYY-MM-DD"
                        )}`}
                      >
                        +{day.activities.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activities Details Sheet */}
      <Sheet
        open={!!selectedDayActivities}
        onOpenChange={(open) => !open && setSelectedDayActivities(null)}
      >
        <SheetContent className="gba:w-[450px] gba:sm:w-[600px] gba:max-w-[90vw] gba:p-0 gba:flex gba:flex-col">
          <SheetHeader className="gba:px-6 gba:py-6 gba:border-b gba:border-border gba:shrink-0">
            <SheetTitle className="gba:text-xl gba:font-semibold gba:text-left">
              Activities for{" "}
              {selectedDayActivities?.date.format("MMMM D, YYYY")}
            </SheetTitle>
          </SheetHeader>
          <div className="gba:flex-1 gba:overflow-auto gba:px-6 gba:py-4">
            {selectedDayActivities && (
              <div className="gba:space-y-4">
                {selectedDayActivities.activities.map((activity) => {
                  const activityType = activity.activityType?.value || "Task";
                  const employeeName =
                    activity.ownerEmployee?.fullName || "Unknown";
                  const entityName = getEntityName(activity);
                  const time = activity.createdAt
                    ? dayjs(activity.createdAt).format("MMM DD, YYYY HH:mm")
                    : "No time";

                  // Check if this activity belongs to the manager
                  const isManagerActivity =
                    managerInfo && activity.ownerEmployeeId === managerInfo.id;

                  return (
                    <div
                      key={activity.id}
                      className="gba:p-4 gba:border gba:border-gray-200 gba:rounded-lg gba:bg-white gba:shadow-sm"
                      data-testid={`${DATA_TEST_ID_PREFIX}-drawer-activity-${activity.id}`}
                    >
                      <div className="gba:flex gba:items-start gba:justify-between gba:mb-3">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <div
                            style={{ color: getActivityColor(activityType) }}
                          >
                            {getActivityIcon(activityType)}
                          </div>
                          <h3 className="gba:font-semibold gba:text-gray-900">
                            {activity.title}
                          </h3>
                        </div>
                        <span
                          className="gba:text-sm gba:font-medium gba:px-2 gba:py-1 gba:rounded gba:text-white"
                          style={{
                            backgroundColor: getActivityColor(activityType),
                          }}
                        >
                          {time}
                        </span>
                      </div>

                      <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:text-sm">
                        <div>
                          <span className="gba:font-medium gba:text-gray-700">
                            Employee:
                          </span>
                          <div className="gba:text-gray-900">
                            {employeeName}
                            {isManagerActivity && (
                              <span className="gba:text-yellow-600 gba:ml-1 gba:font-medium">
                                (Manager)
                              </span>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="gba:font-medium gba:text-gray-700">
                            Type:
                          </span>
                          <div className="gba:text-gray-900">
                            {activityType}
                          </div>
                        </div>
                        <div>
                          <span className="gba:font-medium gba:text-gray-700">
                            Entity:
                          </span>
                          <div className="gba:text-gray-900">{entityName}</div>
                        </div>
                        <div>
                          <span className="gba:font-medium gba:text-gray-700">
                            Occurred:
                          </span>
                          <div className="gba:text-gray-900">
                            {activity.occurredAt
                              ? dayjs(activity.occurredAt).format(
                                  "MMM DD, YYYY"
                                )
                              : "No data"}
                          </div>
                        </div>
                      </div>

                      {activity.description && (
                        <div className="gba:mt-3">
                          <span className="gba:font-medium gba:text-gray-700">
                            Description:
                          </span>
                          <div className="gba:text-gray-900 gba:mt-1">
                            {activity.description}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                {selectedDayActivities.activities.length === 0 && (
                  <div className="gba:text-center gba:text-gray-500 gba:py-8">
                    No activities found for this day.
                  </div>
                )}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};

export default TeamActivitiesCalendar;
