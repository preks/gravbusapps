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
  AllEmployeeSalaries: EmployeeSalary(
    where: { 
      employeeId: { _eq: $idEmployee }
      isDeleted: { _eq: false }
    }
    orderBy: [{ activeFrom: DESC }, { createdAt: DESC }]
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
