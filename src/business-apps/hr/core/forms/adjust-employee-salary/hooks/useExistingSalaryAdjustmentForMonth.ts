import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { EXISTING_SALARY_ADJUSTMENT_FOR_MONTH_QUERY } from '../AdjustEmployeeSalaryQueries'

interface ExistingSalaryAdjustmentForMonthResponse {
  EmployeeSalary: Array<{ id: string; startDate: string | null }>
}

function getMonthStartEnd(effectiveDate: string): { monthStart: string; monthEnd: string } | null {
  if (!effectiveDate || typeof effectiveDate !== 'string') return null
  const trimmed = effectiveDate.trim()
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})/)
  if (!isoMatch) return null

  const [, year, month] = isoMatch
  const lastDay = new Date(Number(year), Number(month), 0).getDate()
  return {
    monthStart: `${year}-${month}-01`,
    monthEnd: `${year}-${month}-${String(lastDay).padStart(2, '0')}`
  }
}

export function useExistingSalaryAdjustmentForMonth(
  accessToken: string | undefined,
  employeeId: string,
  effectiveDate: string
): { hasDuplicate: boolean; isLoading: boolean; existingStartDate: string | null } {
  const graphqlClient = useGraphQLClient(accessToken)
  const [hasDuplicate, setHasDuplicate] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [existingStartDate, setExistingStartDate] = useState<string | null>(null)

  const monthBounds = useMemo(() => getMonthStartEnd(effectiveDate), [effectiveDate])
  const shouldRun = !!employeeId && !!accessToken && !!monthBounds
  const queryKey = shouldRun ? `${employeeId}:${monthBounds?.monthStart ?? ''}:${monthBounds?.monthEnd ?? ''}` : ''
  const lastQueryKeyRef = useRef<string>('')

  const fetchDuplicateCheck = useCallback(async () => {
    if (!shouldRun || !monthBounds) {
      setHasDuplicate(false)
      setExistingStartDate(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setHasDuplicate(false)
    setExistingStartDate(null)
    try {
      const result = await graphqlClient.request<ExistingSalaryAdjustmentForMonthResponse>(
        EXISTING_SALARY_ADJUSTMENT_FOR_MONTH_QUERY,
        {
          idEmployee: employeeId,
          monthStart: monthBounds.monthStart,
          monthEnd: monthBounds.monthEnd
        }
      )
      const firstMatch = result?.EmployeeSalary?.[0]
      setHasDuplicate(!!firstMatch)
      setExistingStartDate(firstMatch?.startDate || null)
    } catch {
      setHasDuplicate(false)
      setExistingStartDate(null)
    } finally {
      setIsLoading(false)
    }
  }, [shouldRun, monthBounds?.monthStart, monthBounds?.monthEnd, employeeId, graphqlClient])

  useEffect(() => {
    if (!shouldRun) {
      lastQueryKeyRef.current = ''
      setHasDuplicate(false)
      setExistingStartDate(null)
      setIsLoading(false)
      return
    }
    if (lastQueryKeyRef.current === queryKey) {
      return
    }
    lastQueryKeyRef.current = queryKey
    void fetchDuplicateCheck()
  }, [shouldRun, queryKey, fetchDuplicateCheck])

  return { hasDuplicate, isLoading, existingStartDate }
}
