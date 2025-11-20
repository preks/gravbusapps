import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { GET_EXPENSE_REQUEST_FOR_APPROVAL } from '../queries/expenseRequestQueries'
import { ExpenseRequestApprovalData } from '../approve-expense-request/types/expenseRequestTypes'

interface UseExpenseRequestDataProps {
  expenseId: string | null
  accessToken: string
}

export const useExpenseRequestData = ({ expenseId, accessToken }: UseExpenseRequestDataProps) => {
  const [expenseRequest, setExpenseRequest] = useState<ExpenseRequestApprovalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)
  const activeUserLocale = getCurrentActiveUserLocale()

  const fetchExpenseRequest = async () => {
    if (!expenseId) {
      setError('No expense request ID provided. Please provide a valid request ID.')
      setLoading(false)
      return
    }

    if (!accessToken) {
      setError('No access token available. Please ensure you are authenticated.')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const result = await graphqlClient.request(GET_EXPENSE_REQUEST_FOR_APPROVAL, {
        expenseId,
        activeUserLocale
      })

      if (!result?.ExpenseRequestByPk) {
        setError(`No expense request found with ID: ${expenseId}`)
        setLoading(false)
        return
      }

      setExpenseRequest(result.ExpenseRequestByPk)
    } catch (err) {
      console.error('Error fetching expense request:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch expense request data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExpenseRequest()
  }, [expenseId, accessToken])

  return {
    expenseRequest,
    loading,
    error,
    refetch: fetchExpenseRequest
  }
}
