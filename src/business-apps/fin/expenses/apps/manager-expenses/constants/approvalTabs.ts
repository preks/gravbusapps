export interface ApprovalTabConfig {
  key: string
  label: string
  processName: string
  description: string
}

export const getTabLabel = (key: string, t: (key: string) => string): string => {
  switch (key) {
    case 'expense-plan':
      return t('approvals-tab-expense-plan')
    case 'expense-request':
      return t('approvals-tab-expense-request')
    case 'advance-payment':
      return t('approvals-tab-advance-payment')
    case 'handout-payment':
      return t('approvals-tab-handout-payment')
    case 'transfer-payment':
      return t('approvals-tab-transfer-payment')
    default:
      return key
  }
}

export const getTabDescription = (key: string, t: (key: string) => string): string => {
  switch (key) {
    case 'expense-plan':
      return t('approvals-tab-expense-plan-desc')
    case 'expense-request':
      return t('approvals-tab-expense-request-desc')
    case 'advance-payment':
      return t('approvals-tab-advance-payment-desc')
    case 'handout-payment':
      return t('approvals-tab-handout-payment-desc')
    case 'transfer-payment':
      return t('approvals-tab-transfer-payment-desc')
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
