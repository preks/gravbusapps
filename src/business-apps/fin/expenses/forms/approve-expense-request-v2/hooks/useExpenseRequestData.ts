import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { GET_EXPENSE_REQUEST_FOR_APPROVAL } from '../queries/expenseRequestQueries'
import { ExpenseRequestApprovalData } from '../types/expenseRequestV2Types'

interface UseExpenseRequestDataProps {
  expenseId: string | null
  accessToken: string
  payloadData?: any // Expense request data from task payload (used for ID extraction only)
}

export const useExpenseRequestData = ({ expenseId, accessToken, payloadData }: UseExpenseRequestDataProps) => {
  const [expenseRequest, setExpenseRequest] = useState<ExpenseRequestApprovalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)
  const activeUserLocale = getCurrentActiveUserLocale()

  // Get the expense ID from either the prop or payload data
  const effectiveExpenseId = expenseId || payloadData?.id

  const fetchExpenseRequest = async () => {
    if (!effectiveExpenseId) {
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

      console.log('🔍 Fetching expense request from GraphQL API...')
      const result = await graphqlClient.request(GET_EXPENSE_REQUEST_FOR_APPROVAL, {
        expenseId: effectiveExpenseId,
        activeUserLocale
      })

      if (!result?.ExpenseRequestByPk) {
        setError(`No expense request found with ID: ${effectiveExpenseId}`)
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
  }, [effectiveExpenseId, accessToken])

  return {
    expenseRequest,
    loading,
    error,
    refetch: fetchExpenseRequest
  }
}
