import { ReportType } from '../../hooks/useExpenseReportData'

export interface ManagerExpenseReportTypeTab {
  key: ReportType
  name: string
}

export const getManagerExpenseReportTypeTabs = (t: (key: string) => string): ManagerExpenseReportTypeTab[] => [
  {
    key: ReportType.EXPENSE_ITEM,
    name: t('expense-reports-tab-expense-items')
  },
  {
    key: ReportType.EXPENSE_PLAN,
    name: t('expense-reports-tab-expense-plans')
  },
  {
    key: ReportType.EXPENSE_REQUEST,
    name: t('expense-reports-tab-expense-requests')
  },
  {
    key: ReportType.ADVANCE_PAYMENT,
    name: t('expense-reports-tab-advance-payments')
  }
]
