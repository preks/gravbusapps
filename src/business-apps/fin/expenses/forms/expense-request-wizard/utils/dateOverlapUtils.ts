import dayjs from 'dayjs';
import { getCatalogValue, getDateFormat, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

/**
 * Format date and time to ISO string
 * @param givenDate - Date object
 * @param givenTime - Time object
 * @param fallBackDate - Fallback date string
 * @returns Formatted ISO date string
 */
export const formatDateTimeToISO = (
  givenDate: Date | undefined,
  givenTime: Date | undefined,
  fallBackDate: string = ''
): string => {
  if (!givenDate) {
    return fallBackDate || new Date().toISOString();
  }
  
  try {
    // Check if window.lowcoder exists
    if (!window.lowcoder?.formatDateToISO) {
      // Fallback to manual formatting
      const dateStr = givenDate.toISOString().split('T')[0];
      const timeStr = givenTime ? givenTime.toISOString().split('T')[1] : '00:00:00.000Z';
      return `${dateStr}T${timeStr}`;
    }

    // Format with time if provided
    if (givenTime) {
      // Get date from givenDate and time from givenTime
      const dateString = `${dayjs(givenDate).format('YYYY-MM-DD')}T${dayjs(givenTime).format('HH:mm:ss')}`;
      return window.lowcoder.formatDateToISO(dateString);
    } else {
      const dateString = `${dayjs(givenDate).format('YYYY-MM-DD')}T00:00:00`;
      return window.lowcoder.formatDateToISO(dateString);
    }
  } catch (error) {
    console.error('Error formatting date to ISO:', error);
    return new Date().toISOString();
  }
};

/**
 * Get overlap warning message from query response
 * @param queryResponse - Response from getRequestsAbsences query
 * @param currentPlanId - Current expense plan ID
 * @returns Warning message and error flag
 */
export const getOverlapWarningMessage = (
  queryResponse: any,
  currentPlanId?: string
): { message: string; isError: boolean } | null => {
  // Handle different response structures
  const data = queryResponse.data || queryResponse;
  
  if (!data) {
    return null;
  }

  // Priority 1: Check for overlapping employee absences (highest priority, error)
  if (data.EmployeeAbsence && data.EmployeeAbsence.length > 0) {
    const employeeAbsence = data.EmployeeAbsence[0];
    const absenceRequestTimeStampStart = dayjs(employeeAbsence.startDate).format(getDateFormat('date-long'));
    const absenceRequestTimeStampEnd = dayjs(employeeAbsence.endDate).format(getDateFormat('date-long'));
    
    // Use typeName directly from the absence type object
    const absenceType = getCatalogValue(employeeAbsence.type) || 'Absence';
    
    const message = getTranslationFromI18nKeyAndLabel(
      'lowcoder:create_expense_request.add_request_trip_details.periods_overlapping_error_message_absences',
      `The selected date overlaps with an existing event: ${absenceType} from ${absenceRequestTimeStampStart} to ${absenceRequestTimeStampEnd}. Please adjust the date.`,
      {
        absenceType,
        fromDate: absenceRequestTimeStampStart,
        toDate: absenceRequestTimeStampEnd,
        interpolation: {
          escapeValue: false
        }
      }
    );
    
    return { message, isError: true };
  }

  // Priority 2: Check for overlapping expense requests (high priority, error)
  if (data.ExpenseRequest && data.ExpenseRequest.length > 0) {
    const expenseRequest = data.ExpenseRequest[0];
    const expenseRequestTimeStampStart = dayjs(expenseRequest.startDate).format(getDateFormat('date-long'));
    const expenseRequestTimeStampEnd = dayjs(expenseRequest.endDate).format(getDateFormat('date-long'));
    
    const message = getTranslationFromI18nKeyAndLabel(
      'lowcoder:create_expense_request.add_request_trip_details.periods_overlapping_error_message_expense_request',
      `The selected date overlaps with an existing event: Expense Request ${expenseRequest.title} from ${expenseRequestTimeStampStart} to ${expenseRequestTimeStampEnd}. Please adjust the date.`,
      {
        expenseRequestTitle: expenseRequest.title,
        fromDate: expenseRequestTimeStampStart,
        toDate: expenseRequestTimeStampEnd,
        interpolation: {
          escapeValue: false
        }
      }
    );
    
    return { message, isError: true };
  }

  // Priority 3: Check for overlapping expense plans (medium priority, warning)
  if (
    data.ExpensePlan && 
    data.ExpensePlan.length > 0 && 
    data.ExpensePlan[0].id !== currentPlanId
  ) {
    const expensePlan = data.ExpensePlan[0];
    
    const message = getTranslationFromI18nKeyAndLabel(
      'lowcoder:create_expense_request.add_request_trip_details.periods_overlapping_plan_info_message',
      `There is an existing plan ${expensePlan.title} for the selected period. You might want to cancel your request and create a new request based on your existing plan.`,
      {
        expensePlanTitle: expensePlan.title,
        interpolation: {
          escapeValue: false
        }
      }
    );
    
    return { message, isError: false };
  }

  // No overlaps found
  return null;
};
