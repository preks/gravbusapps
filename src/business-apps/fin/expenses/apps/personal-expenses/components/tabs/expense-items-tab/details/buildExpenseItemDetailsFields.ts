import type { ReactNode } from 'react'
import { formatDate, getCatalogValue } from '@/common/utils/windowUtils'
import { formatCurrencyDisplay } from '../../../../utils'
import type { DetailsPanelField } from '@/business-apps/fin/expenses/common/components/details-panel/DetailsPanelContent'
import type { ExpenseItem } from '../../../../hooks/useGetExpenseItems'

export function buildExpenseItemDetailsFields(
  displayItem: ExpenseItem,
  statusBadge: ReactNode,
  t: (key: string) => string
): DetailsPanelField[] {
  return [
    {
      label: t('expense-items-details-field-code'),
      value: typeof displayItem.code === 'string' ? displayItem.code : 'N/A'
    },
    {
      label: t('expense-items-details-field-status'),
      value: statusBadge
    },
    {
      label: t('expense-items-details-field-expense-date'),
      value: displayItem.expenseDate ? formatDate(displayItem.expenseDate, 'date.short') : 'N/A'
    },
    {
      label: t('expense-items-details-field-invoice-date'),
      value: displayItem.invoiceDate ? formatDate(displayItem.invoiceDate, 'date.short') : 'N/A'
    },
    ...(typeof displayItem.description === 'string' && displayItem.description
      ? [
          {
            label: t('expense-items-details-field-description'),
            value: displayItem.description
          }
        ]
      : []),
    {
      label: t('expense-items-details-field-expense-class'),
      value: displayItem.expenseClass?.value ? getCatalogValue(displayItem.expenseClass) : 'N/A'
    },
    {
      label: t('expense-items-details-field-cost-center'),
      value: displayItem.costCenter?.name ? String(displayItem.costCenter.name) : 'N/A'
    },
    {
      label: t('expense-items-details-field-amount'),
      value: formatCurrencyDisplay(displayItem.reimbursableAmount, displayItem.currency?.code)
    }
  ]
}
