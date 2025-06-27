import React, { useMemo } from 'react';
import { Typography, Spin, Alert } from 'antd';
import { CalendarTimeline, TimelineItem, TimelineEvent } from '@newwork/gravity-ui-catalog'; // Assuming these types are exported
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { useCalendarExpensePlans, ExpensePlan } from '../../../hooks/useCalendarExpensePlans';
import { useGetExpenseRequests, ExpenseRequest } from '../../../hooks/useGetExpenseRequests';
import { ExpenseStatus } from '../../../utils'; // Assuming utils exist, getExpensePlanStatusDisplay removed
import { formatDate } from '@/common/utils/windowUtils';

const { Text } = Typography;

// Define the shape of items for the timeline (e.g., Employees or Expense Categories)
interface ExpenseTimelineItem extends TimelineItem {
  // id is inherited from TimelineItem
  name: string;
  detail?: string; // e.g., department or job title
  // Add any other properties you need to render the item
}

// Define the shape of events for the timeline (e.g., Expense Plans)
interface ExpenseTimelineEvent extends TimelineEvent {
  eventType: 'Plan' | 'Request'; // To differentiate event source
  // id, itemId, startDate, endDate, label, color are inherited or can be part of TimelineEvent

  // Add any other properties related to the expense event
}

export interface ExpenseCalendarProps extends BusinessAppContextProps {
  // Add any specific props for ExpenseCalendarTab if needed
}

const getEventTypeFromStatus = (status: ExpenseStatus): string => {
  switch (status) {
    case ExpenseStatus.APPROVED:
    case ExpenseStatus.VERIFIED:
    case ExpenseStatus.BOOKED:
    case ExpenseStatus.TRANSFERRED:
    case ExpenseStatus.RETURNED:
      return 'personal'; // Blue - In Transit
    case ExpenseStatus.PENDING:
      return 'pending';  // Yellow - Approval Required
    case ExpenseStatus.PAID:
    case ExpenseStatus.CLOSED:
      return 'approved'; // Green - Paid
    default:
      return 'other_expense_status'; // Gray
  }
};

