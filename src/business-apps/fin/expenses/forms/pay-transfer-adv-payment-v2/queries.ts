import React from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { AdvancePaymentData } from './types'

export const GET_ADVANCE_PAYMENT_FOR_TRANSFER = `
  query GetAdvancePaymentForTransfer($paymentId: uuid!) {
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
      transactionConfirmedByEmployee {
        id
        firstName
        lastName
      }
      paymentMethod
      expensePlan {
        id
        planDate
        decisionDate
        employeeDocument {
          id
          file
          mimeType
        }
        employee {
          id
          firstName
          lastName
          pictureThumbnail
          employeePosition {
            supervisor {
              pictureThumbnail
              firstName
              lastName
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

export const useGetAdvancePaymentForTransfer = (accessToken: string) => {
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchAdvancePaymentData = React.useCallback(
    async (paymentId: string): Promise<AdvancePaymentData | null> => {
      try {
        const result = await graphqlClient.request<{
          AdvancePaymentByPk: AdvancePaymentData
        }>(GET_ADVANCE_PAYMENT_FOR_TRANSFER, {
          paymentId
        })
        return result.AdvancePaymentByPk
      } catch (error) {
        console.error('Error fetching advance payment data:', error)
        throw error
      }
    },
    [graphqlClient]
  )

  return { fetchAdvancePaymentData }
}
