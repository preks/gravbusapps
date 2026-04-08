import { CATALOG_ENTRY_REF } from '@/common/data/catalog/queries/catalogFragments'

export const GET_COMPENSATION_TEAM_MEMBERS = `
  query GetCompensationTeamMembers($where: EmployeePositionBoolExp!) {
    EmployeePosition(where: $where) {
      id
      employeeId
      firstName
      lastName
      hireDate
      companyId
      company {
        id
        name
      }
      organizationalUnitId
      organizationalUnit {
        id
        name
      }
      supervisorEmployeeId
      jobPosition {
        id
        name
        jobLevel {
          compensationBand {
            id
            name
            payGrade
            minSalary
            maxSalary
            currencyRef
            currency {
              id
              code
              value
            }
          }
        }
      }
      employee {
        id
        code
        displayName
        fullName
        pictureThumbnail
        workingCondition {
          hireDate
        }
        workingHours(orderBy: [{ activeFrom: DESC }], limit: 1) {
          weeklyHours
          fullTimeEquivalent
        }
      }
    }
  }
`

export const GET_TEAM_CURRENT_SALARIES = `
  query GetTeamCurrentSalaries($employeeIds: [uuid!]!, $today: date!) {
    EmployeeSalary(
      where: {
        employeeId: { _in: $employeeIds }
        isDeleted: { _eq: false }
        requestStatus: { _eq: "APPROVED_SALARY_ADJUSTMENT" }
        startDate: { _lte: $today }
      }
      orderBy: [{ startDate: DESC }, { createdAt: DESC }]
      limit: 2000
    ) {
      id
      employeeId
      annualGrossSalary
      monthlyGrossSalary
      hourlyGrossSalary
      currency {
        id
        code
        value
      }
      currencyRef
      startDate
      endDate
    }
  }
`

export const GET_TEAM_SALARY_HISTORY = `
  query GetTeamSalaryHistory($employeeIds: [uuid!]!) {
    EmployeeSalary(
      where: {
        employeeId: { _in: $employeeIds }
        isDeleted: { _eq: false }
        requestStatus: { _eq: "APPROVED_SALARY_ADJUSTMENT" }
      }
      orderBy: [{ startDate: DESC_NULLS_LAST }, { createdAt: DESC }]
      limit: 2000
    ) {
      id
      employeeId
      annualGrossSalary
      monthlyGrossSalary
      startDate
      endDate
      requestedPercent
      requestedAmount
      createdAt
    }
  }
`

export const GET_TEAM_BONUSES = `
  query GetTeamBonuses($employeeIds: [uuid!]!, $yearStart: date!, $today: date!) {
    EmployeeBonus(
      where: {
        employeeId: { _in: $employeeIds }
        isDeleted: { _eq: false }
        paymentDate: { _gte: $yearStart, _lte: $today }
      }
      orderBy: { paymentDate: DESC }
    ) {
      id
      employeeId
      employeeBonusType {
        ${CATALOG_ENTRY_REF}
      }
      amount
      currency {
        id
        code
        value
      }
      paymentDate
      fiscalYear
    }
  }
`

/** One request for current salaries, full salary history, and YTD bonuses (replaces three parallel `EmployeeSalary`/`EmployeeBonus` calls). */
export const GET_TEAM_COMPENSATION_SALARIES_AND_BONUSES = `
  query GetTeamCompensationSalariesAndBonuses($employeeIds: [uuid!]!, $today: date!, $yearStart: date!) {
    teamCurrentSalaries: EmployeeSalary(
      where: {
        employeeId: { _in: $employeeIds }
        isDeleted: { _eq: false }
        requestStatus: { _eq: "APPROVED_SALARY_ADJUSTMENT" }
        startDate: { _lte: $today }
      }
      orderBy: [{ startDate: DESC }, { createdAt: DESC }]
      limit: 2000
    ) {
      id
      employeeId
      annualGrossSalary
      monthlyGrossSalary
      hourlyGrossSalary
      currency {
        id
        code
        value
      }
      currencyRef
      startDate
      endDate
    }
    teamSalaryHistory: EmployeeSalary(
      where: {
        employeeId: { _in: $employeeIds }
        isDeleted: { _eq: false }
        requestStatus: { _eq: "APPROVED_SALARY_ADJUSTMENT" }
      }
      orderBy: [{ startDate: DESC_NULLS_LAST }, { createdAt: DESC }]
      limit: 2000
    ) {
      id
      employeeId
      annualGrossSalary
      monthlyGrossSalary
      startDate
      endDate
      requestedPercent
      requestedAmount
      createdAt
    }
    teamBonuses: EmployeeBonus(
      where: {
        employeeId: { _in: $employeeIds }
        isDeleted: { _eq: false }
        paymentDate: { _gte: $yearStart, _lte: $today }
      }
      orderBy: { paymentDate: DESC }
    ) {
      id
      employeeId
      employeeBonusType {
        ${CATALOG_ENTRY_REF}
      }
      amount
      currency {
        id
        code
        value
      }
      paymentDate
      fiscalYear
    }
  }
`
