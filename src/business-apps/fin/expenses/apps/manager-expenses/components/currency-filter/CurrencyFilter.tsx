import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';

export interface CurrencyFilterProps {
  /**
   * Currently selected currency code
   */
  value: string | null;
  
  /**
   * Callback when currency selection changes
   */
  onChange: (currency: string | null) => void;
  
  /**
   * List of available currencies to display
   */
  currencies?: string[];
  
  /**
   * Whether to show "All Currencies" option
   */
  showAllOption?: boolean;
  
  /**
   * Custom placeholder text when no currency is selected
   */
  placeholder?: string;
  
  /**
   * Additional CSS class names
   */
  className?: string;
  
  /**
   * Data test ID for testing
   */
  'data-testid'?: string;
  
  /**
   * Whether the component is disabled
   */
  disabled?: boolean;
}

/**
 * Reusable currency filter component for selecting currencies
 * Follows the design specifications with a consistent dropdown style
 */
export const CurrencyFilter: React.FC<CurrencyFilterProps> = ({
  value,
  onChange,
  currencies = ['EUR', 'USD', 'GBP', 'RON', 'CHF', 'PLN', 'CZK', 'HUF', 'SEK', 'DKK', 'NOK'],
  showAllOption = true,
  placeholder = getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.all_currencies', 'All Currencies'),
  className = '',
  'data-testid': dataTestId = 'currency-filter',
  disabled = false
}) => {
  // Handle selection change
  const handleChange = (newValue: string) => {
    // If "all" is selected, pass null to indicate no specific currency filter
    if (newValue === 'all') {
      onChange(null);
    } else {
      onChange(newValue);
    }
  };

  return (
    <div 
      className={`gba:flex gba:items-center gba:gap-2 ${className}`}
      data-testid={`${dataTestId}-container`}
    >
      <Select
        value={value || 'all'}
        onValueChange={handleChange}
        disabled={disabled}
        data-testid={dataTestId}
      >
        <SelectTrigger className="gba:w-[140px] gba:h-9 gba:text-sm gba:border-gray-300">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {showAllOption && (
            <SelectItem value="all" data-testid={`${dataTestId}-option-all`}>
              {placeholder}
            </SelectItem>
          )}
          {currencies.map((currency) => (
            <SelectItem 
              key={currency} 
              value={currency}
              data-testid={`${dataTestId}-option-${currency.toLowerCase()}`}
            >
              {currency}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default CurrencyFilter;
