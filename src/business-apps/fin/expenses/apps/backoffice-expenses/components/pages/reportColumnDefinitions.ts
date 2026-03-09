import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ReportType } from '../../types/reportTypes'
import type { ReportColumnDef } from './backofficeExpenseReportsPage.utils'

export const getReportColumns = (selectedReportType: ReportType | null): ReportColumnDef[] => {
  switch (selectedReportType) {
    case ReportType.EXPENSE_ITEM:
      return [
        {
          key: 'title',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.title', 'Title'),
          widthClass: 'gba:w-[20%]'
        },
        {
          key: 'code',
          title: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_request_list.expense_request_filter.request_number_input',
            'Expense Code'
          ),
          widthClass: 'gba:w-[8%]'
        },
        {
          key: 'employeeName',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee'),
          widthClass: 'gba:w-[13%]'
        },
        {
          key: 'date',
          title: getTranslationFromI18nKeyAndLabel(
            'lowcoder:acknowledge_sick_leave.submission_date',
            'Submission Date'
          ),
          widthClass: 'gba:w-[8%]'
        },
        {
          key: 'amount',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.amount', 'Amount')
        },
        {
          key: 'category',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.category', 'Category')
        },
        {
          key: 'status',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status')
        }
      ]
    case ReportType.EXPENSE_PLAN:
      return [
        {
          key: 'title',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.title', 'Title'),
          widthClass: 'gba:w-[18%]'
        },
        {
          key: 'code',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_table.code', 'Plan Code')
        },
        {
          key: 'expenseRequestCode',
          title: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_request_list.expense_request_filter.request_number_input',
            'Request Code'
          ),
          widthClass: 'gba:w-[8%]'
        },
        {
          key: 'employeeName',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee'),
          widthClass: 'gba:w-[15%]'
        },
        {
          key: 'createdAt',
          title: getTranslationFromI18nKeyAndLabel(
            'lowcoder:acknowledge_sick_leave.submission_date',
            'Submission Date'
          ),
          widthClass: 'gba:w-[8%]'
        },
        {
          key: 'status',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
          widthClass: 'gba:w-[13%]'
        },
        {
          key: 'totalAmount',
          title: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_request_list.expense_plan_table.amount',
            'Total Amount'
          )
        },
        {
          key: 'advancePaidAmount',
          title: getTranslationFromI18nKeyAndLabel(
            'lowcoder:team_expenses_page.dashboard_tab.advance_payments_subheader',
            'Advance Payment'
          )
        },
        {
          key: 'remainingAmount',
          title: getTranslationFromI18nKeyAndLabel(
            'lowcoder:team_expenses_page.dashboard_tab.plan_vs_request',
            'Remaining Amount'
          )
        },
        {
          key: 'startDate',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.start_date', 'Start Date')
        },
        {
          key: 'endDate',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.end_date', 'End Date')
        }
      ]
    case ReportType.EXPENSE_REQUEST:
      return [
        {
          key: 'title',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.title', 'Title'),
          widthClass: 'gba:w-[25%]'
        },
        {
          key: 'code',
          title: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_request_list.expense_request_filter.request_number_input',
            'Request Code'
          )
        },
        {
          key: 'planCode',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_table.code', 'Plan Code')
        },
        {
          key: 'employeeName',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee')
        },
        {
          key: 'createdAt',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:acknowledge_sick_leave.submission_date', 'Submission Date')
        },
        {
          key: 'status',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status')
        },
        {
          key: 'totalAmount',
          title: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_request_list.expense_plan_table.amount',
            'Total Amount'
          )
        },
        {
          key: 'advancePaidAmount',
          title: getTranslationFromI18nKeyAndLabel(
            'lowcoder:team_expenses_page.dashboard_tab.advance_payments_subheader',
            'Advance Payment'
          )
        },
        {
          key: 'remainingAmount',
          title: getTranslationFromI18nKeyAndLabel(
            'lowcoder:team_expenses_page.dashboard_tab.plan_vs_request',
            'Remaining Amount'
          )
        },
        {
          key: 'startDate',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.start_date', 'Start Date')
        },
        {
          key: 'endDate',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.end_date', 'End Date')
        }
      ]
    case ReportType.ADVANCE_PAYMENT:
      return [
        {
          key: 'title',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.title', 'Title'),
          widthClass: 'gba:w-[19%]'
        },
        {
          key: 'employeeName',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee'),
          widthClass: 'gba:w-[18%]'
        },
        {
          key: 'code',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_table.code', 'Plan Code')
        },
        {
          key: 'requestDate',
          title: getTranslationFromI18nKeyAndLabel(
            'lowcoder:acknowledge_sick_leave.submission_date',
            'Submission Date'
          ),
          widthClass: 'gba:w-[10%]'
        },
        {
          key: 'status',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
          widthClass: 'gba:w-[11%]'
        },
        {
          key: 'amount',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.amount', 'Amount')
        },
        {
          key: 'paymentMethod',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:payment_method', 'Payment Method'),
          widthClass: 'gba:w-[8%]'
        },
        {
          key: 'costCenter',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:cost_center', 'Cost Center'),
          widthClass: 'gba:w-[8%]'
        }
      ]
    case ReportType.APPROVAL_PAYOUT_CYCLE:
      return [
        {
          key: 'title',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.title', 'Title'),
          widthClass: 'gba:w-[20%]'
        },
        {
          key: 'code',
          title: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_request_list.expense_request_filter.request_number_input',
            'Request Code'
          )
        },
        {
          key: 'employeeName',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee')
        },
        {
          key: 'pendingAt',
          title: getTranslationFromI18nKeyAndLabel(
            'lowcoder:team_expenses_page.dashboard_tab.submitted_label',
            'Pending At'
          )
        },
        { key: 'approvedAt', title: getTranslationFromI18nKeyAndLabel('lowcoder:approval_date', 'Approved At') },
        { key: 'paidAt', title: getTranslationFromI18nKeyAndLabel('lowcoder:payment_date', 'Paid At') },
        { key: 'approvalDays', title: getTranslationFromI18nKeyAndLabel('lowcoder:approval_days', 'Approval Days') },
        { key: 'payoutDays', title: getTranslationFromI18nKeyAndLabel('lowcoder:payout_days', 'Payout Days') },
        {
          key: 'totalCycleDays',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:total_cycle_days', 'Total Cycle Days')
        },
        {
          key: 'approvalSlaLimitDays',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:approval_sla_limit_days', 'Approval SLA Limit (Days)')
        },
        {
          key: 'payoutSlaLimitDays',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:payout_sla_limit_days', 'Payout SLA Limit (Days)')
        },
        {
          key: 'totalCycleSlaLimitDays',
          title: getTranslationFromI18nKeyAndLabel(
            'lowcoder:total_cycle_sla_limit_days',
            'Total Cycle SLA Limit (Days)'
          )
        },
        {
          key: 'approvalSlaStatus',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:approval_sla_status', 'Approval SLA Status')
        },
        {
          key: 'payoutSlaStatus',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:payout_sla_status', 'Payout SLA Status')
        },
        {
          key: 'totalCycleSlaStatus',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:total_cycle_sla_status', 'Total Cycle SLA Status')
        },
        {
          key: 'bottleneckStage',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:bottleneck_stage', 'Bottleneck Stage')
        },
        {
          key: 'status',
          title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status')
        },
        {
          key: 'totalAmount',
          title: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_request_list.expense_plan_table.amount',
            'Total Amount'
          )
        }
      ]
    default:
      return []
  }
}

