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
    }
    orderBy: [{ startDate: DESC }, { createdAt: DESC }]
    limit: 5
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
    requestDate
    decisionDate
    requestedPercent
    requestedAmount
    stockOptions
    notes
    salaryAdjustReasonRef
    decisionEmployeeId
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
  ) {
    id
    hireDate
    activeFrom
    activeTo
    region {
      id
    }
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

/** Country catalog entry id for a given EmploymentRegion (additionalValue3) */
export const GET_REGION_COUNTRY_ID = `query GetRegionCountryId($regionId: String!) {
  CatalogEntry(where: { id: { _eq: $regionId }, isDeleted: { _eq: false } }) {
    id
    additionalValue3
  }
}
`

/** Country catalog entry objectValue (contains currency ref) for preset currency */
export const GET_COUNTRY_OBJECT_VALUE = `query GetCountryObjectValue($id: String!) {
  CatalogEntry(where: { id: { _eq: $id }, isDeleted: { _eq: false } }) {
    id
    objectValue
  }
}
`

export const EXISTING_SALARY_ADJUSTMENT_FOR_MONTH_QUERY = `query existingSalaryAdjustmentForMonth($idEmployee: uuid!, $monthStart: date!, $monthEnd: date!) {
  EmployeeSalary(
    where: {
      _and: [
        { employeeId: { _eq: $idEmployee } }
        { isDeleted: { _eq: false } }
        {
          _or: [
            { requestStatus: { _neq: "REJECTED_SALARY_ADJUSTMENT" } }
            { requestStatus: { _isNull: true } }
          ]
        }
        { startDate: { _gte: $monthStart, _lte: $monthEnd } }
      ]
    }
    orderBy: [{ startDate: ASC }]
    limit: 1
  ) {
    id
    startDate
  }
}
`
