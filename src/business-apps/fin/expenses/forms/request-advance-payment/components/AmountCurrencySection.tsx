import React from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useTranslation
} from '@newwork/nw-design-system'
import AmountInput from './AmountInput'
import translations from '../_i18n'
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
  const { t } = useTranslation(translations)

  const handleAmountChange = (newAmount: number) => {
    onAmountChange(newAmount)

    // Validate against max amount
    if (newAmount > maxAmount) {
      onValidationError(t('amount-error'))
    } else {
      onValidationError(null)
    }
  }
  return (
    <div className="gba:grid gba:w-full gba:grid-cols-2 gba:gap-4 gba:mb-4" data-testid={dataTestId}>
      {/* Amount Field - single background for label + input */}
      <div
        className="gba:min-w-0 gba:flex gba:flex-col gba:bg-gray-100 gba:rounded-md"
        data-testid="request-advance-payment-amount-field"
      >
        <label className="gba:block gba:text-xs gba:font-medium gba:text-black gba:bg-transparent gba:px-3 gba:py-1 gba:rounded-t-md">
          {t('amount-label')}
          <span className="gba:text-muted-foreground"> *</span>
        </label>
        <AmountInput
          value={amount}
          onChange={handleAmountChange}
          placeholder={t('amount-placeholder')}
          disabled={disabled}
          data-testid="request-advance-payment-amount-input"
          required={true}
        />
      </div>

      {/* Currency Field */}
      <div
        className="gba:min-w-0 gba:flex gba:flex-col gba:bg-gray-100 gba:rounded-md"
        data-testid="request-advance-payment-currency-field"
      >
        <label className="gba:block gba:text-xs gba:font-medium gba:text-black gba:bg-gray-100 gba:px-3 gba:py-1 gba:rounded-t-md">
          {t('currency-label')}
          <span className="gba:text-muted-foreground"> *</span>
        </label>
        <div className="gba:w-full">
          <Select
            value={currency}
            onValueChange={onCurrencyChange}
            disabled={true} // Currency is locked to plan's currency
            data-testid="request-advance-payment-currency-select"
          >
            <SelectTrigger className="gba:h-10 gba:w-full gba:justify-between gba:bg-gray-100 gba:border-none">
              <SelectValue placeholder={t('currency-placeholder')} />
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
    </div>
  )
}

export default AmountCurrencySection
