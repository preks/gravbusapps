import React from 'react'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

/**
 * Props for CurrencyFilter component
 */
export interface CurrencyFilterProps {
  /**
   * Currently selected currency code
   */
  value: string
  /**
   * Callback fired when currency selection changes
   */
  onChange: (value: string) => void
  /**
   * List of available currency codes
   */
  currencies: string[]
  /**
   * Additional CSS classes
   */
  className?: string
  /**
   * Data test ID for testing
   */
  dataTestId?: string
  /**
   * Whether to show label
   * @default true
   */
  showLabel?: boolean
  /**
   * Custom label text
   * @default "Currency:"
   */
  label?: string
  /**
   * When set, prepends an "all currencies" option with this label and value 'all'.
   * Used in views where selecting across all currencies is needed.
   * @example allOptionLabel="All"
   */
  allOptionLabel?: string
}

/**
 * CurrencyFilter Component
 *
 * Reusable currency selection filter used across analytics views.
 * Provides a consistent UX for filtering data by currency.
 *
 * @example
 * ```tsx
 * <CurrencyFilter
 *   value={selectedCurrency}
 *   onChange={setSelectedCurrency}
 *   currencies={['EUR', 'USD', 'GBP']}
 *   dataTestId="portfolio-currency-filter"
 * />
 * ```
 */
export const CurrencyFilter: React.FC<CurrencyFilterProps> = ({
  value,
  onChange,
  currencies,
  className,
  dataTestId = 'currency-filter',
  showLabel = true,
  label = getTranslationFromI18nKeyAndLabel('currency.filter', 'Currency:'),
  allOptionLabel
}) => {
  if (!allOptionLabel && currencies.length === 0) return null

  return (
    <div className={`gba:flex gba:items-center gba:gap-2 ${className || ''}`}>
      {showLabel && (
        <span className="gba:text-sm gba:font-medium gba:text-gray-700" data-testid={`${dataTestId}-label`}>
          {label}
        </span>
      )}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="gba:w-24 gba:h-8" data-testid={dataTestId}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent data-testid={`${dataTestId}-content`}>
          {allOptionLabel && (
            <SelectItem value="all" data-testid={`${dataTestId}-option-all`}>
              {allOptionLabel}
            </SelectItem>
          )}
          {currencies.map(currency => (
            <SelectItem key={currency} value={currency} data-testid={`${dataTestId}-option-${currency}`}>
              {currency}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}

export default CurrencyFilter
