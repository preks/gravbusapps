import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ReportType } from '../../hooks/useExpenseReportData'

export interface ManagerExpenseReportTypeTab {
  key: ReportType
  name: string
}

export const getManagerExpenseReportTypeTabs = (): ManagerExpenseReportTypeTab[] => [
  {
    key: ReportType.EXPENSE_ITEM,
    name: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense_items', 'Expense Items')
  },
  {
    key: ReportType.EXPENSE_PLAN,
    name: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.expense_plans', 'Expense Plans')
  },
  {
    key: ReportType.EXPENSE_REQUEST,
    name: getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.expense_requests', 'Expense Requests')
  },
  {
    key: ReportType.ADVANCE_PAYMENT,
    name: getTranslationFromI18nKeyAndLabel(
      'lowcoder:backoffice_expense_landing_page.advance_title',
      'Advance Payments'
    )
  }
]
