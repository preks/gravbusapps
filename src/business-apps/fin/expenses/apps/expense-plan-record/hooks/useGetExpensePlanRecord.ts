import { useState, useCallback, useEffect } from 'react'
import { BusinessAppContextProps } from '@/business-apps/types'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { ExpensePlanRecord } from '../types/expensePlanRecord.types'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { getExpensePlanRecordQuery } from '../queries/getExpensePlanRecord.ts'

interface UseGetExpensePlanRecordProps extends Pick<BusinessAppContextProps, 'accessToken'> {
  expensePlanId?: string
}

interface UseGetExpensePlanRecordResult {
  expensePlan: ExpensePlanRecord | null
  loading: boolean
  error: string | null
  fetchExpensePlan: (id: string) => Promise<void>
}

export const useGetExpensePlanRecord = ({
  accessToken,
  expensePlanId
}: UseGetExpensePlanRecordProps): UseGetExpensePlanRecordResult => {
  const finalExpensePlanId = expensePlanId?.trim() ?? ''
  const [expensePlan, setExpensePlan] = useState<ExpensePlanRecord | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphqlClient(accessToken)

  const fetchExpensePlan = useCallback(
    async (id: string) => {
      if (!accessToken) {
        setError('No access token provided')
        return
      }

      try {
        setLoading(true)
        setError(null)

        const activeUserLocale = getCurrentActiveUserLocale()
        const data = await graphqlClient.request(getExpensePlanRecordQuery, {
          expensePlanId: id,
          activeUserLocale
        })

        if (!data?.expensePlan) {
          throw new Error('No expense plan data found')
        }

        setExpensePlan(data.expensePlan as ExpensePlanRecord)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch expense plan')
      } finally {
        setLoading(false)
      }
    },
    [accessToken, graphqlClient]
  )

  useEffect(() => {
    if (!finalExpensePlanId) {
      setError('No expense plan ID provided')
      setLoading(false)
      return
    }
    fetchExpensePlan(finalExpensePlanId)
  }, [finalExpensePlanId, fetchExpensePlan])

  return {
    expensePlan,
    loading,
    error,
    fetchExpensePlan
  }
}

export default useGetExpensePlanRecord
