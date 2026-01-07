import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GET_USED_REQUEST_CURRENCIES_BY_EMPLOYEE } from '../queries/expenseRequests'
import { DEFAULT_CURRENCY_REF } from '../utils/currencyUtils'
import { fetchEmployeeCurrencyStats } from '../utils/currencyDataService'

export interface RequestCurrencyStat {
  ref: string
  code: string
  count: number
}

export const useExpenseRequestCurrencies = (
  context?: BusinessAppContextProps,
  selectedFilters: string[] = [],
  setFilters?: (filters: string[]) => void
) => {
  const [currencyStats, setCurrencyStats] = useState<RequestCurrencyStat[]>([])
  const [initialized, setInitialized] = useState<boolean>(false)
  const hasPreselectedCurrencyRef = useRef<boolean>(false)

  const selectedCurrencyRef = useMemo(() => {
    const token = selectedFilters.find(f => f.startsWith('currency:'))
    return token ? token.substring('currency:'.length) : undefined
  }, [selectedFilters])

  const preselectMostUsedOnce = useCallback(
    (stats: RequestCurrencyStat[]) => {
      if (!setFilters || hasPreselectedCurrencyRef.current || stats.length === 0) return
      const anyCurrencySelected = selectedFilters.some(f => f.startsWith('currency:'))
      if (anyCurrencySelected) return
      const mostUsed = stats[0]
      const nonCurrencyFilters = selectedFilters.filter(f => !f.startsWith('currency:'))
      setFilters([...nonCurrencyFilters, `currency:${mostUsed.ref}`])
      hasPreselectedCurrencyRef.current = true
    },
    [selectedFilters, setFilters]
  )

  useEffect(() => {
    const employeeId = context?.userInfo?.employeeDetails?.employeeId
    const accessToken = context?.accessToken
    if (!employeeId || !accessToken) {
      return
    }
    if (initialized) {
      return
    }

    const fetchCurrencies = async () => {
      try {
        const stats = await fetchEmployeeCurrencyStats({
          accessToken,
          query: GET_USED_REQUEST_CURRENCIES_BY_EMPLOYEE,
          variables: { employeeId, limit: 2000 },
          dataPath: ['ExpenseRequest'],
          mapRow: (r: any) => ({
            currencyRef: r.currencyRef || DEFAULT_CURRENCY_REF,
            currency: { code: r.currency?.code || 'EUR' }
          })
        })
        setCurrencyStats(stats as RequestCurrencyStat[])
        preselectMostUsedOnce(stats as RequestCurrencyStat[])
      } catch {
        // ignore
      } finally {
        setInitialized(true)
      }
    }

    void fetchCurrencies()
  }, [context?.userInfo?.employeeDetails?.employeeId, context?.accessToken, initialized, preselectMostUsedOnce])

  return {
    currencyStats,
    selectedCurrencyRef,
    initialized
  }
}
