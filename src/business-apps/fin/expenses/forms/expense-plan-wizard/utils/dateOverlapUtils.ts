import dayjs from 'dayjs'
import { getCatalogValue, getDateFormat } from '@/common/utils/windowUtils'
import { EXPENSE_STATUS } from '../constants/constants'
import type { ExpensePlanWizardTranslateFn } from '../expensePlanWizardTranslateTypes'

/**
 * Get overlap warning message from query response
 * @param queryResponse - Response from getPlansAbsences query
 * @param currentPlanId - Current expense plan ID
 * @param t - Wizard translation function
 * @returns Warning message and error flag
 */
export const getOverlapWarningMessage = (
  queryResponse: any,
  currentPlanId: string | undefined,
  t: ExpensePlanWizardTranslateFn
): { message: string; isError: boolean } | null => {
  const data = queryResponse.data || queryResponse
  if (!data) {
    return null
  }

  if (data.EmployeeAbsence && data.EmployeeAbsence.length > 0) {
    const employeeAbsence = data.EmployeeAbsence[0]
    const absenceRequestTimeStampStart = dayjs(employeeAbsence.startDate).format(getDateFormat('date-long'))
    const absenceRequestTimeStampEnd = dayjs(employeeAbsence.endDate).format(getDateFormat('date-long'))

    const absenceType = getCatalogValue(employeeAbsence.type) || 'Absence'

    const message = t('trip-overlap-absences-error', {
      employeeAbsence: absenceType,
      absenceRequestTimeStampStart,
      absenceRequestTimeStampEnd
    })

    return { message, isError: true }
  }

  if (data.ExpenseRequest && data.ExpenseRequest.length > 0) {
    const expenseRequest = data.ExpenseRequest[0]
    const expenseRequestTimeStampStart = dayjs(expenseRequest.startDate).format(getDateFormat('date-long'))
    const expenseRequestTimeStampEnd = dayjs(expenseRequest.endDate).format(getDateFormat('date-long'))

    const blockStatuses = [
      'PENDING',
      EXPENSE_STATUS.APPROVED,
      EXPENSE_STATUS.VERIFIED,
      EXPENSE_STATUS.BOOKED,
      EXPENSE_STATUS.TRANSFERRED,
      EXPENSE_STATUS.PAID
    ]

    if (blockStatuses.includes(expenseRequest.status)) {
      const message = t('trip-overlap-request-error', {
        requestTitle: expenseRequest.title,
        requestTimeStampStart: expenseRequestTimeStampStart,
        requestTimeStampEnd: expenseRequestTimeStampEnd
      })

      return { message, isError: true }
    }

    if (expenseRequest.status === EXPENSE_STATUS.CREATED) {
      const message = t('trip-overlap-request-draft-warning', {
        requestTitle: expenseRequest.title,
        requestTimeStampStart: expenseRequestTimeStampStart,
        requestTimeStampEnd: expenseRequestTimeStampEnd
      })

      return { message, isError: false }
    }
  }

  if (data.ExpensePlan && data.ExpensePlan.length > 0 && data.ExpensePlan[0].id !== currentPlanId) {
    const expensePlan = data.ExpensePlan[0]
    const expensePlanTimeStampStart = dayjs(expensePlan.startDate).format(getDateFormat('date-long'))
    const expensePlanTimeStampEnd = dayjs(expensePlan.endDate).format(getDateFormat('date-long'))

    const allowedStatuses = ['DISCARDED', EXPENSE_STATUS.CREATED, EXPENSE_STATUS.REJECTED]

    if (!allowedStatuses.includes(expensePlan.status)) {
      const message = t('trip-overlap-plan-error', {
        planTitle: expensePlan.title,
        planTimeStampStart: expensePlanTimeStampStart,
        planTimeStampEnd: expensePlanTimeStampEnd
      })

      return { message, isError: true }
    }

    if (expensePlan.status === EXPENSE_STATUS.CREATED || expensePlan.status === EXPENSE_STATUS.REJECTED) {
      const message = t('trip-overlap-plan-draft-warning', {
        planTitle: expensePlan.title,
        planTimeStampStart: expensePlanTimeStampStart,
        planTimeStampEnd: expensePlanTimeStampEnd
      })

      return { message, isError: false }
    }
  }

  return null
}
