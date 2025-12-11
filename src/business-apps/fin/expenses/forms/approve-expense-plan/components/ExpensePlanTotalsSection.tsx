import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Label, Separator } from '@newwork/nw-design-system'
import { PiWallet } from 'react-icons/pi'

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
  formatCurrency
}) => {
  return (
    <Card data-testid="approve-expense-plan-v2-financial-overview">
      <CardHeader>
        <CardTitle className="gba:flex gba:items-center gba:gap-2">
          <PiWallet className="gba:h-5 gba:w-5" />
          Financial Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-3">
        {/* Total Amount */}
        <div className="gba:flex gba:justify-between gba:items-center">
          <Label className="gba:text-sm gba:text-muted-foreground">Total Amount</Label>
          <p className="gba:text-lg gba:font-bold">{formatCurrency(totalAmount, currencyCode)}</p>
        </div>

        <Separator />

        {/* Expenses and Allowances */}
        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          <div>
            <Label className="gba:text-sm gba:text-muted-foreground">Expenses</Label>
            <p className="gba:text-sm gba:font-medium">{formatCurrency(totalAmountExpense, currencyCode)}</p>
          </div>
          <div>
            <Label className="gba:text-sm gba:text-muted-foreground">Allowances</Label>
            <p className="gba:text-sm gba:font-medium">{formatCurrency(totalAmountAllowance, currencyCode)}</p>
          </div>
        </div>

        <Separator />

        {/* Reimbursable and Non-Reimbursable */}
        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          <div>
            <Label className="gba:text-sm gba:text-muted-foreground">Reimbursable</Label>
            <p className="gba:text-sm gba:font-medium gba:text-success">
              {formatCurrency(reimbursableAmount, currencyCode)}
            </p>
          </div>
          <div>
            <Label className="gba:text-sm gba:text-muted-foreground">Non-Reimbursable</Label>
            <p className="gba:text-sm gba:font-medium gba:text-destructive">
              {formatCurrency(nonReimbursableAmount, currencyCode)}
            </p>
          </div>
        </div>

        <Separator />

        {/* Deductible and Non-Deductible */}
        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          <div>
            <Label className="gba:text-sm gba:text-muted-foreground">Deductible</Label>
            <p className="gba:text-sm gba:font-medium">{formatCurrency(deductibleAmount, currencyCode)}</p>
          </div>
          <div>
            <Label className="gba:text-sm gba:text-muted-foreground">Non-Deductible</Label>
            <p className="gba:text-sm gba:font-medium">{formatCurrency(nonDeductibleAmount, currencyCode)}</p>
          </div>
        </div>

        {/* Advance Payment */}
        {advancePaymentAmount > 0 && (
          <>
            <Separator />
            <div>
              <Label className="gba:text-sm gba:text-muted-foreground">Advance Payment</Label>
              <p className="gba:text-sm gba:font-medium">{formatCurrency(advancePaymentAmount, currencyCode)}</p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

export default ExpensePlanTotalsSection
