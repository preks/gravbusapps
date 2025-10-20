import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { showToast } from '@/business-apps/fin/expenses/utils/notificationUtils'
import { formatDateWithTimezone } from './utils/dateUtils'
import useFlowClient from '@/common/network/flows/useFlowClient'

/**
 * GraphQL query for fetching expense catalogue data
 */
export const fetchExpenseCatalogueDataQuery = `
  query fetchExpenseCatalogueData($employeeId: uuid, $activeUserLocale: String) {
    expenseRequestType: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "ExpenseRequestType"}}}) {
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
    expenseTransportationMeans: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "ExpenseTransportMean"}}}) {
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
    ExpensePlan(where: {employeeId: {_eq: $employeeId}, status: {_eq: "APPROVED"}, isDeleted: {_eq: false}}, orderBy: {createdAt: DESC}) {
      id
      createdAt
      startDate
      endDate
      title
      projectId
      requestTypeRef
      advancePaymentTotalAmount
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

/**
 * GraphQL query for fetching structure cost centers and projects
 */
export const getStructureCostCenterQuery = `
  query getStructureCostCenter($structureId: uuid!) {
    userCostCenters: CostCenter(where: {structureId: {_eq: $structureId}, isDeleted: {_eq: false}}) {
      id
      name
      structureId
    }
    Project(where: {structureId: {_eq: $structureId}, isDeleted: {_eq: false}}) {
      id
      name
      structureId
      validTo
    }
  }
`

export const useEmployeeRuleQuery = (contextProps: Pick<BusinessAppContextProps, 'accessToken'>) => {
  const flowClient = useFlowClient(contextProps)

  /**
   * Fetch employee rule data
   * @param employeeId Employee ID
   * @param date Date in ISO format
   * @returns Promise with employee rule data or null if error
   */
  const fetchEmployeeRule = async (employeeId: string, date: string) => {
    try {
      const formattedDate = formatDateWithTimezone(date)
      const path = `employee-expense/getEmployeeRule/${employeeId}/${formattedDate}`

      return await flowClient.getResource(path)
    } catch {
      showToast(
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:create_expense_type_item.process_error_data_fetch',
          'Error fetching data'
        ),
        'error'
      )
      return null
    }
  }

  return { fetchEmployeeRule }
}
