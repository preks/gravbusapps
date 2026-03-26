import { useCallback, useMemo, useState } from 'react'
import { useCurrencyInit, useCurrencySecondaryAction } from '../../../../common/hooks/useSharedTabState'
import type { Currency } from '../../../../hooks/useFilterData'

interface UseAdvancePaymentCurrencyParams {
  currencies: readonly Currency[]
  mostUsedCurrencyRef: string | null | undefined
  setCurrentPage: (page: number) => void
}

export function useAdvancePaymentCurrency({
  currencies,
  mostUsedCurrencyRef,
  setCurrentPage
}: UseAdvancePaymentCurrencyParams) {
  const availableCurrencyCodes = useMemo(
    () => [...new Set(currencies.map(c => c.code))].sort((a, b) => a.localeCompare(b)),
    [currencies]
  )

  const mostUsedCurrencyCode = useMemo(() => {
    if (!mostUsedCurrencyRef || currencies.length === 0) return null
    return currencies.find(c => c.currencyRef === mostUsedCurrencyRef)?.code ?? null
  }, [mostUsedCurrencyRef, currencies])

  const [selectedCurrencyCode, setSelectedCurrencyCode] = useState<string | null>(null)

  useCurrencyInit(mostUsedCurrencyCode, setSelectedCurrencyCode, selectedCurrencyCode)

  const currencyRefFromCode = useCallback(
    (code: string | null): string => {
      if (!code) return ''
      return currencies.find(c => c.code === code)?.currencyRef ?? ''
    },
    [currencies]
  )

  const handleCurrencyChange = useCallback(
    (code: string | null) => {
      setSelectedCurrencyCode(code)
      setCurrentPage(1)
    },
    [setCurrentPage]
  )

  const selectedCurrencyRef = useMemo(
    () => currencyRefFromCode(selectedCurrencyCode),
    [currencyRefFromCode, selectedCurrencyCode]
  )

  const currencySecondaryAction = useCurrencySecondaryAction(
    availableCurrencyCodes,
    selectedCurrencyCode,
    handleCurrencyChange,
    'backoffice-advance-payments'
  )

  return {
    selectedCurrencyCode,
    selectedCurrencyRef,
    currencySecondaryAction
  }
}
