import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useFlowClient } from '@/common/network/flows/useFlowClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { showToast } from '../../utils/notificationUtils'
import { formatDateWithTimezone } from '../expense-item/utils/dateUtils'

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
 * Function for fetching employee rule data
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

export const fetchExpenseAllowanceAndDeduction = `
query MyQuery($expenseId: uuid!, $expenseRuleId: uuid) {
ExpenseAllowance(where: {expenseRequestId: {_eq: $expenseId}, isDeleted: {_eq: false}}) {
    id
    version
    breakfast
    lunch
    dinner
    overnight
    allowanceDate
    travelRegionRef
    projectId
    expensePlanId
    costCenterId
    expenseRequestId
    allowanceRegionRuleDetailId
  }
  ExpenseRuleDeduction(where: {expenseRuleId: {_eq: $expenseRuleId}, isDeleted: {_eq: false}}) {
    id
    version
    deductionDay
    deductBreakfast
    deductLunch
    deductDinner
    overnightAllowance
    expenseRuleId
  }
    }
`
export const fetchExpenseRequestAndItems = `
query MyQuery($expenseId: uuid!, $activeUserLocale: String, $employeeId: uuid!) {
  ExpenseRequestByPk(id: $expenseId) {
    id
    version
    createdAt
    description
    expenseRuleId
    overnightAccommodation
    code
    processInstanceId
    additionalProperties
    project{
      id
      validTo
      name
    }
    costCenterId
    costCenter{
      name
      code
      id
    }
      expenseRequestComment (where: {isDeleted: {_eq: false}}){
      id
      authorEmployeeId
      authorEmployee {
        firstName
      lastName
      picture
      pictureThumbnail
      }
      commentDate
      commentType
      comment
      expenseRequestId
    }
    costCenter{
      name
    }
    employeeId
    expensePlanId
    expensePlan {
       id
     createdAt
     startDate
    endDate
    title
    requestTypeRef
    title
      expenseRuleId
      code
    status
      currency{
        code
        id
       value
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }

      }
    costCenter{
      id
      name
    }
      advancePaymentTotalAmount
    employeeId
    totalAmount
    deductibleAmount
    nonDeductibleAmount
    reimbursableAmount
    nonReimbursableAmount
    totalAmountAllowance
    totalAmountExpense
    totalAmountMileage
    totalRemainingAmount
    description
    planDate
     
     advancePayment(where: {isDeleted: {_eq: false}}) {
      amount
      code
      currency {
        alternativeCode
       value
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
        code
        id
      }
      costCenter {
        code
        name
      }
      paymentMethod
    }
      expenseRequestTrip(where: {isDeleted: {_eq: false}}) {
        id
        version
        tripDirection
        tripDateTime
        tripOrder
        pointType
        point
        expenseRequestId
        description
        address
        costCenterId
        travelRegionRef
        countryRef
        allowanceRegionRuleDetailId
      }
    }
    title
    totalAmount
    deductibleAmount
    nonDeductibleAmount
    reimbursableAmount
    nonReimbursableAmount
    totalAmountAllowance
    totalAmountExpense
    totalAmountMileage
    totalRemainingAmount
    status
    requestDate
    startDate
    endDate
    requestTypeRef
    currency {
      id
      code
      value
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    }
    expenseRequestTrip(where: {isDeleted: {_eq: false}}) {
      id
      version
      tripDirection
      tripDateTime
      tripOrder
      pointType
      point
      expenseRequestId
      description
      address
      costCenterId
      travelRegionRef
      countryRef
      allowanceRegionRuleDetailId
    }
  }
  ExpenseItem(where: {expenseRequestId: {_eq: $expenseId},isDeleted: {_eq: false}}) {
    id
    version
    code
    source
    expenseClassRef
    expenseGroupRef
    title
    expenseDate
    currencyRef
    totalAmount
    expenseRuleId
    expenseRule {
      code
      name
    }
    status
    reimbursable
    itemOrder
    employeeId
    autoCalculated
    multiplePositions
    costCenterId
    projectId
    expenseRequest {
      id
    }
    employee {
      id
    }
    expenseGroup {
      id
      code
      value
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }

    }
    currency {
      value
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
      code
      id
    }
    expensePosition(where: {isDeleted: {_eq: false}}) {
      expenseGroup {
        id
        value
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }

        code
      }
      expenseRuleGeneralExpenseId
      expenseRuleGeneralExpense {
        name
      }
      expenseRuleMileageId
      id
      positionOrder
      totalAmount
      version
      reimbursable
      costCenter {
        id
        name
      }
      additionalProperties
    }
    expenseItemFile(where: {isDeleted: {_eq: false}}) {
      createdAt
    }
}
     EmployeeAddress(where: {employeeId: {_eq: $employeeId}, isDeleted: {_eq: false}}) {
    type
    locality
    addressLine
  }
     TravelBreakdown(where: {expenseRequestId: {_eq: $expenseId}, isDeleted: {_eq: false}, employeeId: {_eq: $employeeId}}) {
    id
    version
    breakfast
    lunch
    dinner
    overnight
    expenseDate
    travelRegionRef
    projectId
    expenseRuleId
    expensePlanId
    costCenterId
    expenseRequestId
  }
    }`

