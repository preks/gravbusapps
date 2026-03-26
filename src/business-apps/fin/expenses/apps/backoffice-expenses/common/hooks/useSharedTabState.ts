import React, { useEffect, useMemo, useRef } from 'react'
import { CurrencyDropdown } from '../components/CurrencyDropdown'

export function useCurrencyInit(
  mostUsedCurrency: string | null | undefined,
  setCurrency: (code: string) => void,
  currentCurrency?: string | null
) {
  const hasInitialized = useRef(false)
  useEffect(() => {
    if (hasInitialized.current) return
    if (mostUsedCurrency && !currentCurrency) {
      setCurrency(mostUsedCurrency)
      hasInitialized.current = true
    }
  }, [mostUsedCurrency, currentCurrency, setCurrency])
}

export function useFilterSignatureReset(filterSignature: unknown, resetPage: () => void) {
  const prevRef = useRef<string | null>(null)
  useEffect(() => {
    const signature = JSON.stringify(filterSignature)
    if (prevRef.current !== null && prevRef.current !== signature) {
      resetPage()
    }
    prevRef.current = signature
  }, [filterSignature, resetPage])
}

export function useVisibleColumns(visibleColumns: string[], availableColumns: Array<{ id: string }>) {
  return useMemo(() => {
    if (visibleColumns.length > 0) return visibleColumns
    return availableColumns.map(c => c.id)
  }, [visibleColumns, availableColumns])
}

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
