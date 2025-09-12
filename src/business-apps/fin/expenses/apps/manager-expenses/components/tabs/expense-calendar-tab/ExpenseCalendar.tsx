import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Typography, Spin, Alert } from "antd";
import { CalendarTimeline } from "@newwork/gravity-ui-catalog";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useCalendarExpensePlans, ExpensePlan } from "../../../hooks/useCalendarExpensePlans";
import { useGetExpenseRequests, ExpenseRequest } from "../../../hooks/useGetExpenseRequests";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";
import { GET_ALL_TEAM_EMPLOYEES } from "../../../queries/expenseDashboard";
import { getCurrentActiveStructureId } from "@/common/utils/windowUtils";
import {
  ExpenseStatus,
  getExpensePlanStatusDisplay,
  getExpenseRequestStatusDisplay,
} from "../../../utils";
import {
  getTranslationFromI18nKeyAndLabel,
  getCurrentActiveUserLocale,
} from "@/common/utils/windowUtils";

const { Text } = Typography;

interface TeamEmployee {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  fullName?: string;
  displayName?: string;
  employeePosition?: {
    organizationalUnit?: {
      name: string;
    };
  };
}

interface ExpenseTimelineItem {
  id: string;
  name: string;
  detail?: string;
}

interface ExpenseTimelineEvent {
  id: string;
  itemId: string;
  startDate: string;
  endDate: string;
  type: string;
  note: string;
  status: string;
  title: string;
  eventType: "Plan" | "Request";
}

export interface ExpenseCalendarProps extends BusinessAppContextProps {
  moduleColor?: string;
}

