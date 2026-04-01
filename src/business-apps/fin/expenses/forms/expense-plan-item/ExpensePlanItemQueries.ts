// Queries for the ExpensePlanItem component - extending expense item queries

// Re-export all queries from expense-item that we can reuse
export {
  useEmployeeRuleQuery,
  fetchEmployeeRule,
  fetchExpenseRuleGeneralData,
  getNewTypes,
  getCustomFields,
  getStructureCostCenter,
  GET_EXPENSE_CLASSES,
  GET_EXPENSE_TYPES,
  GET_COST_CENTERS,
  GET_CURRENCIES
} from '../expense-item/ExpenseItemQueries'

// Add expense plan item specific query
export const fetchExpenseData = `query MyQuery($expenseId:uuid! ,$activeUserLocale: String) {
   ExpensePlanItemByPk(id: $expenseId) {
    id
    version
    source
    expenseDate
    totalAmount
    status
    reimbursable
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
    expensePlan {
      id
      title
    }
    title
    autoCalculated
    expenseRuleGeneralExpenseId
    additionalProperties
    source
  }
}`

export const fetchExpenseCatalogueData = `query fetchExpenseCatalogueData ($employeeId: uuid,$objectFilter: jsonb!,$activeUserLocale:String!,$expenseRuleId: uuid) {
  EmployeePosition(where: {employeeId: {_eq: $employeeId}}) {
    structureId
    costCenterId
  }
  expenseGroup: CatalogEntry(where: {catalog: {version: { _eq: "v1" }identifier: { _eq: "ExpenseGroup" }}, isDeleted: { _eq: false }, objectValue: { _contains: $objectFilter }}, orderBy: {additionalValue2: ASC}) {
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
  currency: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "Currency"}}, isDeleted: { _eq: false }}) {
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
  expenceClass: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "ExpenseClass"}}, isDeleted: { _eq: false }}) {
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
