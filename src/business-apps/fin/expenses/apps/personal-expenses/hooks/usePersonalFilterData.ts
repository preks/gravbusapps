import { useCallback, useEffect, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_PERSONAL_EXPENSE_CURRENCIES } from '../queries/filterData.queries'

export interface PersonalCurrency {
  code: string
  value: string
  currencyRef: string
}

interface UsePersonalFilterDataResult {
  currencies: PersonalCurrency[]
  mostUsedCurrency: string | null
  loading: boolean
  error: Error | null
}

export const usePersonalFilterData = ({
  accessToken,
  userInfo
}: BusinessAppContextProps): UsePersonalFilterDataResult => {
  const [currencies, setCurrencies] = useState<PersonalCurrency[]>([])
  const [mostUsedCurrency, setMostUsedCurrency] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const client = useGraphqlClient(accessToken || '')
  const employeeId = userInfo?.employeeDetails?.employeeId

  const fetchData = useCallback(async () => {
    if (!accessToken || !client || !employeeId) {
      setError(new Error('Missing access token or employee id'))
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await client.request(GET_PERSONAL_EXPENSE_CURRENCIES, { employeeId })
      const map = new Map<string, PersonalCurrency>()
      const counts = new Map<string, number>()
      res?.ExpenseRequest?.forEach((row: any) => {
        if (row.currencyRef) {
          const code = row.currency?.code || String(row.currencyRef).split(':').pop()
          map.set(row.currencyRef, { code, value: row.currency?.value || code, currencyRef: row.currencyRef })
          counts.set(row.currencyRef, (counts.get(row.currencyRef) || 0) + 1)
        }
      })
      const list = Array.from(map.values()).sort((a, b) => a.code.localeCompare(b.code))
      setCurrencies(list)
      let maxRef: string | null = null
      let max = 0
      counts.forEach((cnt, ref) => {
        if (cnt > max) {
          max = cnt
          maxRef = ref
        }
      })
      setMostUsedCurrency(maxRef || (list[0]?.currencyRef ?? null))
    } catch (err) {
      setError(err as Error)
    } finally {
      setLoading(false)
    }
  }, [accessToken, client, employeeId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return { currencies, mostUsedCurrency, loading, error }
}

export default usePersonalFilterData
