import { useMemo } from 'react'
import { useGraphqlClient } from '../graphql/useGraphQLClient'
import { showToast } from '@/business-apps/fin/expenses/utils/notificationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export const employeeExpenseDataQuery = `
  query fetchEmployee($employeeId: uuid, $activeUserLocale: String) {
    expenseRequestType: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "ExpenseRequestType"}}, isDeleted: {_eq: false}}, limit: 20) {
      id
      value
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        localeCode
        value
      }
      catalog {
        defaultLocale
      }
      code
      additionalValue1
    }
    expenseTransportationMeans: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "ExpenseTransportMean"}}, isDeleted: {_eq: false}}, limit: 20) {
      id
      value
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        localeCode
        value
      }
      catalog {
        defaultLocale
      }
      code
      additionalValue1
    }
    ExpensePlan(where: {employeeId: {_eq: $employeeId}, status: {_eq: "APPROVED"}, isDeleted: {_eq: false}}, orderBy: {createdAt: DESC}, limit: 20) {
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
    EmployeePosition(where: {employeeId: {_eq: $employeeId}}) {
      structureId
      costCenterId
    }
  }
`

export const useEmployeeExpenseData = (accessToken: string, employeeId: string, activeUserLocale: string) => {
  const graphQLClient = useGraphqlClient(accessToken)

  const fetchEmployeeData = useMemo(
    () => async () => {
      try {
        const data = await graphQLClient.request(employeeExpenseDataQuery, { employeeId, activeUserLocale })

        return data
      } catch (error) {
        showToast(
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:create_expense_type_item.process_error_data_fetch',
            'Error fetching data'
          ),
          'error'
        )
        throw error
      }
    },
    [graphQLClient, employeeId, activeUserLocale, accessToken]
  )

  return fetchEmployeeData
}
