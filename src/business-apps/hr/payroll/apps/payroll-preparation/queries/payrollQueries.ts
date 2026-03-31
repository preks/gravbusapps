/**
 * GraphQL queries for payroll preparation workspace.
 *
 * Fetches employee master data, positions, salaries, absences, bank accounts,
 * and tax details needed to compute payroll readiness per employee.
 *
 * PayrollRun reads come from Hasura (read-only).
 * PayrollRun writes go through the Kogito REST process (savePayrollRun).
 */

const PAYROLL_RUN_FIELDS = `
  id
  month
  year
  country
  legalEntityId
  legalEntityName
  cutOffDate
  paymentDate
  status
  createdBy
  createdAt
  preparedBy
  preparedAt
  reviewedBy
  reviewedAt
  reviewComment
  approvalDecision
  updatedAt
  updatedBy
  version
  isDeleted
`

export const GET_PAYROLL_RUNS_BY_COMPANY = `
  query GetPayrollRunsByCompany($legalEntityId: uuid!) {
    PayrollRun(
      where: {
        legalEntityId: { _eq: $legalEntityId }
        isDeleted: { _eq: false }
      }
      orderBy: [{ year: DESC }, { month: DESC }]
    ) {
      ${PAYROLL_RUN_FIELDS}
    }
  }
`

export const GET_PAYROLL_RUN = `
  query GetPayrollRun($year: Int!, $month: Int!, $legalEntityId: uuid!) {
    PayrollRun(
      where: {
        year: { _eq: $year }
        month: { _eq: $month }
        legalEntityId: { _eq: $legalEntityId }
        isDeleted: { _eq: false }
      }
      limit: 1
    ) {
      ${PAYROLL_RUN_FIELDS}
    }
  }
`

export const GET_PAYROLL_EMPLOYEES = `
  query GetPayrollEmployees($companyId: uuid!, $activeUserLocale: String!) {
    EmployeePosition(
      where: {
        companyId: { _eq: $companyId }
      }
    ) {
      id
      employeeId
      firstName
      lastName
      hireDate
      exitDate
      companyId
      company {
        id
        name
      }
      costCenterId
      costCenter {
        id
        name
      }
      siteLocationId
      siteLocation {
        id
        name
      }
      organizationalUnitId
      organizationalUnit {
        id
        name
      }
      jobPosition {
        id
        name
      }
      employee {
        id
        code
        fullName
        displayName
        pictureThumbnail
        additionalProperties
        workingCondition {
          id
          contractType {
            id
            value
            objectValue
            translations(where: {localeCode: {_eq: $activeUserLocale}}) {
              value
            }
          }
          employmentType {
            id
            value
            translations(where: {localeCode: {_eq: $activeUserLocale}}) {
              value
            }
          }
          hireDate
          exitDate
          region {
            id
            value
            parentEntry {
              code
            }
          }
        }
        workingHours(orderBy: [{ activeFrom: DESC }], limit: 1) {
          weeklyHours
          fullTimeEquivalent
          mondayHours
          tuesdayHours
          wednesdayHours
          thursdayHours
          fridayHours
          saturdayHours
          sundayHours
        }
        bankAccounts {
          id
          iban
          bankName
          accountHolder
        }
        taxDetails {
          taxNumber
          taxIdentificationNumber
          socialSecurityNumber
          healthInsuranceName
          healthInsuranceTypeRef
          taxBracketRef
          childTaxAllowance
          additionalProperties
        }
      }
    }
  }
`

export const GET_PAYROLL_SALARIES = `
  query GetPayrollSalaries($employeeIds: [uuid!]!) {
    EmployeeSalary(
      where: {
        employeeId: { _in: $employeeIds }
        isDeleted: { _eq: false }
        requestStatus: { _eq: "APPROVED_SALARY_ADJUSTMENT" }
      }
      orderBy: [{ startDate: DESC_NULLS_LAST }, { createdAt: DESC }]
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
      requestStatus
      createdAt
    }
  }
`

export const GET_PAYROLL_ABSENCES = `
  query GetPayrollAbsences($employeeIds: [uuid!]!, $periodStart: timestamp!, $periodEnd: timestamp!, $activeUserLocale: String!) {
    EmployeeAbsence(
      where: {
        employeeId: { _in: $employeeIds }
        startDate: { _lte: $periodEnd }
        endDate: { _gte: $periodStart }
      }
      orderBy: { startDate: ASC }
    ) {
      id
      employeeId
      startDate
      endDate
      status
      effectiveDays
      workingDays
      calendarDays
      description
      type {
        id
        value
        objectValue
        translations(where: {localeCode: {_eq: $activeUserLocale}}) {
          value
        }
      }
      approverId
      approvalNote
      createdAt
    }
  }
`

export const GET_PAYROLL_BONUSES = `
  query GetPayrollBonuses($employeeIds: [uuid!]!, $fiscalYear: numeric!) {
    EmployeeBonus(
      where: {
        employeeId: { _in: $employeeIds }
        fiscalYear: { _eq: $fiscalYear }
      }
      orderBy: { paymentDate: DESC }
    ) {
      id
      employeeId
      employeeBonusType {
        id
        value
        code
      }
      employeeBonusTypeRef
      amount
      currency {
        id
        code
        value
      }
      paymentDate
      fiscalYear
      status
    }
  }
`

export const GET_PAYROLL_ATTENDANCE = `
  query GetPayrollAttendance($employeeIds: [uuid!]!, $dateFrom: date!, $dateTo: date!) {
    EmployeeAttendance(
      where: {
        employeeId: { _in: $employeeIds }
        isDeleted: { _eq: false }
        attendanceDate: { _gte: $dateFrom, _lte: $dateTo }
      }
      orderBy: [{ attendanceDate: DESC }, { startTime: DESC }]
    ) {
      id
      employeeId
      attendanceDate
      effectiveTime
      plannedTime
      recordedTime
    }
  }
`

export const GET_ACTIVE_STRUCTURE = `
  query GetActiveStructure {
    Structure(where: { isActive: { _eq: true } }, limit: 1) {
      id
      name
    }
  }
`

export const GET_COMPANY_ADDRESSES = `
  query GetCompanyAddresses($companyIds: [uuid!]!) {
    CompanyAddress(
      where: {
        companyId: { _in: $companyIds }
        isDeleted: { _eq: false }
      }
    ) {
      companyId
      addressType
      countryRef
      country {
        id
        code
        value
      }
    }
  }
`
