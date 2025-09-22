export interface ApprovalTabConfig {
  key: string;
  label: string;
  processName: string;
  description: string;
}

export const APPROVAL_TABS: ApprovalTabConfig[] = [
  {
    key: 'expense-plan',
    label: 'Expense Plan',
    processName: 'approveExpensePlan',
    description: 'Review and approve expense plans from your team',
  },
  {
    key: 'expense-request',
    label: 'Expense Request',
    processName: 'approveExpenseRequest',
    description: 'Review and approve expense requests from your team',
  },
  {
    key: 'advance-payment',
    label: 'Advance Payment',
    processName: 'approveAdvancePayment',
    description: 'Review and approve advance payment requests from your team',
  },
  {
    key: 'handout-payment',
    label: 'Handout Payment',
    processName: 'approveHandoutPayment',
    description: 'Review and approve handout payment requests from your team',
  },
  {
    key: 'transfer-payment',
    label: 'Transfer Payment',
    processName: 'approveTransferPayment',
    description: 'Review and approve transfer payment requests from your team',
  },
];

export const getTabByKey = (key: string): ApprovalTabConfig | undefined => {
  return APPROVAL_TABS.find((tab) => tab.key === key);
};

export const getTabByProcessName = (processName: string): ApprovalTabConfig | undefined => {
  return APPROVAL_TABS.find((tab) => tab.processName === processName);
};
