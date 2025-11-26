import React from 'react'
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
}

const ExpenseRequestTotalsSection: React.FC<ExpenseRequestTotalsSectionProps> = ({
  totalAmount,
  nonReimbursableAmount,
  advancePaymentAmount,
  currencyCode,
  formatCurrency,
  expensePlanTotalAmount,
  isExpensePlan,
  remainingAmount
}) => {
  // Calculate plan comparison if plan data is available
  const getPlanComparison = () => {
    if (!expensePlanTotalAmount) return null

    const difference = totalAmount - expensePlanTotalAmount
    const absDifference = formatNumberFunction(String(Math.abs(difference)), '0.00[,]00')

    if (difference === 0) {
      return {
        description:
          (globalThis as any)?.lowcoder?.translate?.(
            'lowcoder:approve_expense_request.comparison_with_plan_equal',
            'Equals planned amount'
          ) || 'Equals planned amount',
        color: '#0ab874'
      }
    } else if (difference < 0) {
      return {
        description: `${absDifference} ${currencyCode} ${(globalThis as any)?.lowcoder?.translate?.('lowcoder:approve_expense_request.comparison_with_plan_less', 'Less than planned') || 'Less than planned'}`,
        color: '#0ab874'
      }
    } else if (difference > 0) {
      return {
        description: `${absDifference} ${currencyCode} ${(globalThis as any)?.lowcoder?.translate?.('lowcoder:approve_expense_request.comparison_with_plan_more', 'More than planned') || 'More than planned'}`,
        color: '#ffc61a'
      }
    }

    return null
  }

  const planComparison = getPlanComparison()

  return (
    <>
      {/* Delimiting gray section */}
      <div
        className="gba:h-[20px] gba:bg-gray-100 gba:mb-3 gba:rounded-sm"
        data-testid="approve-expense-request-v2-delimiter-section"
      />

      {/* Total Expenses */}
      <div className="gba:mb-6 gba:pl-6" data-testid="approve-expense-request-v2-total">
        <div className="gba:flex gba:justify-between gba:items-center">
          <div className="gba:text-sm gba:font-medium gba:text-foreground">
            {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.planned_expenses_header', 'Expenses')}
          </div>
          <div className="gba:text-lg gba:font-semibold gba:text-foreground">
            {formatCurrency(totalAmount, currencyCode)}
          </div>
        </div>

        {/* Plan comparison if available */}
        {planComparison && (
          <div className="gba:flex gba:justify-between gba:items-center gba:mt-1">
            <div className="gba:text-sm gba:text-muted-foreground">{/* Empty space to align with the amount */}</div>
            <div
              className="gba:text-sm gba:font-medium"
              style={{ color: planComparison.color }}
              data-testid="approve-expense-request-v2-plan-comparison"
            >
              {planComparison.description}
            </div>
          </div>
        )}

        {isExpensePlan && advancePaymentAmount !== 0 && (
          <div className="gba:flex gba:justify-between gba:items-center gba:mt-2">
            <div className="gba:text-sm gba:font-medium gba:text-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.advance_payment', 'Advance Payment')}
            </div>
            <div className="gba:text-sm gba:font-semibold gba:text-primary">
              {formatCurrency(advancePaymentAmount, currencyCode)}
            </div>
          </div>
        )}
        {nonReimbursableAmount !== 0 && (
          <div className="gba:flex gba:justify-between gba:items-center gba:mt-2">
            <div className="gba:text-sm gba:font-medium gba:text-foreground">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:approve_expense_request.non_reimbursable',
                'Not Reimbursable Amount'
              )}
            </div>
            <div className="gba:text-sm gba:font-semibold gba:text-primary">
              {formatCurrency(nonReimbursableAmount, currencyCode)}
            </div>
          </div>
        )}
        {remainingAmount !== totalAmount && (
          <div className="gba:flex gba:justify-between gba:items-center gba:mt-2">
            <div className="gba:text-sm gba:font-medium gba:text-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_plan.remaining', 'Remaining amount')}
            </div>
            <div className="gba:text-sm gba:font-semibold gba:text-success">
              {formatCurrency(remainingAmount, currencyCode)}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default ExpenseRequestTotalsSection
