import React from 'react'
import { Card, CardContent, CardHeader, CardTitle, Input, Checkbox, Label } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface TransactionConfirmationSectionProps {
  transactionDate: string
  confirmationChecked: boolean
  onTransactionDateChange: (value: string) => void
  onConfirmationChange: (checked: boolean) => void
  prefixDataTestId?: string
}

const TransactionConfirmationSection: React.FC<TransactionConfirmationSectionProps> = ({
  transactionDate,
  confirmationChecked,
  onTransactionDateChange,
  onConfirmationChange,
  prefixDataTestId = 'transaction-confirmation'
}) => {
  return (
    <Card data-testid={`${prefixDataTestId}-card`}>
      <CardHeader>
        <CardTitle data-testid={`${prefixDataTestId}-title`}>
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:pay_advance_payment_cash.pickup_confirmation_text',
            'Pickup Confirmation'
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:space-y-4">
        {/* Date of transfer */}
        <div className="gba:space-y-2" data-testid={`${prefixDataTestId}-date-field`}>
          <Label htmlFor="transaction-date" className="gba:text-sm gba:font-medium">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:pay_advance_payment_cash.date_of_transfer',
              'Date of transfer'
            )}
            *
          </Label>
          <Input
            id="transaction-date"
            type="date"
            value={transactionDate}
            onChange={e => onTransactionDateChange(e.target.value)}
            data-testid={`${prefixDataTestId}-date-input`}
          />
        </div>

        {/* Confirmation Checkbox */}
        <div className="gba:flex gba:items-start gba:gap-2" data-testid={`${prefixDataTestId}-checkbox-field`}>
          <Checkbox
            id="transaction-confirmation"
            checked={confirmationChecked}
            onCheckedChange={checked => onConfirmationChange(checked === true)}
            data-testid={`${prefixDataTestId}-checkbox`}
          />
          <Label htmlFor="transaction-confirmation" className="gba:text-sm gba:leading-relaxed gba:cursor-pointer">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:pay_advance_payment_cash.checkbox_confirmation_message_cash',
              'I confirm that the advance payment has been handed over to the employee.'
            )}
          </Label>
        </div>
      </CardContent>
    </Card>
  )
}

export default TransactionConfirmationSection
