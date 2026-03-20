import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import AmountInput from './AmountInput'
// types from FormTypes are not required here

interface AmountCurrencySectionProps {
  amount: number
  currency: string
  onAmountChange: (value: number) => void
  onCurrencyChange: (value: string) => void
  onValidationError: (error: string | null) => void
  maxAmount: number
  disabled?: boolean
  'data-testid'?: string
}

/**
 * AmountCurrencySection component following Single Responsibility Principle
 * Responsible only for amount and currency input section
 */
const AmountCurrencySection: React.FC<AmountCurrencySectionProps> = ({
  amount,
  currency,
  onAmountChange,
  onCurrencyChange,
  onValidationError,
  maxAmount,
  disabled = false,
  'data-testid': dataTestId = 'request-advance-payment-amount-currency-section'
}) => {
  const handleAmountChange = (newAmount: number) => {
    onAmountChange(newAmount)

    // Validate against max amount
    if (newAmount > maxAmount) {
      onValidationError(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:initiate_advance_payment.amount_error',
          "Advance Payment amount can't be greater than Estimated Expenses and Allowances amount"
        )
      )
    } else {
      onValidationError(null)
    }
  }
  return (
    <div className="gba:flex gba:gap-4 gba:mb-4" data-testid={dataTestId}>
      {/* Amount Field - single background for label + input */}
      <div
        className="gba:flex-1 gba:flex gba:flex-col gba:bg-gray-100 gba:rounded-md"
        data-testid="request-advance-payment-amount-field"
      >
        <label className="gba:block gba:text-xs gba:font-medium gba:text-black gba:bg-transparent gba:px-3 gba:py-1 gba:rounded-t-md">
          {getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.amount', 'Amount')}
          <span className="gba:text-muted-foreground"> *</span>
        </label>
        <AmountInput
          value={amount}
          onChange={handleAmountChange}
          placeholder={getTranslationFromI18nKeyAndLabel(
            'lowcoder:create_expense_item.change_expense_item_container.current_amount_placeholder',
            'Enter Amount'
          )}
          disabled={disabled}
          data-testid="request-advance-payment-amount-input"
          required={true}
        />
      </div>

      {/* Currency Field */}
      <div className="gba:flex-1 gba:bg-gray-100" data-testid="request-advance-payment-currency-field">
        <label className="gba:block gba:text-xs gba:font-medium gba:text-black gba:bg-gray-100 gba:px-2 gba:py-1 gba:rounded">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:create_expense_item.change_expense_item_container.current_currency_label',
            'Currency'
          )}
          <span className="gba:text-muted-foreground"> *</span>
        </label>
        <Select
          value={currency}
          onValueChange={onCurrencyChange}
          disabled={true} // Currency is locked to plan's currency
          data-testid="request-advance-payment-currency-select"
        >
          <SelectTrigger
            className="gba:h-10 gba:bg-gray-100 gba:border-none"
            style={{ width: '100%', justifyContent: 'space-between' }}
          >
            <SelectValue
              placeholder={getTranslationFromI18nKeyAndLabel(
                'lowcoder:request_advance_payment.select_currency',
                'Select Currency'
              )}
            />
          </SelectTrigger>
          <SelectContent>
            {currency && (
              <SelectItem key={currency} value={currency}>
                {currency}
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

export default AmountCurrencySection
