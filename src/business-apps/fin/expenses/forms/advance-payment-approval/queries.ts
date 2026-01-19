import { useCallback, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { AdvancePaymentData } from './types'

export const GET_ADVANCE_PAYMENT_FOR_APPROVAL = `
  query GetAdvancePaymentForApproval($paymentId: uuid!) {
    AdvancePaymentByPk(id: $paymentId) {
      id
      expensePlanId
      code
      amount
      description
      status
      decisionDate
      transactionDate
      transactionNumber
      transactionConfirmed
      paymentMethod
      expensePlan {
        id
        employee {
          id
          firstName
          lastName
          pictureThumbnail
          employeePosition {
            jobPosition {
              name
            }
          }
        }
        code
        title
        description
        requestType {
          code
          value
        }
        currency {
          code
        }
        totalAmount
      }
      currency {
        code
      }
      costCenter {
        code
        name
      }
      advancePaymentComment {
        id
        commentDate
        comment
        commentType
        authorEmployee {
          id
          firstName
          lastName
        }
        advancePayment {
          id
        }
      }
    }
  }
`

export const useGetAdvancePaymentForApproval = (accessToken: string) => {
  const graphqlClient = useGraphQLClient(accessToken)
  // Use ref to avoid endless loop - graphqlClient changes reference on every render
  const graphqlClientRef = useRef(graphqlClient)
  graphqlClientRef.current = graphqlClient

  const fetchAdvancePaymentData = useCallback(async (paymentId: string): Promise<AdvancePaymentData | null> => {
    try {
      const result = await graphqlClientRef.current.request<{
        AdvancePaymentByPk: AdvancePaymentData
      }>(GET_ADVANCE_PAYMENT_FOR_APPROVAL, {
        paymentId
      })
      return result.AdvancePaymentByPk
    } catch (error) {
      console.error('Error fetching advance payment data:', error)
      throw error
    }
  }, [])

  return { fetchAdvancePaymentData }
}
