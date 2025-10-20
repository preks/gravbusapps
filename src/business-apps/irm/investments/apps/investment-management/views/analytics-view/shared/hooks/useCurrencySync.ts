import { useState, useEffect, useRef } from 'react'

/**
 * @hook useCurrencySync
 * @description Synchronizes a chart-level currency state with a master currency.
 * When the master currency changes, the local currency automatically updates to match.
 * The chart can still override the currency independently if needed.
 *
 * @param {string} masterCurrency - The master currency to sync with (e.g., from parent component)
 * @param {string} [initialCurrency] - Optional initial currency (defaults to masterCurrency)
 * @returns {[string, (value: string) => void]} Tuple of [currentCurrency, setCurrency]
 *
 * @example
 * ```tsx
 * // In a chart component that accepts masterCurrency from parent
 * function MyChart({ masterCurrency, availableCurrencies }) {
 *   const [chartCurrency, setChartCurrency] = useCurrencySync(masterCurrency);
 *
 *   return (
 *     <CurrencyFilter
 *       value={chartCurrency}
 *       onChange={setChartCurrency}
 *       currencies={availableCurrencies}
 *     />
 *   );
 * }
 * ```
 *
 * @example
 * ```tsx
 * // Multiple charts in one component with initial "All" option
 * function MultiChartView({ masterCurrency }) {
 *   const [chart1Currency, setChart1Currency] = useCurrencySync(masterCurrency, 'All');
 *   const [chart2Currency, setChart2Currency] = useCurrencySync(masterCurrency, 'All');
 *   const [chart3Currency, setChart3Currency] = useCurrencySync(masterCurrency, 'All');
 *
 *   // All charts start with "All" but sync with masterCurrency when it changes
 *   // Each can also be changed independently
 * }
 * ```
 */
export const useCurrencySync = (
  masterCurrency: string,
  initialCurrency?: string
): [string, (value: string) => void] => {
  const [currency, setCurrency] = useState<string>(initialCurrency || masterCurrency)
  const isFirstRender = useRef(true)
  const prevMasterCurrency = useRef<string>(masterCurrency)

  // Sync with master currency when it changes (but skip first render to preserve initial value)
  useEffect(() => {
    // Skip first render
    if (isFirstRender.current) {
      isFirstRender.current = false
      prevMasterCurrency.current = masterCurrency
      return
    }

    // Only sync if master currency actually changed
    if (prevMasterCurrency.current !== masterCurrency) {
      setCurrency(masterCurrency)
      prevMasterCurrency.current = masterCurrency
    }
  }, [masterCurrency])

  return [currency, setCurrency]
}

/**
 * @hook useMultipleCurrencySync
 * @description Helper hook for managing multiple currency states that all sync with a master currency.
 * Useful when a component has multiple charts, each needing their own currency filter.
 *
 * @param {string} masterCurrency - The master currency to sync with
 * @param {number} count - Number of currency states to create
 * @returns {Array<[string, (value: string) => void]>} Array of [currency, setCurrency] tuples
 *
 * @example
 * ```tsx
 * function DashboardWithMultipleCharts({ masterCurrency }) {
 *   const currencies = useMultipleCurrencySync(masterCurrency, 3);
 *   const [chart1Currency, setChart1Currency] = currencies[0];
 *   const [chart2Currency, setChart2Currency] = currencies[1];
 *   const [chart3Currency, setChart3Currency] = currencies[2];
 *   // ... render charts
 * }
 * ```
 */
export const useMultipleCurrencySync = (
  masterCurrency: string,
  count: number
): Array<[string, (value: string) => void]> => {
  const currencies: Array<[string, (value: string) => void]> = []

  for (let i = 0; i < count; i++) {
    currencies.push(useCurrencySync(masterCurrency))
  }

  return currencies
}