export const fetchEmployeeExpenseItems = `query FetchEmployeeExpenseItems($employeeId: uuid!, $status: String, $activeUserLocale: String, $limit: Int, $offset: Int, $idsArray: [uuid!], $itemCurrency: String, $titleSearch: String, $expenseRuleId: uuid) {
  ExpenseItemEmployee: ExpenseItem(where: {employeeId: {_eq: $employeeId}, status: {_eq: $status}, isDeleted: {_eq: false}, id: {_nin: $idsArray}, currencyRef: {_eq: $itemCurrency}, title: {_ilike: $titleSearch}, expenseClassRef: {_nilike: "%allowance%"}, _or: [{expenseRuleId: {_eq: $expenseRuleId}}, {expenseRuleId: {_isNull: true}}]}, limit: $limit, offset: $offset) {
    id
    version
    code
    expenseClassRef
    expenseGroupRef
    expenseRuleId
    expenseRule {
      code
      name
    }
    source
    title
    expenseDate
    currencyRef
    totalAmount
    status
    reimbursable
    itemOrder
    employeeId
    autoCalculated
    multiplePositions
    costCenterId
    projectId
    expenseRequest {
      id
    }
    employee {
      id
    }
    expenseGroup {
      id
      code
      value
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        localeCode
        value
      }
    }
    currency {
      value
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        localeCode
        value
      }
      code
      id
    }
    expensePosition(where: {isDeleted: {_eq: false}}) {
      expenseGroup {
        id
        value
        translations(where: {localeCode: {_eq: $activeUserLocale}}) {
          localeCode
          value
        }
        code
      }
      expenseRuleGeneralExpenseId
      expenseRuleGeneralExpense {
        name
      }
      expenseRuleMileageId
      id
      positionOrder
      totalAmount
      version
      reimbursable
      costCenter {
        id
        name
      }
      additionalProperties
    }
    expenseItemFile(where: {isDeleted: {_eq: false}}) {
      createdAt
    }
  }
  ExpenseItemAggregate(where: {employeeId: {_eq: $employeeId}, status: {_eq: $status}, isDeleted: {_eq: false}, id: {_nin: $idsArray}, currencyRef: {_eq: $itemCurrency}, title: {_ilike: $titleSearch}, expenseClassRef: {_nilike: "%allowance%"}, _or: [{expenseRuleId: {_eq: $expenseRuleId}}, {expenseRuleId: {_isNull: true}}]}) {
    aggregate {
      count
    }
  }
}

`

export const fetchEmployeeExpenseItemsNoCurrency = `query FetchEmployeeExpenseItemsNoCurrency($employeeId: uuid!, $status: String, $activeUserLocale: String, $limit: Int, $offset: Int, $idsArray: [uuid!], $titleSearch: String, $expenseRuleId: uuid) {
  ExpenseItemEmployee: ExpenseItem(where: {employeeId: {_eq: $employeeId}, status: {_eq: $status}, isDeleted: {_eq: false}, id: {_nin: $idsArray}, title: {_ilike: $titleSearch}, expenseClassRef: {_nilike: "%allowance%"}, _or: [{expenseRuleId: {_eq: $expenseRuleId}}, {expenseRuleId: {_isNull: true}}]}, limit: $limit, offset: $offset) {
    id
    version
    code
    expenseClassRef
    expenseGroupRef
    expenseRuleId
    expenseRule {
      code
      name
    }
    source
    title
    expenseDate
    currencyRef
    totalAmount
    status
    reimbursable
    itemOrder
    employeeId
    autoCalculated
    multiplePositions
    costCenterId
    projectId
    expenseRequest {
      id
    }
    employee {
      id
    }
    expenseGroup {
      id
      code
      value
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        localeCode
        value
      }
    }
    currency {
      value
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        localeCode
        value
      }
      code
      id
    }
    expensePosition(where: {isDeleted: {_eq: false}}) {
      expenseGroup {
        id
        value
        translations(where: {localeCode: {_eq: $activeUserLocale}}) {
          localeCode
          value
        }
        code
      }
      expenseRuleGeneralExpenseId
      expenseRuleGeneralExpense {
        name
      }
      expenseRuleMileageId
      id
      positionOrder
      totalAmount
      version
      reimbursable
      costCenter {
        id
        name
      }
      additionalProperties
    }
    expenseItemFile(where: {isDeleted: {_eq: false}}) {
      createdAt
    }
  }
  ExpenseItemAggregate(where: {employeeId: {_eq: $employeeId}, status: {_eq: $status}, isDeleted: {_eq: false}, id: {_nin: $idsArray}, title: {_ilike: $titleSearch}, expenseClassRef: {_nilike: "%allowance%"}, _or: [{expenseRuleId: {_eq: $expenseRuleId}}, {expenseRuleId: {_isNull: true}}]}) {
    aggregate {
      count
    }
  }
}

`

