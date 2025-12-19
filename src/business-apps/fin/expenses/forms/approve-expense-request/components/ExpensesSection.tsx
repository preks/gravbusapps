import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Separator, Badge } from '@newwork/nw-design-system'
import { PiReceipt } from 'react-icons/pi'

interface ExpenseItem {
  id: string
  title: string
  totalAmount: number
  expenseClass?: {
    value: string
    translations?: Array<{ value: string; locale: string }>
    catalog?: { defaultLocale: string }
  }
  expenseRuleGeneralExpense?: {
    name: string
  }
}

interface ExpensesSectionProps {
  expenseItems: ExpenseItem[]
  currencyCode: string
  formatCurrency: (amount: number, currency: string) => string
  getCatalogValue: (catalog: ExpenseItem['expenseClass']) => string
  t: (key: string) => string
}

const ExpensesSection: React.FC<ExpensesSectionProps> = ({
  expenseItems,
  currencyCode,
  formatCurrency,
  getCatalogValue,
  t
}) => {
  if (!expenseItems || expenseItems.length === 0) {
    return null
  }

  return (
    <Card data-testid="approve-expense-plan-expenses">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <PiReceipt className="gba:h-5 gba:w-5" />
          {t('section-expenses')}
          <Badge variant="secondary" className="gba:ml-2">
            {expenseItems.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-3">
        {expenseItems.map((item, index) => (
          <div key={item.id} data-testid={`approve-expense-plan-expense-${index}`}>
            <div className="gba:flex gba:justify-between gba:items-start gba:gap-4">
              <div className="gba:flex-1">
                <p className="gba:font-medium gba:text-sm">{item.title}</p>
                <div className="gba:flex gba:items-center gba:gap-2 gba:mt-1">
                  <Badge variant="outline" className="gba:text-xs">
                    {getCatalogValue(item.expenseClass)}
                  </Badge>
                  {item.expenseRuleGeneralExpense?.name && (
                    <span className="gba:text-xs gba:text-muted-foreground">{item.expenseRuleGeneralExpense.name}</span>
                  )}
                </div>
              </div>
              <div className="gba:text-right">
                <p className="gba:font-semibold gba:text-sm">{formatCurrency(item.totalAmount, currencyCode)}</p>
              </div>
            </div>
            {index < expenseItems.length - 1 && <Separator className="gba:mt-3" />}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

export default ExpensesSection
