import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface ApprovalTabConfig {
  key: string
  label: string
  processName: string
  description: string
}

// Function to get translated tab labels
export const getTabLabel = (key: string): string => {
  switch (key) {
    case 'expense-plan':
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.dashboard_tab.expense_plans',
        'Expense Plan'
      )
    case 'expense-request':
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_list.flows_button.expense_requests',
        'Expense Request'
      )
    case 'advance-payment':
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:backoffice_expense_landing_page.advance_title',
        'Advance Payment'
      )
    case 'handout-payment':
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:manager_expense_landing_page.handout_payment',
        'Handout Payment'
      )
    case 'transfer-payment':
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:transfer_expense_request.info_message_container.transfer_payment',
        'Transfer Payment'
      )
    default:
      return key
  }
}

// Function to get translated tab descriptions
export const getTabDescription = (key: string): string => {
  switch (key) {
    case 'expense-plan':
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:manager_expenses_landing_page.expense_plan_description',
        'Review and approve expense plans from your team'
      )
    case 'expense-request':
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:manager_expenses_landing_page.expense_request_description',
        'Review and approve expense requests from your team'
      )
    case 'advance-payment':
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:manager_expenses_landing_page.advance_payment_description',
        'Review and approve advance payment requests from your team'
      )
    case 'handout-payment':
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:manager_expenses_landing_page.handout_payment_description',
        'Review and approve handout payment requests from your team'
      )
    case 'transfer-payment':
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:manager_expenses_landing_page.transfer_payment_description',
        'Review and approve transfer payment requests from your team'
      )
    default:
      return ''
  }
}

export const APPROVAL_TABS: ApprovalTabConfig[] = [
  {
    key: 'expense-plan',
    label: 'Expense Plan',
    processName: 'approveExpensePlan',
    description: 'Review and approve expense plans from your team'
  },
  {
    key: 'expense-request',
    label: 'Expense Request',
    processName: 'approveExpenseRequest',
    description: 'Review and approve expense requests from your team'
  },
  {
    key: 'advance-payment',
    label: 'Advance Payment',
    processName: 'approveAdvancePayment',
    description: 'Review and approve advance payment requests from your team'
  },
  {
    key: 'handout-payment',
    label: 'Handout Payment',
    processName: 'handOutAdvancePayment',
    description: 'Review and approve handout payment requests from your team'
  },
  {
    key: 'transfer-payment',
    label: 'Transfer Payment',
    processName: 'transferAdvancePayment',
    description: 'Review and approve transfer payment requests from your team'
  }
]

export const getTabByKey = (key: string): ApprovalTabConfig | undefined => {
  return APPROVAL_TABS.find(tab => tab.key === key)
}

export const getTabByProcessName = (processName: string): ApprovalTabConfig | undefined => {
  return APPROVAL_TABS.find(tab => tab.processName === processName)
}
