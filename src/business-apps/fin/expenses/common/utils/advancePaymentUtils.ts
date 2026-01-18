import { getTranslationFromI18nKeyAndLabel, getCatalogValue, formatDate } from '@/common/utils/windowUtils'
import { Badge } from '@newwork/nw-design-system'
import React from 'react'

/**
 * Advance payment data structure for building fields
 */
export interface AdvancePaymentData {
  status?: string
  code?: string
  description?: string | null
  amount?: number
  currency?: { code?: string } | null
  currencyRef?: string
  paymentMethod?: unknown
  decisionDate?: string | null
  transactionDate?: string | null
  costCenter?: { name?: string } | null
  project?: { name?: string } | null
  expensePlan?: {
    id?: string
    code?: string
    title?: string
    startDate?: string
    endDate?: string
    totalAmount?: number | null
    currency?: { code?: string } | null
    costCenter?: { name?: string } | null
    project?: { name?: string } | null
    reporter?: string
    employee?: {
      fullName?: string
      displayName?: string
      employeePosition?: {
        costCenter?: { name?: string } | null
        supervisor?: { fullName?: string } | null
      } | null
    } | null
  } | null
}

export interface AdvancePaymentFieldConfig {
  /** Include duration field (start/end dates) */
  showDuration?: boolean
  /** Include decision date field */
  showDecisionDate?: boolean
  /** Include transaction date field */
  showTransactionDate?: boolean
  /** Include requester field */
  showRequester?: boolean
  /** Include manager field */
  showManager?: boolean
  /** Include plan total amount field */
  showPlanTotalAmount?: boolean
  /** Include description field */
  showDescription?: boolean
  /** Format currency function */
  formatCurrency: (amount: number, currencyCode: string) => string
  /** Translation function for expense-plan-code */
  t: (key: string) => string
  /** Status display function */
  getStatusDisplay: (status: string) => { label: string; badgeVariant?: string }
}

export interface DetailsPanelField {
  label: React.ReactNode
  value: React.ReactNode
  dataTestId?: string
}

// Helper to add optional date fields
const addDateFields = (
  fields: DetailsPanelField[],
  payment: AdvancePaymentData,
  config: Pick<AdvancePaymentFieldConfig, 'showDuration' | 'showDecisionDate' | 'showTransactionDate'>
): void => {
  const { showDuration, showDecisionDate, showTransactionDate } = config

  if (showDuration && payment.expensePlan?.startDate && payment.expensePlan?.endDate) {
    fields.push({
      label: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.plan_details.duration', 'Duration'),
      value: `${formatDate(payment.expensePlan.startDate, 'date.short')} → ${formatDate(payment.expensePlan.endDate, 'date.short')}`
    })
  }

  if (showDecisionDate && payment.decisionDate) {
    fields.push({
      label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.decision_date', 'Decision Date'),
      value: formatDate(payment.decisionDate, 'date.short')
    })
  }

  if (showTransactionDate && payment.transactionDate) {
    fields.push({
      label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.transaction_date', 'Transaction Date'),
      value: formatDate(payment.transactionDate, 'date.short')
    })
  }
}

// Helper to add people fields (requester, manager)
const addPeopleFields = (
  fields: DetailsPanelField[],
  payment: AdvancePaymentData,
  config: Pick<AdvancePaymentFieldConfig, 'showRequester' | 'showManager'>
): void => {
  const { showRequester, showManager } = config

  if (showRequester) {
    const requesterName =
      payment.expensePlan?.employee?.fullName ||
      payment.expensePlan?.employee?.displayName ||
      payment.expensePlan?.reporter
    if (requesterName) {
      fields.push({
        label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_overview.side_bar.requester', 'Requester'),
        value: requesterName
      })
    }
  }

  if (showManager && payment.expensePlan?.employee?.employeePosition?.supervisor?.fullName) {
    fields.push({
      label: getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.profile_icon_list.manager_title', 'Manager'),
      value: payment.expensePlan.employee.employeePosition.supervisor.fullName
    })
  }
}

// Helper to add expense plan and location fields
const addPlanAndLocationFields = (
  fields: DetailsPanelField[],
  payment: AdvancePaymentData,
  t: (key: string) => string
): void => {
  if (payment.expensePlan?.code) {
    fields.push({
      label: t('expense-plan-code'),
      value: payment.expensePlan.code
    })
  }

  fields.push({
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:create_expense_request.initial_expense_plan_select_label',
      'Expense Plan'
    ),
    value: payment.expensePlan?.title || getExpensePlanDisplay(null)
  })

  const costCenterName =
    payment.costCenter?.name ||
    payment.expensePlan?.costCenter?.name ||
    payment.expensePlan?.employee?.employeePosition?.costCenter?.name
  if (costCenterName) {
    fields.push({
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_request.expense_request_container.current_cost_center_label',
        'Cost Center'
      ),
      value: costCenterName
    })
  }

  const projectName = payment.project?.name || payment.expensePlan?.project?.name
  if (projectName) {
    fields.push({
      label: getTranslationFromI18nKeyAndLabel('lowcoder:add_allowance_info_request.select_project', 'Project'),
      value: projectName
    })
  }
}

