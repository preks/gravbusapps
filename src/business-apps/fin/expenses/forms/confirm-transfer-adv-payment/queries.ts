import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { AdvancePaymentData } from './types'

export const GET_ADVANCE_PAYMENT_FOR_APPROVAL = `
  query GetAdvancePaymentForApproval($paymentId: uuid!) {
    AdvancePaymentByPk(id: $paymentId) {
      expensePlanId
      status
      version
      transactionDate
      transactionNumber
      transactionConfirmedByEmployee {
        id
        firstName
        lastName
      }
      expensePlan {
        planDate
        decisionDate
        employeeDocument {
          id
          file
          mimeType
        }
        employee {
          id
          userId
          firstName
          lastName
          pictureThumbnail
          employeePosition {
            supervisor {
              pictureThumbnail
              firstName
              lastName
              userId
              employeePosition {
                jobPosition {
                  name
                }
                organizationalUnit {
                  name
                }
              }
            }
            jobPosition {
              name
            }
            organizationalUnit {
              name
            }
          }
        }
        code
        requestType {
          code
          value
        }
        currency {
          value
          code
        }
        totalAmount
        title
      }
      amount
      currency {
        value
        id
        code
      }
      paymentMethod
      costCenter {
        code
        name
      }
    }
  }
`

export const useGetAdvancePaymentForApproval = (accessToken: string) => {
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchAdvancePaymentData = async (paymentId: string) => {
    if (!accessToken?.trim()) {
      throw new Error('GraphQL request requires a valid access token')
    }

    const query = GET_ADVANCE_PAYMENT_FOR_APPROVAL
    try {
      const result = await graphqlClient.request<{
        AdvancePaymentByPk: AdvancePaymentData
      }>(query, { paymentId })
      return result.AdvancePaymentByPk
    } catch (error: any) {
      // Handle rate limiting specifically
      if (error?.response?.status === 429 || error?.message?.includes('429')) {
        throw new Error('429: API rate limit exceeded. Please wait a moment and try again.')
      }

      // Handle other GraphQL errors
      if (error?.response?.errors) {
        const errorMessage = error.response.errors.map((e: any) => e.message).join(', ')
        throw new Error(`GraphQL Error: ${errorMessage}`)
      }

      // Handle network errors
      if (error?.message) {
        throw new Error(error.message)
      }

      throw new Error('Unknown error occurred while fetching payment data')
    }
  }

  return { fetchAdvancePaymentData }
}
