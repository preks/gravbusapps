import { CATALOG_ENTRY_REF } from '@/common/data/catalog/queries/catalogFragments'

export const GET_COMPENSATION_TEAM_MEMBERS = `
  query GetCompensationTeamMembers(
    $where: EmployeePositionBoolExp!
    $relationshipWhere: OrganizationalUnitRelationshipBoolExp!
  ) {
    EmployeePosition(where: $where) {
      id
      employeeId
      firstName
      lastName
      hireDate
      companyId
      organizationalUnitId
      organizationalUnit {
        id
        name
        organizationalUnitEmployee(where: { role: { _eq: "Manager" } }) {
          employeeId
          role
          managerLevel
          isMain
        }
      }
      siteLocationId
      supervisorEmployeeId
      jobPosition {
        id
        name
        jobFunction {
          jobFamily {
            id
          }
        }
        jobProfile {
          jobFunction {
            jobFamily {
              id
            }
          }
        }
        jobLevel {
          id
        }
      }
      employee {
        id
        code
        firstName
        lastName
        displayName
        picture
        pictureThumbnail
        workingCondition(where: { isDeleted: { _neq: true } }, orderBy: [{ activeFrom: DESC }, { createdAt: DESC }]) {
          hireDate
          activeFrom
          activeTo
          contractType {
            objectValue
          }
        }
        workingHours(orderBy: [{ activeFrom: DESC }], limit: 1) {
          weeklyHours
          fullTimeEquivalent
        }
      }
    }
    OrganizationalUnitRelationship(where: $relationshipWhere) {
      childId
      parentId
      parent {
        id
        name
      }
    }
  }
`

export const GET_COMPENSATION_COMPANY_BASELINE_POSITIONS = `
  query GetCompensationCompanyBaselinePositions($where: EmployeePositionBoolExp!) {
    EmployeePosition(where: $where, orderBy: [{ employeeId: ASC }, { organizationalUnitId: ASC }]) {
      id
      employeeId
      companyId
      organizationalUnitId
      organizationalUnit {
        id
        name
      }
      employee {
        id
      }
    }
  }
`

export const GET_COMPENSATION_BAND_POLICIES_FOR_TEAM = `
  query GetCompensationBandPoliciesForTeam($jobFamilyIds: [uuid!]!, $jobLevelIds: [uuid!]!, $geoZoneIds: [uuid!]!) {
    CompensationBandPolicy(
      where: {
        jobFamilyId: { _in: $jobFamilyIds }
        jobLevelId: { _in: $jobLevelIds }
        geoZoneId: { _in: $geoZoneIds }
      }
      orderBy: [{ priority: ASC }]
    ) {
      jobFamilyId
      jobLevelId
      geoZoneId
      compensationBand {
        payGrade
        minSalary
        maxSalary
        currency {
          value
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

/**
 * One request for current salaries, full salary history, and YTD bonuses.
 * @deprecated Prefer the split queries below: some Hasura/Postgres setups error on multi-root
 *   selections (`"database query error"`, `path: "$"`) but succeed with separate round-trips.
 */
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

/** Team compensation: split from {@link GET_TEAM_COMPENSATION_SALARIES_AND_BONUSES} for problematic backends. */
export const GET_TEAM_CURRENT_SALARIES_FOR_COMPENSATION = `
  query GetTeamCurrentSalariesForCompensation($employeeIds: [uuid!]!, $today: date!) {
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

export const GET_TEAM_SALARY_HISTORY_FOR_COMPENSATION = `
  query GetTeamSalaryHistoryForCompensation($employeeIds: [uuid!]!) {
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

export const GET_TEAM_BONUSES_FOR_COMPENSATION = `
  query GetTeamBonusesForCompensation($employeeIds: [uuid!]!, $yearStart: date!, $today: date!) {
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
