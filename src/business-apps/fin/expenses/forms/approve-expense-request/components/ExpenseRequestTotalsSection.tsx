import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Label, Separator } from '@newwork/nw-design-system'
import { WalletIcon } from '@phosphor-icons/react'
import { formatNumberFunction } from '@/common/utils/windowUtils'

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
  t: (key: string, params?: Record<string, unknown>) => string
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
  reimbursableAmount,
  t
}) => {
  // Calculate plan comparison if plan data is available
  const getPlanComparison = () => {
    if (!expensePlanTotalAmount) return null

    const difference = totalAmount - expensePlanTotalAmount
    const absDifference = formatNumberFunction(String(Math.abs(difference)), '0.00[,]00')

    if (difference === 0) {
      return {
        description: t('plan-comparison-equal'),
        isPositive: true
      }
    } else if (difference < 0) {
      return {
        description: `${absDifference} ${currencyCode} ${t('plan-comparison-less')}`,
        isPositive: true
      }
    } else if (difference > 0) {
      return {
        description: `${absDifference} ${currencyCode} ${t('plan-comparison-more')}`,
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
          <WalletIcon className="gba:h-5 gba:w-5" />
          {t('section-financial-overview')}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-3">
        {/* Total Amount */}
        <div className="gba:flex gba:justify-between gba:items-center">
          <Label className="gba:text-sm gba:text-muted-foreground">{t('label-total-amount')}</Label>
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
            <Label className="gba:text-sm gba:text-muted-foreground">{t('label-reimbursable')}</Label>
            <p className="gba:text-sm gba:font-medium gba:text-success">
              {formatCurrency(calculatedReimbursable, currencyCode)}
            </p>
          </div>
          <div>
            <Label className="gba:text-sm gba:text-muted-foreground">{t('label-non-reimbursable')}</Label>
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
                  <Label className="gba:text-sm gba:text-muted-foreground">{t('label-advance-payment')}</Label>
                  <p className="gba:text-sm gba:font-medium">{formatCurrency(advancePaymentAmount, currencyCode)}</p>
                </div>
              )}
              {remainingAmount !== totalAmount && (
                <div>
                  <Label className="gba:text-sm gba:text-muted-foreground">{t('label-remaining-amount')}</Label>
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
              <Label className="gba:text-sm gba:text-muted-foreground">{t('label-expense-plan-total')}</Label>
              <p className="gba:text-sm gba:font-medium">{formatCurrency(expensePlanTotalAmount, currencyCode)}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default ExpenseRequestTotalsSection
