import { useEffect, useMemo } from 'react'
import { employeeExpenseClient } from './EmployeeExpenseClient'
import { showToast } from '@/business-apps/fin/expenses/utils/notificationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export const useEmployeeExpenseRule = (accessToken: string) => {
  employeeExpenseClient.setAccessToken(accessToken)

  useEffect(
    function addRefreshedTokenToAuthorizationHeader() {
      window.addEventListener('com.newwork.token.shouldRefreshAuthorizationHeader', listener as EventListener)
      return () => {
        window.removeEventListener('com.newwork.token.shouldRefreshAuthorizationHeader', listener as EventListener)
      }

      function listener() {
        employeeExpenseClient.setAccessToken(accessToken)
      }
    },
    [accessToken]
  )

  const getEmployeeRule = useMemo(
    () => async (employeeId: string, allowanceDate: string) => {
      try {
        const data = await employeeExpenseClient.getEmployeeRule(employeeId, allowanceDate)
        return data
      } catch (error) {
        showToast(
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:create_expense_request.error_employee_rule',
            'Error fetching employee expense rule'
          ),
          'error'
        )
        throw error
      }
    },
    [employeeExpenseClient, accessToken]
  )

  return getEmployeeRule
}
