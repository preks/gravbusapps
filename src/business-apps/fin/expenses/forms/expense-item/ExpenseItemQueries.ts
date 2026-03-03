import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useFlowClient } from '@/common/network/flows/useFlowClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { showToast } from '../../utils/notificationUtils'
import { formatDateWithTimezone } from './utils/dateUtils'

/**
 * Hook for fetching employee rule data
 * @param contextProps - Business app context props
 * @returns Function to fetch employee rule data
 */
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

/**
 * Legacy function for fetching employee rule data
 * @deprecated Use useEmployeeRuleQuery hook instead
 */
export const fetchEmployeeRule = async (employeeId: string, date: string, accessToken: string) => {
  try {
    // Import flowClient directly for non-hook usage
    const { flowClient } = await import('@/common/network/flows/FlowClient')

    // Set access token
    flowClient.setAccessToken(accessToken)

    // Format date as required by the API
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

export const fetchExpenseData = `query MyQuery($expenseId:uuid! ,$activeUserLocale: String) {
   ExpenseItemByPk(id: $expenseId) {
    id
    version
    source
    expenseDate
    totalAmount
    status
    reimbursable
     expenseRuleId
    itemOrder
    expenseRuleGeneralExpenseId
      expenseRuleMileageId
    employeeId
    costCenter {
      id
      name
    }
  
    currency {
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
    }
    expenseClass {
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
    }
    expenseGroup {
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
    }
    expenseItemFile(where: {isDeleted: {_eq: false}}) {
      expenseItemId
      fileType
      fileUrl
      id
      version
      fileName
    }
    expensePosition(where: {isDeleted: {_eq: false}}) {
      expenseGroup {
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
      }
      expenseRuleGeneralExpenseId
      expenseRuleMileageId
      id
      expenseItemId
      positionOrder
      totalAmount
      version
      reimbursable
      costCenter {
        id
      }
      additionalProperties
    }
    expenseRequest {
      id
      title
      status
    }
    title
    autoCalculated
    expenseRuleGeneralExpenseId
    additionalProperties
    multiplePositions
}
}`
export const fetchExpenseRuleGeneralData = `query fetchExpenseRuleGeneralData ($objectFilter: jsonb!,$activeUserLocale:String!,$expenseRuleId: uuid) {
ExpenseRuleGeneralExpense(
    where: {
      expenseRuleId: { _eq: $expenseRuleId }, 
      isDeleted: { _eq: false }, 
      expenseGroup: { objectValue: { _contains: $objectFilter } }
    }
  ) {
    expenseGroupRef
    expenseGroup{
      id
      code
     value
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog {
      defaultLocale
    }
    }
      id
      code
      name
      
  }

}`

export const fetchExpenseCatalogueData = `query fetchExpenseCatalogueData ($employeeId: uuid,$objectFilter: jsonb!,$activeUserLocale:String!,$expenseRuleId: uuid) {
  EmployeePosition(where: {employeeId: {_eq: $employeeId}}) {
    structureId
    costCenterId
  }
  ExpenseRequest(where: { currencyRef: { _isNull: true } ,isDeleted: {_eq: false}, employeeId: {_eq: $employeeId}, status: {_in: ["CREATED", "REJECTED"]}}) {
    id
    status
    title
    createdAt
    currencyRef
  }
  expenseGroup: CatalogEntry(where: {catalog: {version: { _eq: "v1" }identifier: { _eq: "ExpenseGroup" }}objectValue: { _contains: $objectFilter }}, orderBy: {additionalValue2: ASC}) {
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
  }
  currency: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "Currency"}}}) {
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
  }
  expenceClass: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "ExpenseClass"}}}) {
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
  }
  ExpenseRuleGeneralExpense(
    where: {
      expenseRuleId: { _eq: $expenseRuleId }, 
      isDeleted: { _eq: false }, 
      expenseGroup: { objectValue: { _contains: $objectFilter } }
    }
  ) {
    expenseGroupRef
    expenseGroup{
      id
      code
     value
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog {
      defaultLocale
    }
    }
      id
      code
      name
      
  }

}`
export const getNewTypes = `query MyQuery($expenseRuleId: uuid, $objectFilter: jsonb, $expenseGroupId: [String!]) {
  ExpenseRuleGeneralExpense(where: {expenseRuleId: {_eq: $expenseRuleId}, expenseGroupRef: {_in: $expenseGroupId}, isDeleted: {_eq: false}, expenseGroup: {objectValue: {_contains: $objectFilter}}}) {
    id
    code
    name
    reimbursable
    additionalProperties
    activeFrom
    activeTo
    expenseGroupRef
  }
}
`
export const getCustomFields = `query MyQuery($expenseRuleGeneralId: [uuid!]) {
  ExpenseRuleOtherInfo(where: {expenseRuleGeneralExpenseId: {_in: $expenseRuleGeneralId}, isDeleted: {_eq: false}}) {
    id
    infoValue
    mandatory
    source
    expenseRuleGeneralExpenseId
     expenseRuleGeneralExpense {
      expenseGroupRef
    }
  }
}
`
export const expenseRequestByCurrencyQuery = `query fetchCurrency ($employeeId: uuid, $givenCurrency: String) {
  ExpenseRequest(
    where: {
      isDeleted: { _eq: false }
      employeeId: { _eq: $employeeId }
      status: { _in: ["CREATED", "REJECTED"] }
      _or: [
        { currencyRef: { _isNull: true } }
        { currencyRef: { _eq: $givenCurrency } }
      ]
    }
  ) {
    id
    status
    title
    createdAt
    currencyRef
  }
}`
export const getStructureCostCenter = `query MyQuery($structureId: uuid!) {
  userCostCenters: CostCenter(where: {structureId: {_eq: $structureId}, isDeleted: {_eq: false}}) {
    id
    name
    structureId
  }
}
`
export const GET_EXPENSE_CLASSES = `
  query GetExpenseClasses {
    ExpenseClass(where: {isDeleted: {_eq: false}}) {
      id
      name
      code
    }
  }
`

export const GET_EXPENSE_TYPES = `
  query GetExpenseTypes($classId: uuid!) {
    ExpenseType(where: {classId: {_eq: $classId}, isDeleted: {_eq: false}}) {
      id
      name
      code
      classId
    }
  }
`

export const GET_COST_CENTERS = `
  query GetCostCenters {
    CostCenter(where: {isDeleted: {_eq: false}}) {
      id
      name
      code
    }
  }
`

export const GET_CURRENCIES = `
  query GetCurrencies {
    Currency {
      id
      code
      name
    }
  }
`

export const UPLOAD_FILE = `
  mutation UploadFile($file: Upload!) {
    uploadFile(file: $file) {
      url
      fileName
    }
  }
`

export const GET_EXPENSE_REQUESTS = `
  query GetExpenseRequests($employeeId: uuid!) {
    ExpenseRequest(where: {employeeId: {_eq: $employeeId}, isDeleted: {_eq: false}, status: {_nin: ["REJECTED", "CANCELLED"]}}) {
      id
      code
      title
      status
    }
  }
`
