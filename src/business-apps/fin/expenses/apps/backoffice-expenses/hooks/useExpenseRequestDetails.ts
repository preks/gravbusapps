/**
 * Hook for fetching detailed expense request data
 */

import { useState, useEffect } from 'react'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'

// Types for expense request details
export interface ExpenseRequestTrip {
  id: string
  description: string
  tripDateTime: string
  tripDirection: string
  address: string
  country?: {
    name: string
    code: string
  }
}

export interface ExpenseItem {
  id: string
  description: string
  category: string
  totalAmount: number
  itemType: string
  currency?: {
    code: string
  }
}

export interface ExpenseAllowance {
  id: string
  dayRate: number
  description: string
  currency?: {
    code: string
  }
}

export interface ApprovalMetadata {
  comment: string
  date: string
  author: string
  position: string
}

export interface ExpenseRequestDetails {
  id: string
  code: string
  title: string
  description: string
  status: string
  totalAmount: number
  currency: string
  employee: {
    firstName: string
    lastName: string
    businessKey: string
    email: string
  }
  costCenter: {
    name: string
    code: string
  }
  createdAt: string
  updatedAt: string
  trips: ExpenseRequestTrip[]
  expenseItems: ExpenseItem[]
  approvalMetadata: ApprovalMetadata[]
}

export const useExpenseRequestDetails = ({
  requestId,
  accessToken
}: {
  requestId: string | null
  accessToken?: string
}) => {
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)
  const [data, setData] = useState<ExpenseRequestDetails | null>(null)
  // CRITICAL: Do NOT pass empty string - it sets empty token on singleton client!
  const client = useGraphqlClient(accessToken)

  useEffect(() => {
    if (!requestId) {
      setData(null)
      return
    }

    const fetchExpenseRequestDetails = async () => {
      if (!accessToken) {
        setError(new Error('Access token is required for expense request details'))
        setLoading(false)
        return
      }

      if (!client) {
        setError(new Error('Failed to initialize GraphQL client'))
        setLoading(false)
        return
      }

      setLoading(true)
      setError(null)

      try {
        const query = `
          query GetExpenseRequestDetails($id: uuid!) {
            ExpenseRequest(where: {id: {_eq: $id}}, limit: 1) {
              id
              code
              title
              description
              status
              totalAmount
              createdAt
              updatedAt
              currency {
                code
              }
              employee {
                firstName
                lastName
                businessKey
              }
              businessKey
              costCenter {
                name
                code
              }
            }
          }
        `

        const result = await client.request<any>(query, { id: requestId })

        if (!result?.ExpenseRequest) {
          throw new Error('Invalid API response for expense request details')
        }

        const expenseRequests = result.ExpenseRequest

        if (expenseRequests.length === 0) {
          throw new Error('Expense request not found')
        }

        const expenseRequest = expenseRequests[0]

        const formattedTrips: ExpenseRequestTrip[] = []
        const formattedExpenseItems: ExpenseItem[] = []
        const formattedApprovalMetadata: ApprovalMetadata[] = []

        const formattedData: ExpenseRequestDetails = {
          id: expenseRequest.id,
          code: expenseRequest.code ?? 'N/A',
          title: expenseRequest.title ?? 'N/A',
          description: expenseRequest.description ?? 'No description',
          status: expenseRequest.status ?? 'N/A',
          totalAmount: expenseRequest.totalAmount ?? 0,
          currency: expenseRequest.currency?.code ?? 'N/A',
          employee: {
            firstName: expenseRequest.employee?.firstName ?? 'N/A',
            lastName: expenseRequest.employee?.lastName ?? 'N/A',
            businessKey: expenseRequest.employee?.businessKey ?? 'N/A',
            email: 'N/A' // Email field not available in Employee type
          },
          costCenter: expenseRequest.costCenter
            ? {
                name: expenseRequest.costCenter.name ?? 'N/A',
                code: expenseRequest.costCenter.code ?? 'N/A'
              }
            : { name: 'N/A', code: 'N/A' },
          createdAt: expenseRequest.createdAt ? new Date(expenseRequest.createdAt).toLocaleString() : 'N/A',
          updatedAt: expenseRequest.updatedAt ? new Date(expenseRequest.updatedAt).toLocaleString() : 'N/A',
          trips: formattedTrips,
          expenseItems: formattedExpenseItems,
          approvalMetadata: formattedApprovalMetadata
        }

        setData(formattedData)
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch expense request details'))
        setData(null)
      } finally {
        setLoading(false)
      }
    }

    fetchExpenseRequestDetails()
  }, [requestId, client, accessToken])

  return { loading, error, data }
}

export default useExpenseRequestDetails
