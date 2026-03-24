import type { TranslateFn } from '../../../utils/utils'
import { getExpenseRequestStatusDisplay } from '../../../utils/utils'
import type { Currency } from '../../../hooks/useFilterData'
import type { DepartmentOption } from '../../../utils/departmentOptions'
import {
  getCurrencyLabel,
  getDepartmentLabel,
  getEffectiveDateLabel,
  getRequestDateLabel
} from '../common/backofficeFilterLabels'

export interface EmployeeOption {
  name: string
}

export function buildExpenseRequestsFilterLabelMap(params: {
  statusFilter: string[]
  t: TranslateFn
  employeeFilter: string
  selectedEmployees: EmployeeOption[]
  amountMinFilter: string
  amountMaxFilter: string
  departmentId: string
  departmentOptions: readonly DepartmentOption[]
  currencyRef: string
  currencies: Currency[]
  effectiveDateRange: [Date | null, Date | null] | null
  requestDateRange: [Date | null, Date | null] | null
}): Record<string, string> {
  const {
    statusFilter,
    t,
    employeeFilter,
    selectedEmployees,
    amountMinFilter,
    amountMaxFilter,
    departmentId,
    departmentOptions,
    currencyRef,
    currencies,
    effectiveDateRange,
    requestDateRange
  } = params

  const statusLabels = statusFilter.reduce(
    (acc, status) => {
      const statusConfig = getExpenseRequestStatusDisplay(status, t)
      if (statusConfig.label.toLowerCase() === status.toLowerCase()) {
        acc[status] = statusConfig.label
      } else {
        const formattedStatus = status.charAt(0) + status.slice(1).toLowerCase()
        const statusKey = `status-${status.toLowerCase().split('_').join('-')}` as const
        const translatedStatus = t(statusKey) || formattedStatus
        acc[status] = `${statusConfig.label} (${translatedStatus})`
      }
      return acc
    },
    {} as Record<string, string>
  )

  return {
    ...statusLabels,
    employee: employeeFilter ? `Employee: ${selectedEmployees.map(e => e.name).join(', ')}` : 'Employee: All',
    amount: `Amount: ${amountMinFilter || '0'} - ${amountMaxFilter || '∞'}`,
    department: getDepartmentLabel(departmentId, departmentOptions),
    currency: getCurrencyLabel(currencyRef, currencies),
    effectiveDateRange: getEffectiveDateLabel(effectiveDateRange),
    requestDateRange: getRequestDateLabel(requestDateRange),
    'ExpenseRequestType:v1:EXPENSES': t('filter-request-type-expense'),
    'ExpenseRequestType:v1:TRIP': t('filter-request-type-trip')
  }
}