export const ExpenseCalendar: React.FC<ExpenseCalendarProps> = (props) => {
  const { accessToken, userInfo } = props;
  
  // Use hardcoded manager ID for consistency with other tabs - used by the hooks internally

  // Placeholder: Adapt useGetExpensePlans or create a new hook for calendar data
  // This hook call will likely need different parameters (e.g., wider date range, all employees under manager)
  const {
    plans: expensePlans,
    loading: isLoadingPlans,
    error: plansError
  } = useCalendarExpensePlans({
    accessToken,
    userInfo,
    pageSize: 1000, // Fetch more for a calendar view, adjust as needed
  });

  const {
    requests: expenseRequests,
    isLoading: isLoadingRequests,
    error: requestsError,
    fetchRequests, // Assuming we might want to trigger refetch
  } = useGetExpenseRequests({
    accessToken,
    // pageSize for requests can also be high for calendar view if needed
  });

  // useEffect to fetch requests - similar to how useGetExpensePlans might internally call fetchPlans
  // This depends on how useGetExpenseRequests is structured. If it auto-fetches, this might not be needed.
  // For now, assuming it needs an explicit call or fetches on mount based on its own useEffect.
  // If fetchRequests is available and needs to be called with specific params for calendar:
  React.useEffect(() => {
    if (typeof fetchRequests === 'function') {
      fetchRequests('', 1, 1000); // Example: fetch all requests, page 1, 1000 items
    }
  }, [fetchRequests]);
  


  const timelineItems = useMemo((): ExpenseTimelineItem[] => {
    const employeesMap = new Map<string, ExpenseTimelineItem>();

    expensePlans?.forEach((item: ExpensePlan) => {
      if (item.employee && !employeesMap.has(item.employee.id)) {
        employeesMap.set(item.employee.id, {
          id: item.employee.id,
          name: item.employee.displayName ?? item.employee.fullName,
          detail: item.employee.employeePosition?.organizationalUnit?.name ?? '',
        });
      }
    });

    expenseRequests?.forEach((item: ExpenseRequest) => {
      if (item.employee && !employeesMap.has(item.employee.id)) {
        employeesMap.set(item.employee.id, {
          id: item.employee.id,
          name: item.employee.displayName ?? item.employee.fullName,
          // Assuming department info might be structured differently or not present for requests
          // For consistency, one might need to ensure `item.employee.department.name` path is valid or provide fallback
          detail: (item.employee as any).department?.name ?? ((item.employee as any).employeePosition?.organizationalUnit?.name) ?? '',
        });
      }
    });

    return Array.from(employeesMap.values());
  }, [expensePlans, expenseRequests]);

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

      events.push({
        id: `plan-${plan.id}`,
        itemId: plan.employee.id,
        startDate: eventStartDate, // Keep original date format for calendar functionality
        endDate: eventEndDate,     // Keep original date format for calendar functionality
        type: getEventTypeFromStatus(plan.status as ExpenseStatus),
        note: `${plan.title || 'Expense Plan'} (${formatDate(plan.startDate, 'date.short')} - ${formatDate(plan.endDate, 'date.short')})`,
        status: plan.status,
        title: 'Expense Plan',
        eventType: 'Plan',
      });
    });

    expenseRequests?.forEach((request: ExpenseRequest) => {
      // Assuming getExpensePlanStatusDisplay and ExpenseStatus can be used for requests
      // If not, a getExpenseRequestStatusDisplay would be needed here.
      let eventStartDate = request.startDate;
      let eventEndDate = request.endDate;

      if (!eventStartDate || !eventEndDate) {
        eventStartDate = request.requestDate;
        eventEndDate = request.requestDate;
      }

      // Skip if no valid date can be determined
      if (!eventStartDate || !eventEndDate) return;
      
      // Ensure employee ID exists for itemId
      if (!request.employee?.id) return;

      events.push({
        id: `request-${request.id}`,
        itemId: request.employee.id,
        startDate: eventStartDate, // Keep original date format for calendar functionality
        endDate: eventEndDate,     // Keep original date format for calendar functionality
        type: getEventTypeFromStatus(request.status as ExpenseStatus),
        note: `${request.title || 'Expense Request'} (${formatDate(request.requestDate, 'date.short')})`,
        status: request.status,
        title: 'Expense Request',
        eventType: 'Request',
      });
    });

    return events;
  }, [expensePlans, expenseRequests]);

  const renderDataBody = () => {
    if (isLoadingPlans || isLoadingRequests) return <div className="gba:flex gba:justify-center gba:items-center gba:h-full"><Spin size="large" /></div>;
    
    let errorMessages = [];
    if (plansError) errorMessages.push(`Error fetching expense plans: ${plansError.message}`);
    if (requestsError) errorMessages.push(`Error fetching expense requests: ${requestsError}`); // Use requestsError directly
    if (errorMessages.length > 0) return <Alert message={errorMessages.join('\n')} type="error" showIcon />;

    if (timelineItems.length === 0 && timelineEvents.length === 0) return <Text>No expense data available for the calendar view.</Text>;

    return (
      <CalendarTimeline<ExpenseTimelineItem, ExpenseTimelineEvent>
        title="Expense Calendar"
        items={timelineItems}
        events={timelineEvents}
        itemLabel="Employee"
        searchPlaceholder="Search Employees..."
        renderItemContent={(item) => (
          <div className="gba:p-2">
            <Text strong>{item.name}</Text>
            {item.detail && <Text type="secondary" style={{ fontSize: '12px', display: 'block' }}>{item.detail}</Text>}
          </div>
        )}
        legendItems={[
          { label: 'In Transit', color: 'blue' },
          { label: 'Approval Required', color: 'yellow' },
          { label: 'Paid', color: 'green' }
        ]}
        // initialDate={new Date()} // Optional: set an initial date
        // initialViewRange={30} // Optional: set initial number of days to show
      />
    );
  };

  // Add debugging logs for calendar data
  React.useEffect(() => {
    console.log('Expense Calendar data:', {
      plans: expensePlans?.length || 0,
      requests: expenseRequests?.length || 0,
      timelineItems: timelineItems?.length || 0,
      timelineEvents: timelineEvents?.length || 0
    });
  }, [expensePlans, expenseRequests, timelineItems, timelineEvents]);

  return (
    <div>{renderDataBody()}</div>
  );
};

export default ExpenseCalendar;
