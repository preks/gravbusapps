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

export const EMPLOYEE_COMPENSATION_QUERY = `query fetchEmployeeCompensation($idEmployee: uuid!) {
  EmployeeWorkingCondition(
    where: { employeeId: { _eq: $idEmployee } }
    orderBy: { createdAt: DESC }
    limit: 1
  ) {
    id
    employeeId
    annualGrossSalary
    monthlyGrossSalary
    currencyRef
    currency {
      id
      code
      value
      translations {
        localeCode
        value
      }
      catalog {
        defaultLocale
      }
    }
    payFrequencyRef
    payFrequency {
      id
      value
      translations {
        localeCode
        value
      }
      catalog {
        defaultLocale
      }
    }
  }
}
`

export const CURRENCY_CATALOG_QUERY = `query fetchCurrencyCatalog($activeUserLocale: String!) {
  currency: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "Currency"}}, isDeleted: {_eq: false}}, orderBy: {displayOrder: ASC}) {
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