export const fetchEmployeeExpenseItemsFromPayload = `query FetchEmployeeExpenseItems($employeeId: uuid!, $status: String, $activeUserLocale: String, $idsArray: [uuid!], $itemCurrency: String, $expenseRuleId: uuid) {
  ExpenseItemEmployee: ExpenseItem(where: {employeeId: {_eq: $employeeId}, status: {_eq: $status}, isDeleted: {_eq: false}, id: {_in: $idsArray}, currencyRef: {_eq: $itemCurrency}, _or: [{expenseRuleId: {_eq: $expenseRuleId}}, {expenseRuleId: {_isNull: true}}]}) {
    id
    version
    code
    expenseClassRef
    expenseGroupRef
    expenseRuleId
    expenseRule {
      code
      name
    }
    source
    title
    expenseDate
    currencyRef
    totalAmount
    status
    reimbursable
    itemOrder
    employeeId
    autoCalculated
    multiplePositions
    costCenterId
    projectId
    expenseRequest {
      id
    }
    employee {
      id
    }
    expenseGroup {
      id
      code
      value
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        localeCode
        value
      }
    }
    currency {
      value
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        localeCode
        value
      }
      code
      id
    }
    expensePosition(where: {isDeleted: {_eq: false}}) {
      expenseGroup {
        id
        value
        translations(where: {localeCode: {_eq: $activeUserLocale}}) {
          localeCode
          value
        }
        code
      }
      expenseRuleGeneralExpenseId
      expenseRuleGeneralExpense {
        name
      }
      expenseRuleMileageId
      id
      positionOrder
      totalAmount
      version
      reimbursable
      costCenter {
        id
        name
      }
      additionalProperties
    }
    expenseItemFile(where: {isDeleted: {_eq: false}}) {
      createdAt
    }
  }
}

`

export const fetchEmployeeExpenseItemsFromPayloadForRuleCheck = `query FetchEmployeeExpenseItemsFromPayloadForRuleCheck($employeeId: uuid!, $status: String, $idsArray: [uuid!], $itemCurrency: String) {
  ExpenseItemEmployee: ExpenseItem(where: {employeeId: {_eq: $employeeId}, status: {_eq: $status}, isDeleted: {_eq: false}, id: {_in: $idsArray}, currencyRef: {_eq: $itemCurrency}}) {
    id
    code
    title
    expenseRuleId
    expenseRule {
      code
      name
    }
  }
}

`

export const getExpenseRulesDataQuery = `query getTravelRegionRules($expenseRuleId: uuid!,$activeUserLocale: String) {
    ExpenseRuleByPk(id: $expenseRuleId) {
      useSingleCurrency
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
  }
  AllowanceRegionRuleDetail(where: {isDeleted:{_eq:false},allowanceRegionRule: {expenseRuleAllowanceCode: {expenseRuleId: {_eq: $expenseRuleId}}}}, distinctOn: travelRegionRef) {
    id
    travelRegionRef
    home
    countryRef
    
     amount
    currency {
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
    travelRegion {
       value
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog {
      defaultLocale
    }
      
    }
  }
 homeRegionRule: AllowanceRegionRuleDetail(where: {allowanceRegionRule: {expenseRuleAllowanceCode: {expenseRuleId: {_eq: $expenseRuleId}}}, home: {_eq: true},isDeleted: {_eq: false}}, distinctOn: travelRegionRef) {
    travelRegionRef
    home
    travelRegion {
       translations(where: { localeCode: { _eq: $activeUserLocale } }) {
        value
      }
    }
    amount
    currency {
      code
       translations(where: { localeCode: { _eq: $activeUserLocale } }) {
        value
      }
    }
  }
}
`

export const getExpenseRulePkData = `query getTravelRegionRules($expenseRuleId: uuid!,$activeUserLocale: String) {
    ExpenseRuleByPk(id: $expenseRuleId) {
      useSingleCurrency
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
  }
  }`

