import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { AdvancePaymentData } from './types'

export const GET_ADVANCE_PAYMENT_FOR_APPROVAL = `
  query GetAdvancePaymentForApproval($paymentId: uuid!, $activeUserLocale: String!) {
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
        authorEmployee
        advancePayment
      }
    }
  }
`

export const useGetAdvancePaymentForApproval = (accessToken: string) => {
  const graphqlClient = useGraphQLClient(accessToken)
  const activeUserLocale = getCurrentActiveUserLocale()

  const fetchAdvancePaymentData = async (paymentId: string): Promise<AdvancePaymentData | null> => {
    try {
      const result = await graphqlClient.request<{
        AdvancePaymentByPk: AdvancePaymentData
      }>(GET_ADVANCE_PAYMENT_FOR_APPROVAL, {
        paymentId,
        activeUserLocale
      })
      return result.AdvancePaymentByPk
    } catch (error) {
      console.error('Error fetching advance payment data:', error)
      throw error
    }
  }

  return { fetchAdvancePaymentData }
}