/**
 * Builds the fields array for advance payment details panel
 * Reduces duplication between manager, personal, and backoffice components
 */
export const buildAdvancePaymentFields = (
  payment: AdvancePaymentData,
  config: AdvancePaymentFieldConfig
): DetailsPanelField[] => {
  const { showDescription = false, showPlanTotalAmount = false, formatCurrency, t, getStatusDisplay } = config

  const statusConfig = getStatusDisplay(payment.status || '')

  const fields: DetailsPanelField[] = [
    {
      label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_table.status', 'Status'),
      value: React.createElement(Badge, {
        variant: (statusConfig?.badgeVariant || 'outline') as any,
        children: statusConfig?.label || 'N/A'
      })
    }
  ]

  if (showDescription) {
    fields.push({
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_request_overview.expense_history.expense_history_table.description',
        'Description'
      ),
      value:
        payment.description ??
        getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.no_description', 'No description'),
      dataTestId: 'advance-payment-description'
    })
  }

  addDateFields(fields, payment, config)
  addPeopleFields(fields, payment, config)
  addPlanAndLocationFields(fields, payment, t)

  // Amount
  const currencyCode = payment.currency?.code || payment.currencyRef?.split(':').pop() || 'EUR'
  fields.push({
    label: getTranslationFromI18nKeyAndLabel('lowcoder:manager_expense_request_list.expense_table.amount', 'Amount'),
    value: formatCurrency(payment.amount || 0, currencyCode)
  })

  // Plan Total Amount
  if (showPlanTotalAmount && payment.expensePlan?.totalAmount != null) {
    const planCurrencyCode = payment.expensePlan.currency?.code || payment.currency?.code || 'EUR'
    fields.push({
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_request_list.expense_plan_table.total_amount',
        'Plan Total Amount'
      ),
      value: formatCurrency(payment.expensePlan.totalAmount || 0, planCurrencyCode)
    })
  }

  // Payment Method
  fields.push({
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:create_expense_request.add_request_trip_details.payment_method',
      'Payment Method'
    ),
    value: getPaymentMethodDisplay(payment.paymentMethod),
    dataTestId: 'advance-payment-payment-method'
  })

  return fields
}

/**
 * Formats a string value to title case (capitalizes first letter of each word)
 */
export const toTitleCase = (value?: string): string => {
  if (value === null || value === undefined) return ''
  const normalized = String(value).trim()
  if (!normalized) return ''
  if (normalized.toUpperCase() === 'N/A') return 'N/A'
  return normalized
    .replace(/[_-]+/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Gets display value for payment method, handling catalog entries and special cases
 */
export const getPaymentMethodDisplay = (method: unknown): string => {
  const notSpecified = getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.not_specified', 'Not specified')

  if (!method) return notSpecified

  // Handle catalog entry object with translations/value
  if (typeof method === 'object' && method !== null && 'value' in (method as any)) {
    return getCatalogValue(method as any) || notSpecified
  }

  // Return not specified for unhandled object types to avoid [object Object]
  if (typeof method === 'object') {
    return notSpecified
  }

  const raw = String(method).trim()
  if (!raw) return notSpecified

  // Handle special cases with translations
  if (raw === 'DIRECT_DEPOSIT') {
    return getTranslationFromI18nKeyAndLabel(
      'lowcoder:initiate_expense_plan.create_expense_plan.payment_method_select_direct_deposit',
      'Direct Deposit'
    )
  }

  if (raw === 'CASH_PAYMENT') {
    return getTranslationFromI18nKeyAndLabel(
      'lowcoder:initiate_expense_plan.create_expense_plan.payment_method_select_cash_payment',
      'Cash Payment'
    )
  }

  // Default: format to title case
  return toTitleCase(raw)
}

/**
 * Formats expense plan display value
 */
export const getExpensePlanDisplay = (expensePlan?: { code?: string; title?: string } | null): string => {
  if (!expensePlan) {
    const noLabel = getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule_details.query_params_no', 'No')
    const planLabel = getTranslationFromI18nKeyAndLabel(
      'lowcoder:expense_calculation_rule_details.query_params_expense_plan',
      'Expense Plan'
    )
    return `${noLabel} ${planLabel}`
  }

  return expensePlan.code || expensePlan.title || 'N/A'
}
