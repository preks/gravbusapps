import dayjs from 'dayjs';
import { getCatalogValue, getDateFormat, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { EXPENSE_STATUS } from '../constants/constants';

/**
 * Get overlap warning message from query response
 * @param queryResponse - Response from getPlansAbsences query
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
      'lowcoder:add_items_to_plan.add_trip_info_to_plan.periods_overlapping_error_message_absences',
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
    const approvedStatuses = [
      EXPENSE_STATUS.APPROVED,
      EXPENSE_STATUS.VERIFIED,
      EXPENSE_STATUS.BOOKED,
      EXPENSE_STATUS.TRANSFERRED,
      EXPENSE_STATUS.PAID
    ];
    if (approvedStatuses.includes(expenseRequest.status)) {
      const expenseRequestTimeStampStart = dayjs(expenseRequest.startDate).format(getDateFormat('date-long'));
      const expenseRequestTimeStampEnd = dayjs(expenseRequest.endDate).format(getDateFormat('date-long'));
      
      const message = getTranslationFromI18nKeyAndLabel(
        'lowcoder:add_items_to_plan.add_trip_info_to_plan.periods_overlapping_error_message_expense_request',
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
  }

  // Priority 3: Check for overlapping expense plans (medium priority, warning)
  if (
    data.ExpensePlan && 
    data.ExpensePlan.length > 0 && 
    data.ExpensePlan[0].id !== currentPlanId && (
        data.ExpensePlan[0].status === EXPENSE_STATUS.CREATED || data.ExpensePlan[0].status === EXPENSE_STATUS.REJECTED
    )
  ) {
    const expensePlan = data.ExpensePlan[0];
    const expensePlanTimeStampStart =dayjs(expensePlan.startDate).format(getDateFormat('date-long'))
    const expensePlanTimeStampEnd = dayjs(expensePlan.endDate).format(getDateFormat('date-long'))
    const message = getTranslationFromI18nKeyAndLabel(
      'lowcoder:add_items_to_plan.add_trip_info_to_plan.period_overlapping_planned_event_plan',
      `The selected date overlaps with a planned event: Expense Plan ${expensePlan.title} from ${expensePlanTimeStampStart} to ${expensePlanTimeStampEnd}. Please review before submitting if adjustments are needed.`,
      {
        planTitle: expensePlan.title, planTimeStampStart: expensePlanTimeStampStart, planTimeStampEnd: expensePlanTimeStampEnd,
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