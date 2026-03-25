import { ReportType } from '../../types/reportTypes'
import type { ReportColumnDef } from './backofficeExpenseReportsPage.utils'

type TranslateFn = (key: string, vars?: Record<string, unknown>) => string

const amountAndDateColumns = (t: TranslateFn): ReportColumnDef[] => [
  { key: 'totalAmount', title: t('header-total-amount') },
  { key: 'advancePaidAmount', title: t('header-advance') },
  { key: 'remainingAmount', title: t('header-remaining-amount') },
  { key: 'startDate', title: t('header-start-date') },
  { key: 'endDate', title: t('header-end-date') }
]

export const getReportColumns = (selectedReportType: ReportType | null, t: TranslateFn): ReportColumnDef[] => {
  switch (selectedReportType) {
    case ReportType.EXPENSE_ITEM:
      return [
        { key: 'title', title: t('header-title'), widthClass: 'gba:w-[20%]' },
        { key: 'code', title: t('header-expense-code'), widthClass: 'gba:w-[8%]' },
        { key: 'employeeName', title: t('header-employee'), widthClass: 'gba:w-[13%]' },
        { key: 'date', title: t('header-expense-date'), widthClass: 'gba:w-[8%]' },
        { key: 'amount', title: t('header-amount') },
        { key: 'category', title: t('header-category') },
        { key: 'status', title: t('header-status') }
      ]
    case ReportType.EXPENSE_PLAN:
      return [
        { key: 'title', title: t('header-title'), widthClass: 'gba:w-[18%]' },
        { key: 'code', title: t('header-plan-code') },
        { key: 'expenseRequestCode', title: t('header-request-code'), widthClass: 'gba:w-[8%]' },
        { key: 'employeeName', title: t('header-employee'), widthClass: 'gba:w-[15%]' },
        { key: 'createdAt', title: t('header-creation-date'), widthClass: 'gba:w-[8%]' },
        { key: 'status', title: t('header-status'), widthClass: 'gba:w-[13%]' },
        ...amountAndDateColumns(t)
      ]
    case ReportType.EXPENSE_REQUEST:
      return [
        { key: 'title', title: t('header-title'), widthClass: 'gba:w-[18%]' },
        { key: 'code', title: t('header-request-code'), widthClass: 'gba:w-[8%]' },
        { key: 'planCode', title: t('header-plan-code'), widthClass: 'gba:w-[8%]' },
        { key: 'employeeName', title: t('header-employee'), widthClass: 'gba:w-[13%]' },
        { key: 'createdAt', title: t('header-creation-date') },
        { key: 'status', title: t('header-status') },
        ...amountAndDateColumns(t)
      ]
    case ReportType.ADVANCE_PAYMENT:
      return [
        { key: 'title', title: t('header-title'), widthClass: 'gba:w-[19%]' },
        { key: 'employeeName', title: t('header-employee'), widthClass: 'gba:w-[18%]' },
        { key: 'code', title: t('header-plan-code') },
        { key: 'createdAt', title: t('header-creation-date'), widthClass: 'gba:w-[10%]' },
        { key: 'status', title: t('header-status'), widthClass: 'gba:w-[11%]' },
        { key: 'amount', title: t('header-amount') },
        { key: 'paymentMethod', title: t('header-payment-method'), widthClass: 'gba:w-[8%]' },
        { key: 'costCenter', title: t('header-cost-center'), widthClass: 'gba:w-[8%]' }
      ]
    case ReportType.APPROVAL_PAYOUT_CYCLE:
      return [
        { key: 'title', title: t('header-title'), widthClass: 'gba:w-[14%]' },
        { key: 'code', title: t('header-request-code'), widthClass: 'gba:w-[8%]' },
        { key: 'employeeName', title: t('header-employee'), widthClass: 'gba:w-[12%]' },
        { key: 'pendingAt', title: t('header-pending-at') },
        { key: 'approvedAt', title: t('header-approved-at') },
        { key: 'paidAt', title: t('header-paid-at') },
        { key: 'approvalDays', title: t('header-approval-days') },
        { key: 'payoutDays', title: t('header-payout-days') },
        { key: 'totalCycleDays', title: t('header-total-cycle-days') },
        { key: 'approvalSlaLimitDays', title: t('header-approval-sla-limit') },
        { key: 'payoutSlaLimitDays', title: t('header-payout-sla-limit') },
        { key: 'totalCycleSlaLimitDays', title: t('header-total-cycle-sla-limit') },
        { key: 'approvalSlaStatus', title: t('header-approval-sla-status') },
        { key: 'payoutSlaStatus', title: t('header-payout-sla-status') },
        { key: 'totalCycleSlaStatus', title: t('header-total-cycle-sla-status') },
        { key: 'bottleneckStage', title: t('header-bottleneck-stage') },
        { key: 'status', title: t('header-status') },
        { key: 'totalAmount', title: t('header-total-amount') }
      ]
    default:
      return []
  }
}

export const getExportColumns = (selectedReportType: ReportType | null, t: TranslateFn): ReportColumnDef[] => {
  const uiCols = getReportColumns(selectedReportType, t)
  const insertCurrencyAfter = (afterKey: string) => {
    const alreadyHasCurrency = uiCols.some(c => c.key === 'currency')
    if (alreadyHasCurrency) return uiCols
    const idx = uiCols.findIndex(c => c.key === afterKey)
    if (idx === -1) return uiCols
    const currencyCol: ReportColumnDef = { key: 'currency', title: t('header-currency') }
    const next = [...uiCols]
    next.splice(idx + 1, 0, currencyCol)
    return next
  }
  switch (selectedReportType) {
    case ReportType.EXPENSE_ITEM:
      return insertCurrencyAfter('amount')
    case ReportType.EXPENSE_PLAN:
      return insertCurrencyAfter('totalAmount')
    case ReportType.EXPENSE_REQUEST:
      return insertCurrencyAfter('totalAmount')
    case ReportType.ADVANCE_PAYMENT:
      return insertCurrencyAfter('amount')
    case ReportType.APPROVAL_PAYOUT_CYCLE:
      return insertCurrencyAfter('totalAmount')
    default:
      return uiCols
  }
}

const EXPENSE_REQUEST_AND_PLAN_SORTABLE_KEYS = new Set([
  'title',
  'code',
  'createdAt',
  'status',
  'totalAmount',
  'advancePaidAmount',
  'remainingAmount',
  'startDate',
  'endDate'
])

export const getBackendSortableColumnKeys = (selectedReportType: ReportType | null): Set<string> => {
  switch (selectedReportType) {
    case ReportType.EXPENSE_ITEM:
      return new Set(['title', 'date', 'amount', 'status'])
    case ReportType.EXPENSE_REQUEST:
    case ReportType.EXPENSE_PLAN:
      return EXPENSE_REQUEST_AND_PLAN_SORTABLE_KEYS
    case ReportType.ADVANCE_PAYMENT:
      return new Set(['createdAt', 'status', 'amount', 'paymentMethod'])
    case ReportType.APPROVAL_PAYOUT_CYCLE:
      return new Set(['title', 'code', 'status', 'totalAmount'])
    default:
      return new Set<string>()
  }
}
