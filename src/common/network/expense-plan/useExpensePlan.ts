import { useMemo } from 'react'
import { useGraphqlClient } from '../graphql/useGraphQLClient'

// Query for approved expense plans
export const approvedExpensePlansQuery = `
  query fetchExpensePlans($employeeId: uuid, $activeUserLocale: String) {
    ExpensePlan(
      where: {employeeId: {_eq: $employeeId}, status: {_eq: "APPROVED"}, isDeleted: {_eq: false}},
      orderBy: {createdAt: DESC},
      limit: 20
    ) {
      id
      createdAt
      startDate
      endDate
      title
      projectId
      requestTypeRef
      advancePaymentTotalAmount
      title
      status
      costCenter {
        id
        name
      }
      employeeId
      totalAmount
      currency {
        code
        id
        value
        translations(where: {localeCode: {_eq: $activeUserLocale}}) {
          localeCode
          value
        }
        catalog {
          defaultLocale
        }
      }
      description
      planDate
      additionalProperties
      advancePayment(where: {isDeleted: {_eq: false}}) {
        amount
        code
        currency {
          id
          alternativeCode
          value
          translations(where: {localeCode: {_eq: $activeUserLocale}}) {
            localeCode
            value
          }
          catalog {
            defaultLocale
          }
          code
        }
        costCenter {
          code
          name
        }
        paymentMethod
      }
    }
  }
`

export const useApprovedExpensePlans = (accessToken: string, employeeId: string, activeUserLocale: string) => {
  const graphQLClient = useGraphqlClient(accessToken)

  const fetchExpensePlans = useMemo(
    () => async () => {
      try {
        const data = await graphQLClient.request(approvedExpensePlansQuery, { employeeId, activeUserLocale })

        return data
      } catch (error) {
        console.error('Error fetching expense plans:', error)
        throw error
      }
    },
    [graphQLClient, employeeId, activeUserLocale, accessToken]
  )

  return fetchExpensePlans
}
