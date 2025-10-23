import dayjs from 'dayjs'
import { getCatalogValue, getDateFormat } from '@/common/utils/windowUtils'
import { getTranslatedMessage } from '../../shared/utils/translationUtils'

/**
 * Get overlap warning message from query response
 * @param queryResponse - Response from getRequestsAbsences query
 * @param currentPlanId - Current expense plan ID
 * @returns Warning message and error flag
 *
 * Note: Similar logic exists in Plan wizard but with different translation keys
 * and business rules. The duplication is intentional and domain-specific.
 */
export const getOverlapWarningMessage = (
  queryResponse: any,
  currentPlanId?: string
): { message: string; isError: boolean } | null => {
  // Handle different response structures
  const data = queryResponse.data || queryResponse

  if (!data) {
    return null
  }

  // Priority 1: Check for overlapping employee absences (highest priority, error)
  if (data.EmployeeAbsence && data.EmployeeAbsence.length > 0) {
    const employeeAbsence = data.EmployeeAbsence[0]
    const absenceRequestTimeStampStart = dayjs(employeeAbsence.startDate).format(getDateFormat('date-long'))
    const absenceRequestTimeStampEnd = dayjs(employeeAbsence.endDate).format(getDateFormat('date-long'))

    // Use typeName directly from the absence type object
    const absenceType = getCatalogValue(employeeAbsence.type) || 'Absence'

    const message = getTranslatedMessage(
      'lowcoder:create_expense_request.add_request_trip_details.period_overlapping_existing_event_no_title',
      `The selected date overlaps with an existing event: ${absenceType} from ${absenceRequestTimeStampStart} to ${absenceRequestTimeStampEnd}. Please adjust the date.`,
      {
        employeeAbsence: absenceType,
        absenceRequestTimeStampStart,
        absenceRequestTimeStampEnd
      }
    )

    return { message, isError: true }
  }

  // Priority 2: Check for overlapping expense requests (high priority, error)
  if (data.ExpenseRequest && data.ExpenseRequest.length > 0) {
    const expenseRequest = data.ExpenseRequest[0]
    const expenseRequestTimeStampStart = dayjs(expenseRequest.startDate).format(getDateFormat('date-long'))
    const expenseRequestTimeStampEnd = dayjs(expenseRequest.endDate).format(getDateFormat('date-long'))

    const message = getTranslatedMessage(
      'lowcoder:create_expense_request.add_request_trip_details.period_overlapping_existing_event_expense_request',
      `The selected date overlaps with an existing event: Expense Request ${expenseRequest.title} from ${expenseRequestTimeStampStart} to ${expenseRequestTimeStampEnd}. Please adjust the date.`,
      {
        requestTitle: expenseRequest.title,
        requestTimeStampStart: expenseRequestTimeStampStart,
        requestTimeStampEnd: expenseRequestTimeStampEnd
      }
    )

    return { message, isError: true }
  }

  // Priority 3: Check for overlapping expense plans (medium priority, warning)
  if (data.ExpensePlan && data.ExpensePlan.length > 0 && data.ExpensePlan[0].id !== currentPlanId) {
    const expensePlan = data.ExpensePlan[0]
    const expensePlanTimeStampStart = dayjs(expensePlan.startDate).format(getDateFormat('date-long'))
    const expensePlanTimeStampEnd = dayjs(expensePlan.endDate).format(getDateFormat('date-long'))

    const message = getTranslatedMessage(
      'lowcoder:create_expense_request.add_request_trip_details.period_overlapping_planned_event_plan',
      `There is an existing plan ${expensePlan.title} from ${expensePlanTimeStampStart} to ${expensePlanTimeStampEnd} for the selected period. You might want to cancel your request and create a new request based on your existing plan.`,
      {
        planTitle: expensePlan.title,
        planTimeStampStart: expensePlanTimeStampStart,
        planTimeStampEnd: expensePlanTimeStampEnd
      }
    )

    return { message, isError: false }
  }

  // No overlaps found
  return null
}
