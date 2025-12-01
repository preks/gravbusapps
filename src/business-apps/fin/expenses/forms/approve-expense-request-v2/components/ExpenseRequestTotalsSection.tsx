import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Label, Separator } from '@newwork/nw-design-system'
import { PiWallet } from 'react-icons/pi'
import { formatNumberFunction, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface ExpenseRequestTotalsSectionProps {
  totalAmount: number
  nonReimbursableAmount: number
  advancePaymentAmount: number
  currencyCode: string
  formatCurrency: (amount: number, currencyCode: string) => string
  expensePlanTotalAmount?: number
  isExpensePlan: boolean
  remainingAmount: number
  reimbursableAmount?: number
}

const ExpenseRequestTotalsSection: React.FC<ExpenseRequestTotalsSectionProps> = ({
  totalAmount,
  nonReimbursableAmount,
  advancePaymentAmount,
  currencyCode,
  formatCurrency,
  expensePlanTotalAmount,
  isExpensePlan,
  remainingAmount,
  reimbursableAmount
}) => {
  // Calculate plan comparison if plan data is available
  const getPlanComparison = () => {
    if (!expensePlanTotalAmount) return null

    const difference = totalAmount - expensePlanTotalAmount
    const absDifference = formatNumberFunction(String(Math.abs(difference)), '0.00[,]00')

    if (difference === 0) {
      return {
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:approve_expense_request.comparison_with_plan_equal',
          'Equals planned amount'
        ),
        isPositive: true
      }
    } else if (difference < 0) {
      return {
        description: `${absDifference} ${currencyCode} ${getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.comparison_with_plan_less', 'less than planned')}`,
        isPositive: true
      }
    } else if (difference > 0) {
      return {
        description: `${absDifference} ${currencyCode} ${getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.comparison_with_plan_more', 'more than planned')}`,
        isPositive: false
      }
    }

    return null
  }

  const planComparison = getPlanComparison()
  const calculatedReimbursable = reimbursableAmount ?? totalAmount - nonReimbursableAmount

  return (
    <Card data-testid="approve-expense-request-v2-financial-overview">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <PiWallet className="gba:h-5 gba:w-5" />
          {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_plan.financial_overview', 'Financial Overview')}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-3">
        {/* Total Amount */}
        <div className="gba:flex gba:justify-between gba:items-center">
          <Label className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_request_list.expense_plan_table.total_amount',
              'Total Amount'
            )}
          </Label>
          <div className="gba:text-right">
            <p className="gba:text-lg gba:font-bold">{formatCurrency(totalAmount, currencyCode)}</p>
            {/* Plan comparison if available */}
            {planComparison && (
              <p
                className={`gba:text-xs gba:font-medium ${planComparison.isPositive ? 'gba:text-success' : 'gba:text-warning'}`}
                data-testid="approve-expense-request-v2-plan-comparison"
              >
                {planComparison.description}
              </p>
            )}
          </div>
        </div>

        <Separator />

        {/* Reimbursable and Non-Reimbursable */}
        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          <div>
            <Label className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_request_card.reimbursable', 'Reimbursable')}
            </Label>
            <p className="gba:text-sm gba:font-medium gba:text-success">
              {formatCurrency(calculatedReimbursable, currencyCode)}
            </p>
          </div>
          <div>
            <Label className="gba:text-sm gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.non-reimbursable', 'Non-Reimbursable')}
            </Label>
            <p className="gba:text-sm gba:font-medium gba:text-destructive">
              {formatCurrency(nonReimbursableAmount, currencyCode)}
            </p>
          </div>
        </div>

        {/* Advance Payment and Remaining (if expense plan) */}
        {isExpensePlan && (advancePaymentAmount > 0 || remainingAmount !== totalAmount) && (
          <>
            <Separator />
            <div className="gba:grid gba:grid-cols-2 gba:gap-4">
              {advancePaymentAmount > 0 && (
                <div>
                  <Label className="gba:text-sm gba:text-muted-foreground">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:approve_expense_request.advance_payment',
                      'Advance Payment'
                    )}
                  </Label>
                  <p className="gba:text-sm gba:font-medium">{formatCurrency(advancePaymentAmount, currencyCode)}</p>
                </div>
              )}
              {remainingAmount !== totalAmount && (
                <div>
                  <Label className="gba:text-sm gba:text-muted-foreground">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_plan.remaining', 'Remaining')}
                  </Label>
                  <p className="gba:text-sm gba:font-medium gba:text-success">
                    {formatCurrency(remainingAmount, currencyCode)}
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Plan Total (if linked to expense plan) */}
        {expensePlanTotalAmount !== undefined && expensePlanTotalAmount > 0 && (
          <>
            <Separator />
            <div className="gba:flex gba:justify-between gba:items-center">
              <Label className="gba:text-sm gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.planned_amount', 'Planned Amount')}
              </Label>
              <p className="gba:text-sm gba:font-medium">{formatCurrency(expensePlanTotalAmount, currencyCode)}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default ExpenseRequestTotalsSection
