import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { GET_EXPENSE_PLAN_FOR_APPROVAL } from '../queries/expensePlanQueries'
import { ExpensePlanApprovalData } from '../types/expensePlanV2Types'

interface UseExpensePlanDataProps {
  planId: string | null
  accessToken: string
}

export const useExpensePlanData = ({ planId, accessToken }: UseExpensePlanDataProps) => {
  const [expensePlan, setExpensePlan] = useState<ExpensePlanApprovalData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)
  const activeUserLocale = getCurrentActiveUserLocale()

  const fetchExpensePlan = async () => {
    if (!planId) {
      setError('No expense plan ID provided. Please provide a valid plan ID.')
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

      const result = await graphqlClient.request(GET_EXPENSE_PLAN_FOR_APPROVAL, {
        expenseId: planId,
        activeUserLocale
      })

      if (!result?.ExpensePlanByPk) {
        setError(`No expense plan found with ID: ${planId}`)
        setLoading(false)
        return
      }

      setExpensePlan(result.ExpensePlanByPk)
    } catch (err) {
      console.error('Error fetching expense plan:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch expense plan data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchExpensePlan()
  }, [planId, accessToken])

  return {
    expensePlan,
    loading,
    error,
    refetch: fetchExpensePlan
  }
}
