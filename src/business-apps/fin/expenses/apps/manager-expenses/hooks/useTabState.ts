import React, { useMemo } from 'react'
import { CurrencyDropdown } from '../common/components/CurrencyDropdown'

export {
  useCurrencyInit,
  useFilterSignatureReset,
  useSortingState,
  useSearchHandler,
  useCurrencyChangeHandler,
  useVisibleColumns,
  useEmptyMessage
} from '../../../common/hooks/useSharedTabState'

export function useCurrencySecondaryAction(
  availableCurrencies: string[],
  selectedCurrency: string | null,
  onCurrencyChange: (code: string | null) => void,
  testIdPrefix: string
) {
  return useMemo(
    () =>
      React.createElement(CurrencyDropdown, {
        availableCurrencies,
        selectedCurrency,
        onCurrencyChange,
        testIdPrefix
      }),
    [availableCurrencies, selectedCurrency, onCurrencyChange, testIdPrefix]
  )
}