export const getRequestsAbsences = `query MyQuery($employeeId: uuid, $requestId:uuid, $requestType: String, $absenceStatus: String, $startTimeValue: timestamp, $endTimeValue: timestamp, $statusArray: [String!] ,$activeUserLocale: String) {
  ExpenseRequest(where: {requestTypeRef: {_eq: $requestType},id: {_neq: $requestId}, employeeId: {_eq: $employeeId}, isDeleted: {_eq: false}, _or: [{startDate: {_gte: $startTimeValue, _lte: $endTimeValue}}, {endDate: {_gte: $startTimeValue, _lte: $endTimeValue}}, {_and: [{startDate: {_lte: $startTimeValue}}, {endDate: {_gte: $endTimeValue}}]}], status: {_nin: $statusArray}}, orderBy: {startDate: ASC}, limit: 1) {
    id
    startDate
    endDate
    title
  }
  EmployeeAbsence(where: {employeeId: {_eq: $employeeId}, isDeleted: {_eq: false}, status: {_eq: $absenceStatus}, _or: [{startDate: {_gte: $startTimeValue, _lte: $endTimeValue}}, {endDate: {_gte: $startTimeValue, _lte: $endTimeValue}}, {_and: [{startDate: {_lte: $startTimeValue}}, {endDate: {_gte: $endTimeValue}}]}]}, orderBy: {startDate: ASC}, limit: 1) {
    id
    startDate
    endDate
    type {
      id
      translations(where: { localeCode: { _eq: $activeUserLocale } }) {
        value
      }
      code
    }
  }
  ExpensePlan(where: {requestTypeRef: {_eq: $requestType}, employeeId: {_eq: $employeeId}, isDeleted: {_eq: false}, _or: [{startDate: {_gte: $startTimeValue, _lte: $endTimeValue}}, {endDate: {_gte: $startTimeValue, _lte: $endTimeValue}}, {_and: [{startDate: {_lte: $startTimeValue}}, {endDate: {_gte: $endTimeValue}}]}], status: {_nin: $statusArray}}, orderBy: {startDate: ASC}, limit: 1) {
    id
    startDate
    endDate
    title
  }
}
`
export const getTravelRegionsAndUser = `query getTravelRegionRules($expenseRuleId: uuid!,$employeeId: uuid!,$activeUserLocale: String!) {
  AllowanceRegionRuleDetail(where: {allowanceRegionRule: {expenseRuleAllowanceCode: {expenseRuleId: {_eq: $expenseRuleId}}},isDeleted: {_eq: false}}, distinctOn: travelRegionRef) {
    id
    travelRegionRef
    home
    countryRef
     amount
    currency {
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
    travelRegion {
      value
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog {
      defaultLocale
    }
    }
  }
    EmployeePosition(where: {employeeId: {_eq: $employeeId}}) {
    structureId
    costCenterId
  }
}`

export const getAllowanceData = `query getAllowanceData($employeeId: uuid!, $expenseRequestId: uuid, $expenseRequestRuleId: uuid!) {
      TravelBreakdown(where: {expenseRequestId: {_eq: $expenseRequestId}, isDeleted: {_eq: false}, employeeId: {_eq: $employeeId}}) {
    id
    version
    breakfast
    lunch
    dinner
    overnight
    expenseDate
    travelRegionRef
    projectId
    expenseRuleId
    expensePlanId
    costCenterId
    expenseRequestId
  }
      ExpenseRuleAllowanceSetup(where: {expenseRuleId: {_eq: $expenseRequestRuleId}, isDeleted: {_eq: false}}) {
    id
    issue
  }
}`

export const getUserCostCenters = `query MyQuery($structureId: uuid!) {
  userCostCenters: CostCenter(where: {structureId: {_eq: $structureId}, isDeleted: {_eq: false}}) {
    id
    name
    structureId
  }
}
`

export const getUserProjects = `query MyQuery($structureIdArray: [uuid!]) {
  Project(where: {structureId: {_in: $structureIdArray},isDeleted:{_eq:false}}) {
    id
    name
    structureId
    validTo
  }
}
`

export const getRuleAllowancePeriod = `query getExpenseRuleAllowancePeriod($expenseRuleId: uuid!) {
  ExpenseRuleAllowancePeriod(where: {expenseRuleId: {_eq: $expenseRuleId}, isDeleted: {_eq: false},  overnightAccomodation: {_eq: true}}) {
    id
    version
    activeTo
    activeFrom
    midnightRule
    minHours
    startAfter
    returnBefore
    expenseRuleId
    overnightAccomodation
  }
}
`
