import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { GET_USED_PLAN_CURRENCIES_BY_EMPLOYEE } from '../queries/expensePlans'
import { DEFAULT_CURRENCY_REF } from '../utils/currencyUtils'
import { fetchEmployeeCurrencyStats } from '../utils/currencyDataService'

export interface PlanCurrencyStat {
  ref: string
  code: string
  count: number
}

export const useExpensePlanCurrencies = (
  context?: BusinessAppContextProps,
  selectedFilters: string[] = [],
  setFilters?: (filters: string[]) => void
) => {
  const [currencyStats, setCurrencyStats] = useState<PlanCurrencyStat[]>([])
  const hasPreselectedCurrencyRef = useRef<boolean>(false)
  const [initialized, setInitialized] = useState<boolean>(false)
  const selectedFiltersRef = useRef<string[]>(selectedFilters)
  const lastFetchKeyRef = useRef<string | null>(null)
  const inflightRef = useRef<Promise<PlanCurrencyStat[]> | null>(null)

  const selectedCurrencyRef = useMemo(() => {
    const token = selectedFilters.find(f => f.startsWith('currency:'))
    return token ? token.substring('currency:'.length) : undefined
  }, [selectedFilters])

  useEffect(() => {
    selectedFiltersRef.current = selectedFilters
  }, [selectedFilters])

  const preselectMostUsedOnce = useCallback(
    (stats: PlanCurrencyStat[]) => {
      if (!setFilters || hasPreselectedCurrencyRef.current || stats.length === 0) return
      const anyCurrencySelected = selectedFiltersRef.current.some(f => f.startsWith('currency:'))
      if (anyCurrencySelected) return
      // Compute most-used by currency CODE across versions (v1/v2), ignoring fallback/default
      const codeCounts = new Map<string, number>()
      stats.forEach(s => {
        const code = (s.code || '').toUpperCase()
        if (!code) return
        // Count even if ref is fallback, but selection later will require a real ref
        codeCounts.set(code, (codeCounts.get(code) || 0) + (s.count || 0))
      })
      if (codeCounts.size === 0) return
      // Pick code with highest total count
      let topCode: string | null = null
      let topCount = -1
      for (const [code, count] of codeCounts.entries()) {
        if (count > topCount) {
          topCode = code
          topCount = count
        }
      }
      if (!topCode) return
      // From the original stats, pick the ref with this code that is not fallback and with highest count
      let candidate: PlanCurrencyStat | null = null
      for (const s of stats) {
        if ((s.code || '').toUpperCase() === topCode && s.ref && s.ref !== DEFAULT_CURRENCY_REF) {
          if (!candidate || (s.count || 0) > (candidate.count || 0)) {
            candidate = s
          }
        }
      }
      // If no concrete ref exists for the top code, synthesize a v1-style ref so the
      // table filter can still match by code via the OR logic
      const refToUse = candidate ? candidate.ref : `Currency:v1:${topCode}`
      const nonCurrencyFilters = selectedFiltersRef.current.filter(f => !f.startsWith('currency:'))
      setFilters([...nonCurrencyFilters, `currency:${refToUse}`])
      hasPreselectedCurrencyRef.current = true
    },
    [setFilters]
  )

  useEffect(() => {
    const employeeId = context?.userInfo?.employeeDetails?.employeeId
    const accessToken = context?.accessToken
    if (!employeeId || !accessToken) {
      return
    }

    const fetchKey = `${employeeId}`
    // Avoid refetching currencies on every filter change; only refetch when employee changes.
    // Also dedupe React StrictMode double-invocation by reusing the in-flight promise.
    if (lastFetchKeyRef.current === fetchKey) {
      if (initialized) return
      if (inflightRef.current) {
        inflightRef.current.finally(() => setInitialized(true))
        return
      }
    }

    lastFetchKeyRef.current = fetchKey

    const fetchCurrencies = async () => {
      try {
        const p = fetchEmployeeCurrencyStats({
          accessToken,
          query: GET_USED_PLAN_CURRENCIES_BY_EMPLOYEE,
          variables: { employeeId, limit: 2000 },
          dataPath: ['ExpensePlan'],
          mapRow: (r: any) => ({
            currencyRef: r.currencyRef || r.expenseRequest?.[0]?.currencyRef || DEFAULT_CURRENCY_REF,
            currency: { code: r.currency?.code || r.expenseRequest?.[0]?.currency?.code || 'EUR' }
          })
        }).then(res => res as PlanCurrencyStat[])

        inflightRef.current = p
        const stats = await p
        setCurrencyStats(stats)
        preselectMostUsedOnce(stats)
      } catch {
        // ignore
      } finally {
        inflightRef.current = null
        setInitialized(true)
      }
    }

    fetchCurrencies()
  }, [context?.userInfo?.employeeDetails?.employeeId, context?.accessToken, preselectMostUsedOnce, initialized])

  return {
    currencyStats,
    selectedCurrencyRef,
    initialized
  }
}
