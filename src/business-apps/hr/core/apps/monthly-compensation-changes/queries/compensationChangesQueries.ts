/**
 * GraphQL queries for monthly compensation changes overview.
 *
 * Fetches salary adjustments, bonuses, and benefit activations/deactivations
 * that fall within a given month window (startOfMonth … endOfMonth).
 *
 * Salary changes are identified by startDate falling in the month.
 * Bonuses are identified by paymentDate falling in the month.
 * Benefits are identified by startDate or endDate falling in the month
 * (activation = startDate in month, deactivation = endDate in month).
 *
 * Legal entity filtering is applied client-side using the employee's
 * position data (companyId) returned from GET_EMPLOYEE_POSITIONS_BY_COMPANY.
 */

const EMPLOYEE_FRAGMENT = `
  employee {
    id
    fullName
    displayName
    pictureThumbnail
    employeePositions(limit: 1) {
      organizationalUnit {
        name
      }
    }
  }
`

const SALARY_FIELDS = `
  id
  employeeId
  ${EMPLOYEE_FRAGMENT}
  monthlyGrossSalary
  annualGrossSalary
  hourlyGrossSalary
  currency {
    id
    code
    value
  }
  startDate
  endDate
  requestStatus
  requestDate
  decisionDate
  requestedPercent
  requestedAmount
  salaryAdjustReasonRef
  notes
  createdAt
`

const BONUS_FIELDS = `
  id
  employeeId
  ${EMPLOYEE_FRAGMENT}
  employeeBonusType {
    id
    code
    value
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
  }
  amount
  currency {
    id
    code
    value
  }
  paymentDate
  fiscalYear
  status
  description
  notes
  createdAt
`

const BENEFIT_FIELDS = `
  id
  employeeId
  ${EMPLOYEE_FRAGMENT}
  benefitType {
    id
    code
    value
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
  }
  benefitProvider {
    id
    code
    value
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
  }
  benefitStatus
  monthlyAmount
  yearlyAmount
  employeeMonthlyContribution
  currency {
    id
    code
    value
  }
  startDate
  endDate
  status
  notes
  createdAt
  updatedAt
`

export const GET_MONTHLY_SALARY_CHANGES = `
  query GetMonthlySalaryChanges($monthStart: date!, $monthEnd: date!) {
    EmployeeSalary(
      where: {
        isDeleted: {_eq: false}
        startDate: {_gte: $monthStart, _lte: $monthEnd}
      }
      orderBy: [{startDate: DESC}, {createdAt: DESC}]
    ) {
      ${SALARY_FIELDS}
    }
  }
`

export const GET_MONTHLY_BONUSES = `
  query GetMonthlyBonuses($monthStart: date!, $monthEnd: date!, $activeUserLocale: String!) {
    EmployeeBonus(
      where: {
        isDeleted: {_eq: false}
        paymentDate: {_gte: $monthStart, _lte: $monthEnd}
      }
      orderBy: {paymentDate: DESC}
    ) {
      ${BONUS_FIELDS}
    }
  }
`

export const GET_MONTHLY_BENEFIT_CHANGES = `
  query GetMonthlyBenefitChanges($monthStart: date!, $monthEnd: date!, $activeUserLocale: String!) {
    BenefitActivations: EmployeeBenefit(
      where: {
        isDeleted: {_eq: false}
        startDate: {_gte: $monthStart, _lte: $monthEnd}
      }
      orderBy: {startDate: DESC}
    ) {
      ${BENEFIT_FIELDS}
    }

    BenefitDeactivations: EmployeeBenefit(
      where: {
        isDeleted: {_eq: false}
        endDate: {_gte: $monthStart, _lte: $monthEnd}
      }
      orderBy: {endDate: DESC}
    ) {
      ${BENEFIT_FIELDS}
    }
  }
`

export const GET_EMPLOYEE_IDS_BY_COMPANY = `
  query GetEmployeeIdsByCompany($companyIds: [uuid!]!) {
    EmployeePosition(
      where: {
        companyId: {_in: $companyIds}
      }
    ) {
      companyId
      employeeId
    }
  }
`

export const GET_SALARY_ADJUST_REASON_CATALOG = `
  query GetSalaryAdjustReasonCatalog($activeUserLocale: String!) {
    CatalogEntry(
      where: {
        catalog: {identifier: {_eq: "SalaryAdjustReason"}, version: {_eq: "v1"}}
        isDeleted: {_neq: true}
      }
    ) {
      id
      code
      value
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        localeCode
        value
      }
    }
  }
`

export const GET_PREVIOUS_EMPLOYEE_SALARY = `
  query GetPreviousEmployeeSalary($employeeId: uuid!, $startDate: date!) {
    EmployeeSalary(
      where: {
        employeeId: {_eq: $employeeId}
        isDeleted: {_eq: false}
        requestStatus: {_eq: "APPROVED_SALARY_ADJUSTMENT"}
        startDate: {_lt: $startDate}
      }
      orderBy: [{startDate: DESC_NULLS_LAST}, {createdAt: DESC}]
      limit: 1
    ) {
      id
      annualGrossSalary
      monthlyGrossSalary
      hourlyGrossSalary
      currency {
        id
        code
        value
      }
      startDate
      createdAt
    }
  }
`

/**
 * Active benefits for a given month: started on or before monthEnd AND
 * (no endDate OR endDate >= monthStart).
 */
export const GET_ACTIVE_BENEFITS_FOR_MONTH = `
  query GetActiveBenefitsForMonth($monthStart: date!, $monthEnd: date!, $activeUserLocale: String!) {
    ActiveBenefits: EmployeeBenefit(
      where: {
        isDeleted: {_eq: false}
        startDate: {_lte: $monthEnd}
        _or: [
          {endDate: {_isNull: true}}
          {endDate: {_gte: $monthStart}}
        ]
      }
      orderBy: [{employee: {fullName: ASC}}, {startDate: DESC}]
    ) {
      ${BENEFIT_FIELDS}
    }
  }
`