export const ExpenseCalendar: React.FC<ExpenseCalendarProps> = (props) => {
  const { accessToken, userInfo } = props;

  const userLocale = getCurrentActiveUserLocale();
  const graphQLClient = useGraphQLClient(accessToken);

  // State for team employees
  const [allTeamEmployees, setAllTeamEmployees] = useState<TeamEmployee[]>([]);
  const [isLoadingEmployees, setIsLoadingEmployees] = useState<boolean>(false);
  const [employeesError, setEmployeesError] = useState<string | null>(null);

  const {
    plans: expensePlans,
    loading: isLoadingPlans,
    error: plansError,
  } = useCalendarExpensePlans({
    accessToken,
    userInfo,
    pageSize: 1000,
  });

  const {
    requests: expenseRequests,
    isLoading: isLoadingRequests,
    error: requestsError,
  } = useGetExpenseRequests({
    accessToken,
    userInfo,
  });

  // Fetch team employees
  const fetchTeamEmployees = useCallback(async () => {
    if (!accessToken || !userInfo?.employeeDetails?.employeeId) {
      setEmployeesError("Access token or manager ID not found");
      setAllTeamEmployees([]);
      setIsLoadingEmployees(false);
      return;
    }

    setIsLoadingEmployees(true);
    setEmployeesError(null);

    try {
      const managerId = userInfo.employeeDetails.employeeId;
      const structureId = getCurrentActiveStructureId();

      const result = await graphQLClient.request(GET_ALL_TEAM_EMPLOYEES, {
        managerId,
        activeStructure: structureId,
      });

      const teamEmployees = result?.Employee || [];

      // Transform the data to ensure consistent naming
      const transformedEmployees = teamEmployees.map((emp: any) => ({
        id: emp.id,
        userId: emp.userId,
        firstName: emp.firstName,
        lastName: emp.lastName,
        fullName: emp.fullName || `${emp.firstName} ${emp.lastName}`,
        displayName: emp.displayName || `${emp.firstName} ${emp.lastName}`,
        employeePosition: emp.employeePosition,
      }));

      setAllTeamEmployees(transformedEmployees);
    } catch (err) {
      setEmployeesError(err instanceof Error ? err.message : "Failed to fetch team employees");
      setAllTeamEmployees([]);
    } finally {
      setIsLoadingEmployees(false);
    }
  }, [accessToken, userInfo?.employeeDetails?.employeeId, graphQLClient]);

  useEffect(() => {
    if (accessToken && userInfo?.employeeDetails?.employeeId) {
      fetchTeamEmployees();
    }
  }, [fetchTeamEmployees]);

  const mapToCalendarTimelineType = (type: string): string => {
    switch (type) {
      case "draft":
        return "cancelled";
      case "waiting":
        return "pending";
      case "task":
        return "pending";
      case "completed":
        return "approved";
      case "error":
        return "rejected";
      default:
        return "cancelled";
    }
  };

  const getColorForType = (type: string): string => {
    switch (type) {
      case "draft":
        return "#797d82";
      case "waiting":
        return "#0094D1";
      case "task":
        return "#FF9E02";
      case "completed":
        return "#0DBC7B";
      case "error":
        return "#DE1D49";
      default:
        return "#797d82";
    }
  };

  const timelineItems = useMemo((): ExpenseTimelineItem[] => {
    // Start with all team employees as the base
    const employeesMap = new Map<string, ExpenseTimelineItem>();

    // Add all team employees first (even those without expenses)
    allTeamEmployees?.forEach((employee: TeamEmployee) => {
      if (employee.id && !employeesMap.has(employee.id)) {
        employeesMap.set(employee.id, {
          id: employee.id,
          name: employee.fullName ?? employee.displayName ?? "Unknown Employee",
          detail: employee.employeePosition?.organizationalUnit?.name ?? "",
        });
      }
    });

    // Then add any employees from expense plans that might not be in the team list
    expensePlans?.forEach((item: ExpensePlan) => {
      if (item.employee && item.employee.id && !employeesMap.has(item.employee.id)) {
        employeesMap.set(item.employee.id, {
          id: item.employee.id,
          name: item.employee.fullName ?? item.employee.displayName ?? "Unknown Employee",
          detail: item.employee.employeePosition?.organizationalUnit?.name ?? "",
        });
      }
    });

    // Then add any employees from expense requests that might not be in the team list
    expenseRequests?.forEach((item: ExpenseRequest) => {
      if (item.employee && item.employee.id && !employeesMap.has(item.employee.id)) {
        employeesMap.set(item.employee.id, {
          id: item.employee.id,
          name: item.employee.fullName ?? item.employee.displayName ?? "Unknown Employee",
          detail:
            (item.employee as any).department?.name ??
            (item.employee as any).employeePosition?.organizationalUnit?.name ??
            "",
        });
      }
    });

    return Array.from(employeesMap.values());
  }, [allTeamEmployees, expensePlans, expenseRequests]);

  const timelineEvents = useMemo((): ExpenseTimelineEvent[] => {
    const events: ExpenseTimelineEvent[] = [];

    expensePlans?.forEach((plan: ExpensePlan) => {
      let eventStartDate = plan.startDate;
      let eventEndDate = plan.endDate;

      if (!eventStartDate || !eventEndDate) {
        eventStartDate = plan.planDate;
        eventEndDate = plan.planDate;
      }

      // Skip if no valid date can be determined
      if (!eventStartDate || !eventEndDate) return;

      // Get proper status display
      const statusDisplay = getExpensePlanStatusDisplay(plan.status as ExpenseStatus);

      events.push({
        id: `plan-${plan.id}`,
        itemId: plan.employee?.id || "unknown",
        startDate: new Date(eventStartDate).toISOString(),
        endDate: new Date(eventEndDate).toISOString(),
        type: mapToCalendarTimelineType(statusDisplay.type), // Map to CalendarTimeline recognized types
        note: `${plan.title || "Expense Plan"} - ${statusDisplay.label} (${new Date(
          eventStartDate,
        ).toLocaleDateString(
          userLocale,
        )} - ${new Date(eventEndDate).toLocaleDateString(userLocale)})`,
        status: statusDisplay.label,
        title: plan.title || "Expense Plan",
        eventType: "Plan",
      });
    });

    expenseRequests?.forEach((request: ExpenseRequest) => {
      let eventStartDate = request.startDate;
      let eventEndDate = request.endDate;

      if (!eventStartDate || !eventEndDate) {
        eventStartDate = request.requestDate;
        eventEndDate = request.requestDate;
      }

      if (!eventStartDate || !eventEndDate) return;

      if (!request.employee?.id) return;

      const statusDisplay = getExpenseRequestStatusDisplay(request.status as ExpenseStatus);

      events.push({
        id: `request-${request.id}`,
        itemId: request.employee.id,
        startDate: new Date(eventStartDate).toISOString(),
        endDate: new Date(eventEndDate).toISOString(),
        type: mapToCalendarTimelineType(statusDisplay.type), // Map to CalendarTimeline recognized types
        note: `${request.title || "Expense Request"} - ${statusDisplay.label} (${new Date(
          eventStartDate,
        ).toLocaleDateString(
          userLocale,
        )} - ${new Date(eventEndDate).toLocaleDateString(userLocale)})`,
        status: statusDisplay.label,
        title: request.title || "Expense Request",
        eventType: "Request",
      });
    });

    return events;
  }, [expensePlans, expenseRequests, userLocale]);

  const legendItems = useMemo(() => {
    const uniqueStatusTypes = new Map<string, { label: string; type: string }>();

    expensePlans?.forEach((plan: ExpensePlan) => {
      const statusDisplay = getExpensePlanStatusDisplay(plan.status as ExpenseStatus);
      uniqueStatusTypes.set(statusDisplay.type, {
        label: statusDisplay.label,
        type: statusDisplay.type,
      });
    });

    expenseRequests?.forEach((request: ExpenseRequest) => {
      const statusDisplay = getExpenseRequestStatusDisplay(request.status as ExpenseStatus);
      uniqueStatusTypes.set(statusDisplay.type, {
        label: statusDisplay.label,
        type: statusDisplay.type,
      });
    });

    const legendItems = Array.from(uniqueStatusTypes.values()).map((status) => ({
      label: status.label,
      color: getColorForType(status.type),
    }));

    return legendItems;
  }, [expensePlans, expenseRequests]);

  const renderDataBody = () => {
    if (isLoadingPlans || isLoadingRequests || isLoadingEmployees)
      return (
        <div className="gba:flex gba:justify-center gba:items-center gba:h-full">
          <Spin size="large" />
        </div>
      );

    let errorMessages = [];
    if (plansError) errorMessages.push(`Error fetching expense plans: ${plansError.message}`);
    if (requestsError) errorMessages.push(`Error fetching expense requests: ${requestsError}`);
    if (employeesError) errorMessages.push(`Error fetching team employees: ${employeesError}`);
    if (errorMessages.length > 0)
      return <Alert message={errorMessages.join("\n")} type="error" showIcon />;

    if (timelineItems.length === 0 && timelineEvents.length === 0)
      return <Text>No expense data available for the calendar view.</Text>;

    return (
      <CalendarTimeline<ExpenseTimelineItem, ExpenseTimelineEvent>
        title={getTranslationFromI18nKeyAndLabel(
          "lowcoder:team_expenses_page.dashboard_tab.expense_calendar",
          "Expense Calendar",
        )}
        items={timelineItems}
        events={timelineEvents}
        itemLabel={getTranslationFromI18nKeyAndLabel(
          "lowcoder:hr_absences.create_absence.employee",
          "Employee",
        )}
        searchPlaceholder={getTranslationFromI18nKeyAndLabel(
          "lowcoder:expense_request_table.employee_search_filter",
          "Search Employee...",
        )}
        renderItemContent={(item) => (
          <div className="gba:p-2">
            <Text strong>{item.name}</Text>
            {item.detail && (
              <Text type="secondary" style={{ fontSize: "12px", display: "block" }}>
                {item.detail}
              </Text>
            )}
          </div>
        )}
        legendItems={legendItems}
      />
    );
  };

  return <div>{renderDataBody()}</div>;
};

export default ExpenseCalendar;
