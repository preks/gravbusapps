import { getCatalogValue, formatDate } from '@/common/utils/windowUtils'
import { Badge } from '@newwork/nw-design-system'
import React from 'react'

type TranslateFn = (key: string, vars?: Record<string, unknown>) => string

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
  /** Translation function */
  t: TranslateFn
  /** Status display function */
  getStatusDisplay: (status: string) => { label: string; badgeVariant?: string }
}

export interface DetailsPanelField {
  label: React.ReactNode
  value: React.ReactNode
  dataTestId?: string
}

const addDateFields = (
  fields: DetailsPanelField[],
  payment: AdvancePaymentData,
  config: Pick<AdvancePaymentFieldConfig, 'showDuration' | 'showDecisionDate' | 'showTransactionDate' | 't'>
): void => {
  const { showDuration, showDecisionDate, showTransactionDate, t } = config

  if (showDuration && payment.expensePlan?.startDate && payment.expensePlan?.endDate) {
    fields.push({
      label: t('detail-duration'),
      value: `${formatDate(payment.expensePlan.startDate, 'date.short')} → ${formatDate(payment.expensePlan.endDate, 'date.short')}`
    })
  }

  if (showDecisionDate && payment.decisionDate) {
    fields.push({
      label: t('detail-decision-date'),
      value: formatDate(payment.decisionDate, 'date.short')
    })
  }

  if (showTransactionDate && payment.transactionDate) {
    fields.push({
      label: t('detail-transaction-date'),
      value: formatDate(payment.transactionDate, 'date.short')
    })
  }
}

const addPeopleFields = (
  fields: DetailsPanelField[],
  payment: AdvancePaymentData,
  config: Pick<AdvancePaymentFieldConfig, 'showRequester' | 'showManager' | 't'>
): void => {
  const { showRequester, showManager, t } = config

  if (showRequester) {
    const requesterName =
      payment.expensePlan?.employee?.fullName ||
      payment.expensePlan?.employee?.displayName ||
      payment.expensePlan?.reporter
    if (requesterName) {
      fields.push({
        label: t('detail-requester'),
        value: requesterName
      })
    }
  }

  if (showManager && payment.expensePlan?.employee?.employeePosition?.supervisor?.fullName) {
    fields.push({
      label: t('detail-manager'),
      value: payment.expensePlan.employee.employeePosition.supervisor.fullName
    })
  }
}

const addPlanAndLocationFields = (fields: DetailsPanelField[], payment: AdvancePaymentData, t: TranslateFn): void => {
  if (payment.expensePlan?.code) {
    fields.push({
      label: t('detail-expense-plan-code'),
      value: payment.expensePlan.code
    })
  }

  fields.push({
    label: t('detail-expense-plan'),
    value: payment.expensePlan?.title || getExpensePlanDisplay(t, null)
  })

  const costCenterName =
    payment.costCenter?.name ||
    payment.expensePlan?.costCenter?.name ||
    payment.expensePlan?.employee?.employeePosition?.costCenter?.name
  if (costCenterName) {
    fields.push({
      label: t('detail-cost-center'),
      value: costCenterName
    })
  }

  const projectName = payment.project?.name || payment.expensePlan?.project?.name
  if (projectName) {
    fields.push({
      label: t('detail-project'),
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
      label: t('header-status'),
      value: React.createElement(
        Badge,
        { variant: (statusConfig?.badgeVariant || 'outline') as any },
        statusConfig?.label || t('common-not-available')
      )
    }
  ]

  if (showDescription) {
    fields.push({
      label: t('detail-description'),
      value: payment.description ?? t('advance-payment-no-description'),
      dataTestId: 'advance-payment-description'
    })
  }

  addDateFields(fields, payment, config)
  addPeopleFields(fields, payment, config)
  addPlanAndLocationFields(fields, payment, t)

  const currencyCode = payment.currency?.code || payment.currencyRef?.split(':').pop() || 'EUR'
  fields.push({
    label: t('header-amount'),
    value: formatCurrency(payment.amount || 0, currencyCode)
  })

  if (showPlanTotalAmount && payment.expensePlan?.totalAmount != null) {
    const planCurrencyCode = payment.expensePlan.currency?.code || payment.currency?.code || 'EUR'
    fields.push({
      label: t('header-plan-total-amount'),
      value: formatCurrency(payment.expensePlan.totalAmount || 0, planCurrencyCode)
    })
  }

  fields.push({
    label: t('header-payment-method'),
    value: getPaymentMethodDisplay(payment.paymentMethod, t),
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
export const getPaymentMethodDisplay = (
  method: unknown,
  t: TranslateFn,
  options?: { emptyDisplay?: string }
): string => {
  const notSpecified = options?.emptyDisplay ?? t('advance-payment-not-specified')

  if (!method) return notSpecified

  if (typeof method === 'object' && method !== null && 'value' in (method as any)) {
    return getCatalogValue(method as any) || notSpecified
  }

  if (typeof method === 'object') {
    return notSpecified
  }

  const raw = String(method).trim()
  if (!raw) return notSpecified

  if (raw === 'DIRECT_DEPOSIT') {
    return t('advance-payment-direct-deposit')
  }

  if (raw === 'CASH_PAYMENT') {
    return t('advance-payment-cash')
  }

  return toTitleCase(raw)
}

/**
 * Formats expense plan display value
 */
export const getExpensePlanDisplay = (
  t: TranslateFn,
  expensePlan?: { code?: string; title?: string } | null
): string => {
  if (!expensePlan) {
    return t('advance-payment-no-expense-plan')
  }

  return expensePlan.code || expensePlan.title || t('common-not-available')
}
