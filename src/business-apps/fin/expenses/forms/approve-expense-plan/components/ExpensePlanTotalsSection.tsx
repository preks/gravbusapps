import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Label, Separator } from '@newwork/nw-design-system'
import { WalletIcon } from '@phosphor-icons/react'
interface ExpensePlanTotalsSectionProps {
  totalAmount: number
  totalAmountExpense: number
  totalAmountAllowance: number
  reimbursableAmount: number
  nonReimbursableAmount: number
  deductibleAmount: number
  nonDeductibleAmount: number
  advancePaymentAmount: number
  currencyCode: string
  formatCurrency: (amount: number, currencyCode: string) => string
  t: (key: string, vars?: Record<string, unknown>) => string
}

const ExpensePlanTotalsSection: React.FC<ExpensePlanTotalsSectionProps> = ({
  totalAmount,
  totalAmountExpense,
  totalAmountAllowance,
  reimbursableAmount,
  nonReimbursableAmount,
  deductibleAmount,
  nonDeductibleAmount,
  advancePaymentAmount,
  currencyCode,
  formatCurrency,
  t
}) => {
  return (
    <Card data-testid="approve-expense-plan-v2-financial-overview">
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
          <p className="gba:text-lg gba:font-bold">{formatCurrency(totalAmount, currencyCode)}</p>
        </div>

        <Separator />

        {/* Expenses and Allowances */}
        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          <div>
            <Label className="gba:text-sm gba:text-muted-foreground">{t('label-expenses')}</Label>
            <p className="gba:text-sm gba:font-medium">{formatCurrency(totalAmountExpense, currencyCode)}</p>
          </div>
          <div>
            <Label className="gba:text-sm gba:text-muted-foreground">{t('label-allowances')}</Label>
            <p className="gba:text-sm gba:font-medium">{formatCurrency(totalAmountAllowance, currencyCode)}</p>
          </div>
        </div>

        <Separator />

        {/* Reimbursable and Non-Reimbursable */}
        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          <div>
            <Label className="gba:text-sm gba:text-muted-foreground">{t('label-reimbursable')}</Label>
            <p className="gba:text-sm gba:font-medium gba:text-success">
              {formatCurrency(reimbursableAmount, currencyCode)}
            </p>
          </div>
          <div>
            <Label className="gba:text-sm gba:text-muted-foreground">{t('label-non-reimbursable')}</Label>
            <p className="gba:text-sm gba:font-medium gba:text-destructive">
              {formatCurrency(nonReimbursableAmount, currencyCode)}
            </p>
          </div>
        </div>

        <Separator />

        {/* Deductible and Non-Deductible */}
        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          <div>
            <Label className="gba:text-sm gba:text-muted-foreground">{t('label-deductible')}</Label>
            <p className="gba:text-sm gba:font-medium">{formatCurrency(deductibleAmount, currencyCode)}</p>
          </div>
          <div>
            <Label className="gba:text-sm gba:text-muted-foreground">{t('label-non-deductible')}</Label>
            <p className="gba:text-sm gba:font-medium">{formatCurrency(nonDeductibleAmount, currencyCode)}</p>
          </div>
        </div>

        {/* Advance Payment */}
        {advancePaymentAmount > 0 && (
          <>
            <Separator />
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">{t('label-advance-payment')}</Label>
              <p className="gba:text-sm gba:font-medium">{formatCurrency(advancePaymentAmount, currencyCode)}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default ExpensePlanTotalsSection
