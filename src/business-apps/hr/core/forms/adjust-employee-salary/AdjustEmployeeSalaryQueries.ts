export const EMPLOYEE_DATA_QUERY = `query fetchEmployee($idEmployee: uuid!) {
  EmployeeByPk(id: $idEmployee) {
    id
    code
    firstName
    lastName
    displayName
    pictureThumbnail
  }
  EmployeePosition(where: {employeeId: {_eq: $idEmployee}}, limit: 1) {
    jobPosition {
      name
    }
  }
}
`

export const EMPLOYEE_COMPENSATION_QUERY = `query fetchEmployeeCompensation($idEmployee: uuid!, $today: date!) {
  AllEmployeeSalaries: EmployeeSalary(
    where: { 
      employeeId: { _eq: $idEmployee }
      isDeleted: { _eq: false }
      requestStatus: { _eq: "APPROVED_SALARY_ADJUSTMENT" }
      startDate: { _lte: $today }
      _not: { endDate: { _lt: $today } }
    }
    orderBy: [{ startDate: DESC }, { createdAt: DESC }]
    limit: 1
  ) {
    id
    employeeId
    annualGrossSalary
    monthlyGrossSalary
    hourlyGrossSalary
    currencyRef
    activeFrom
    activeTo
    startDate
    endDate
    requestStatus
    createdAt
    isDeleted
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
  }
}
`

export const SALARY_ADJUST_REASON_CATALOG_QUERY = `query fetchSalaryAdjustReasonCatalog {
  CatalogEntry(
    where: {
      _and: [
        { catalog: { identifier: { _eq: "SalaryAdjustReason" }, version: { _eq: "v1" } } },
        { isDeleted: { _neq: true } }
      ]
    }
    orderBy: [{ displayOrder: ASC }, { value: ASC }]
  ) {
    id
    code
    value
    displayOrder
    translations {
      localeCode
      value
    }
    catalog {
      identifier
      version
      defaultLocale
    }
  }
}
`

export const CURRENCY_CATALOG_QUERY = `query fetchCurrencyCatalog {
  CatalogEntry(
    where: {
      _and: [
        { catalog: { identifier: { _eq: "Currency" }, version: { _eq: "v1" } } },
        { isDeleted: { _neq: true } }
      ]
    }
    orderBy: [{ displayOrder: ASC }, { value: ASC }]
  ) {
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
}
`

export const EMPLOYEE_WORKING_CONDITION_QUERY = `query fetchEmployeeWorkingCondition($idEmployee: uuid!) {
  EmployeeWorkingCondition(
    where: {
      _and: [
        { employeeId: { _eq: $idEmployee } },
        { isDeleted: { _neq: true } }
      ]
    }
    orderBy: [{ activeFrom: DESC }, { createdAt: DESC }]
    limit: 1
  ) {
    id
    hireDate
    activeFrom
    activeTo
  }
}
`

export const EMPLOYEE_WORKING_HOURS_QUERY = `query fetchEmployeeWorkingHours($idEmployee: uuid!) {
  EmployeeWorkingHours(
    where: {
      _and: [
        { employeeId: { _eq: $idEmployee } },
        { isDeleted: { _neq: true } }
      ]
    }
    orderBy: [{ activeFrom: DESC }, { createdAt: DESC }]
    limit: 1
  ) {
    id
    weeklyHours
  }
}
`

export const EMPLOYEE_BANK_ACCOUNT_CURRENCY_QUERY = `query fetchEmployeeBankAccountCurrency($idEmployee: uuid!) {
  EmployeeBankAccount(
    where: {
      employeeId: { _eq: $idEmployee }
      isDeleted: { _eq: false }
    }
    orderBy: [{ createdAt: DESC }]
    limit: 1
  ) {
    currencyRef
  }
}
`