export const getExportColumns = (selectedReportType: ReportType | null): ReportColumnDef[] => {
  const uiCols = getReportColumns(selectedReportType)
  const insertCurrencyAfter = (afterKey: string) => {
    const alreadyHasCurrency = uiCols.some(c => c.key === 'currency')
    if (alreadyHasCurrency) return uiCols
    const idx = uiCols.findIndex(c => c.key === afterKey)
    if (idx === -1) return uiCols
    const currencyCol: ReportColumnDef = {
      key: 'currency',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.currency', 'Currency')
    }
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

export const getBackendSortableColumnKeys = (selectedReportType: ReportType | null): Set<string> => {
  switch (selectedReportType) {
    case ReportType.EXPENSE_ITEM:
      return new Set(['title', 'date', 'amount', 'status'])
    case ReportType.EXPENSE_REQUEST:
      return new Set(['title', 'code', 'createdAt', 'status', 'totalAmount', 'requestDate', 'startDate', 'endDate'])
    case ReportType.EXPENSE_PLAN:
      return new Set(['title', 'code', 'createdAt', 'status', 'totalAmount', 'startDate', 'endDate'])
    case ReportType.ADVANCE_PAYMENT:
      return new Set(['requestDate', 'status', 'amount', 'paymentMethod'])
    case ReportType.APPROVAL_PAYOUT_CYCLE:
      return new Set(['title', 'code', 'status', 'totalAmount'])
    default:
      return new Set<string>()
  }
}
