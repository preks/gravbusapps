import { useState, useCallback, useEffect } from 'react'
import { BusinessAppContextProps } from '@/business-apps/types'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { ExpenseRequestRecord } from '../types/expenseRequestRecord.types'
import { getExpenseRequestRecordQuery } from '../queries/getExpenseRequestRecord.ts'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

interface UseGetExpenseRequestRecordProps extends Pick<BusinessAppContextProps, 'accessToken'> {
  expenseRequestId?: string
}

interface UseGetExpenseRequestRecordResult {
  expenseRequest: ExpenseRequestRecord | null
  loading: boolean
  error: string | null
  fetchExpenseRequest: (id: string) => Promise<void>
}

export const useGetExpenseRequestRecord = ({
  accessToken,
  expenseRequestId
}: UseGetExpenseRequestRecordProps): UseGetExpenseRequestRecordResult => {
  const finalExpenseRequestId = expenseRequestId?.trim() ?? ''
  const [expenseRequest, setExpenseRequest] = useState<ExpenseRequestRecord | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphqlClient(accessToken)

  const fetchExpenseRequest = useCallback(
    async (id: string) => {
      if (!accessToken) {
        setError('No access token provided')
        return
      }

      try {
        setLoading(true)
        setError(null)

        const activeUserLocale = getCurrentActiveUserLocale()
        const data = await graphqlClient.request(getExpenseRequestRecordQuery, {
          expenseRequestId: id,
          activeUserLocale
        })

        if (!data?.expenseRequest) {
          throw new Error('No expense request data found')
        }

        setExpenseRequest(data.expenseRequest as ExpenseRequestRecord)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch expense request')
      } finally {
        setLoading(false)
      }
    },
    [accessToken, graphqlClient]
  )

  useEffect(() => {
    if (!finalExpenseRequestId) {
      setError('No expense request ID provided')
      setLoading(false)
      return
    }
    fetchExpenseRequest(finalExpenseRequestId)
  }, [finalExpenseRequestId, fetchExpenseRequest])

  return {
    expenseRequest,
    loading,
    error,
    fetchExpenseRequest
  }
}

export default useGetExpenseRequestRecord
