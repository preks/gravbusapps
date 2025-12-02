export const EMPLOYEE_DATA_QUERY = `query fetchEmployee($idEmployee: uuid!) {
  EmployeeByPk(id: $idEmployee) {
    id
    code
    firstName
    lastName
    displayName
  }
}
`

export const CATALOG_DATA_QUERY = `query fetchCatalogData($activeUserLocale: String!) {
  bonusType: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "EmployeeBonusType"}}, isDeleted: {_eq: false}}, orderBy: {displayOrder: ASC}) {
    value
    id
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
    catalog {
      defaultLocale
    }
  }
}
`

export const EMPLOYEE_BANK_ACCOUNT_CURRENCY_QUERY = `query fetchEmployeeBankAccountCurrency($employeeId: uuid!) {
  EmployeeBankAccount(where: {employeeId: {_eq: $employeeId}}, limit: 1) {
    currencyRef
  }
}
`
