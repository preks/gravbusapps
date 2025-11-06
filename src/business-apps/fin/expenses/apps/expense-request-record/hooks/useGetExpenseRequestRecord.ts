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
  const finalExpenseRequestId = expenseRequestId ?? 'bfe6323f-236b-4245-9759-5215a6a97209'
  const [expenseRequest, setExpenseRequest] = useState<ExpenseRequestRecord | null>(null)
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphqlClient(accessToken)

  const fetchExpenseRequest = useCallback(
    async (expenseRequestId: string) => {
      if (!accessToken) {
        setError('No access token provided')
        return
      }

      try {
        setLoading(true)
        setError(null)

        const activeUserLocale = getCurrentActiveUserLocale()
        const data = await graphqlClient.request(getExpenseRequestRecordQuery, { expenseRequestId, activeUserLocale })

        if (!data?.expenseRequest) {
          throw new Error('No expense request data found')
        }

        setExpenseRequest(data.expenseRequest as ExpenseRequestRecord)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch expense request')
        console.error('Error fetching expense request:', err)
      } finally {
        setLoading(false)
      }
    },
    [accessToken, graphqlClient]
  )

  // Fetch expense request if ID is provided
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
