export { useEmployeeRuleQuery, fetchEmployeeRule } from '../../expense-request-wizard/ExpenseRequestWizardQueries'

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
    id
    travelRegionRef
    home
    countryRef
    travelRegion {
       translations(where: { localeCode: { _eq: $activeUserLocale } }) {
        value
      }
    }
    amount
    currency {
      id
      code
       translations(where: { localeCode: { _eq: $activeUserLocale } }) {
        value
      }
    }
  }
}
`

export const fetchExpensePlanAndItems = `
query MyQuery($expenseId: uuid!, $activeUserLocale: String, $employeeId: uuid!) {
  ExpensePlanByPk(id: $expenseId) {
    id
    version
    createdAt
    description
    expenseRuleId
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
      advancePayment(where: {isDeleted: {_eq: false}}){
      id
      version
      amount
      currencyRef
      paymentMethod
      status
      expensePlanId
      costCenterId
      currency{
        code
      }
    }
      expensePlanComment (where: {isDeleted: {_eq: false}}){
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
      expensePlanId
    }
    costCenter{
      name
    }
    employeeId
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
    advancePaymentTotalAmount
    status
    planDate
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
      expensePlanId
      description
      address
      costCenterId
      travelRegionRef
      countryRef
      allowanceRegionRuleDetailId
    }
  }
  ExpensePlanItem(where: {expensePlanId: {_eq: $expenseId},isDeleted: {_eq: false}}) {
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
    status
    reimbursable
    itemOrder
    employeeId
    autoCalculated
    costCenterId
    costCenterId
    expenseRuleGeneralExpenseId
    expenseRuleGeneralExpense {
        name
      }
    costCenter{
    id
    name
    }
    projectId
    expensePlan {
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
}
     EmployeeAddress(where: {employeeId: {_eq: $employeeId}, isDeleted: {_eq: false}}) {
    type
    locality
    addressLine
  }
  EmployeePosition(where: {employeeId: {_eq: $employeeId}}) {
    id
    costCenter {
      id
      name
    }
  }
    }`

export const fetchEmployeeExpenseItems = `query FetchEmployeeExpensePlanItems($employeeId: uuid!, $status: String, $activeUserLocale: String, $limit: Int, $offset: Int, $idsArray: [uuid!], $itemCurrency: String, $titleSearch: String) {
  ExpensePlanItemEmployee: ExpensePlanItem(where: {employeeId: {_eq: $employeeId}, status: {_eq: $status}, isDeleted: {_eq: false}, id: {_nin: $idsArray}, currencyRef: {_eq: $itemCurrency}, title: {_ilike: $titleSearch}}, limit: $limit, offset: $offset) {
    id
    version
    code
    expenseClassRef
    expenseGroupRef
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
    costCenterId
    expenseRuleGeneralExpenseId
    expenseRuleGeneralExpense {
        name
      }
    costCenter{
    id
    name
    }
    projectId
    expensePlan {
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
  }
  ExpenseItemAggregate(where: {employeeId: {_eq: $employeeId}, status: {_eq: $status}, isDeleted: {_eq: false}, id: {_nin: $idsArray}, currencyRef: {_eq: $itemCurrency}, title: {_ilike: $titleSearch}}) {
    aggregate {
      count
    }
  }
}
`

export const fetchEmployeeExpenseItemsFromPayload = `query FetchEmployeeExpensePlanItems($employeeId: uuid!, $status: String, $activeUserLocale: String, $idsArray: [uuid!], $itemCurrency: String) {
  ExpensePlanItemEmployee: ExpensePlanItem(where: {employeeId: {_eq: $employeeId}, status: {_eq: $status}, isDeleted: {_eq: false}, id: {_in: $idsArray}, currencyRef: {_eq: $itemCurrency}}) {
    id
    version
    code
    expenseClassRef
    expenseGroupRef
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
    costCenterId
    expenseRuleGeneralExpenseId
    expenseRuleGeneralExpense {
        name
      }
    costCenter{
    id
    name
    }
    projectId
    expensePlan {
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
  }
}
`

export const getRequestsAbsences = `query MyQuery($employeeId: uuid,$planId:uuid, $requestType: String, $absenceStatus: String, $startTimeValue: timestamp, $endTimeValue: timestamp, $statusArray: [String!], $activeUserLocale: String) {
  ExpenseRequest(where: {requestTypeRef: {_eq: $requestType}, employeeId: {_eq: $employeeId}, isDeleted: {_eq: false}, _or: [{startDate: {_gte: $startTimeValue, _lte: $endTimeValue}}, {endDate: {_gte: $startTimeValue, _lte: $endTimeValue}}, {_and: [{startDate: {_lte: $startTimeValue}}, {endDate: {_gte: $endTimeValue}}]}], status: {_nin: $statusArray}}, orderBy: {startDate: ASC},limit: 1) {
    id
    startDate
    endDate
    title
    status
  }
  EmployeeAbsence(where: {employeeId: {_eq: $employeeId}, isDeleted: {_eq: false}, status: {_eq: $absenceStatus}, _or: [{startDate: {_gte: $startTimeValue, _lte: $endTimeValue}}, {endDate: {_gte: $startTimeValue, _lte: $endTimeValue}}, {_and: [{startDate: {_lte: $startTimeValue}}, {endDate: {_gte: $endTimeValue}}]}]}, orderBy: {startDate: ASC},limit: 1) {
    id
    startDate
    endDate
    status
    type {
      id
      translations(where: { localeCode: { _eq: $activeUserLocale } }) {
        value
      }
      code
    }
  }
  ExpensePlan(where: {id:{_neq:$planId},requestTypeRef: {_eq: $requestType}, employeeId: {_eq: $employeeId}, isDeleted: {_eq: false}, _or: [{startDate: {_gte: $startTimeValue, _lte: $endTimeValue}}, {endDate: {_gte: $startTimeValue, _lte: $endTimeValue}}, {_and: [{startDate: {_lte: $startTimeValue}}, {endDate: {_gte: $endTimeValue}}]}], status: {_nin: $statusArray}}, orderBy: {startDate: ASC},limit: 1) {
    id
    startDate
    endDate
    title
    status
  }
}
`
export const getTravelRegionsAndUser = `query getTravelRegionRules($expenseRuleId: uuid!,$employeeId: uuid,$activeUserLocale: String) {
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
export const getCurrencyForUser = `query MyQuery($activeUserLocale: String!)
{
  currency: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "Currency"}}, isDeleted: { _eq: false }}) {
    id
    value
    code
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
  }}`

export const getExpenseRequestTypeConfig = `query GetExpenseRequestTypeConfig($requestTypeRef: String!) {
  CatalogEntry(where: {
    catalog: {version: {_eq: "v1"}, identifier: {_eq: "ExpenseRequestType"}},
    id: {_eq: $requestTypeRef},
    isDeleted: { _eq: false }
  }) {
    id
    code
    value
    objectValue
  }
}`
