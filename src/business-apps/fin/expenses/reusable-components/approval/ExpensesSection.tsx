import React from 'react'
import { FileTextIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface ExpenseItem {
  id: string
  title: string
  expenseClass: any
  expenseRuleGeneralExpense?: {
    name?: string
  }
  totalAmount: number
}

interface ExpensesSectionProps {
  expenseItems: ExpenseItem[]
  currencyCode: string
  formatCurrency: (amount: number, currencyCode: string) => string
  getCatalogValue: (catalogEntry: any) => string
}

const ExpensesSection: React.FC<ExpensesSectionProps> = ({
  expenseItems,
  currencyCode,
  formatCurrency,
  getCatalogValue
}) => {
  if (expenseItems.length === 0) {
    return null
  }

  return (
    <div data-testid="approve-expense-plan-expenses" className="gba:mb-4">
      {/* Title - Grayed out full width */}
      <div className="gba:bg-gray-100 gba:p-3 gba:rounded-sm gba:mb-4 gba:w-full">
        <span className="gba:text-foreground gba:text-sm gba:font-semibold gba:pl-3">
          {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_plan.planned_expenses_header', 'Expenses')}(
          {expenseItems.length})
        </span>
      </div>

      {expenseItems.map((item, index) => (
        <div key={item.id} className="gba:mb-3 gba:pl-6" data-testid={`approve-expense-plan-expense-${index}`}>
          <div className="gba:font-semibold gba:text-foreground">{item.title}</div>
          <div className="gba:flex gba:justify-between gba:items-center gba:mb-1">
            <div className="gba:text-muted-foreground">
              <FileTextIcon size={16} className="gba:text-base gba:text-muted-foreground gba:mr-1" />
              {getCatalogValue(item.expenseClass)}: {item.expenseRuleGeneralExpense?.name}
            </div>
            <div className="gba:font-semibold gba:text-foreground">
              {formatCurrency(item.totalAmount, currencyCode)}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

export default ExpensesSection
