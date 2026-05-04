import type { ReactNode } from 'react'
import { getTranslationFromI18nKeyAndLabel, formatDate, getCatalogValue } from '@/common/utils/windowUtils'
import { formatCurrencyDisplay } from '../../../../utils'
import type { DetailsPanelField } from '@/business-apps/fin/expenses/common/components/details-panel/DetailsPanelContent'
import type { ExpenseItem } from '../../../../hooks/useGetExpenseItems'

export function buildExpenseItemDetailsFields(displayItem: ExpenseItem, statusBadge: ReactNode): DetailsPanelField[] {
  return [
    {
      label: getTranslationFromI18nKeyAndLabel('common.code', 'Code'),
      value: typeof displayItem.code === 'string' ? displayItem.code : 'N/A'
    },
    {
      label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
      value: statusBadge
    },
    {
      label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense_date', 'Expense Date'),
      value: displayItem.expenseDate ? formatDate(displayItem.expenseDate, 'date.short') : 'N/A'
    },
    {
      label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.expense_table.invoice_date', 'Invoice Date'),
      value: displayItem.invoiceDate ? formatDate(displayItem.invoiceDate, 'date.short') : 'N/A'
    },
    ...(typeof displayItem.description === 'string' && displayItem.description
      ? [
          {
            label: getTranslationFromI18nKeyAndLabel(
              'lowcoder:create_expense_item.change_expense_item_container.current_description_label',
              'Description'
            ),
            value: displayItem.description
          }
        ]
      : []),
    {
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_item.change_expense_item_container.current_e_class_label',
        'Expense Class'
      ),
      value: displayItem.expenseClass?.value ? getCatalogValue(displayItem.expenseClass) : 'N/A'
    },
    {
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:create_expense_request.expense_request_container.current_cost_center_label',
        'Cost Center'
      ),
      value: displayItem.costCenter?.name ? String(displayItem.costCenter.name) : 'N/A'
    },
    {
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:travel_region_rule.travel_region_rule_details_list.amount',
        'Amount'
      ),
      value: formatCurrencyDisplay(displayItem.reimbursableAmount, displayItem.currency?.code)
    }
  ]
}
