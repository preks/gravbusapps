/**
 * GraphQL queries for payroll preparation workspace.
 *
 * Fetches employee master data, positions, salaries, absences, bank accounts,
 * and tax details needed to compute payroll readiness per employee.
 */

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
        updatedAt
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
          updatedAt
          updatedBy
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
          updatedAt
          updatedBy
        }
        bankAccounts {
          id
          iban
          bankName
          accountHolder
          updatedAt
          updatedBy
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
          updatedAt
          updatedBy
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

export const GET_PREVIOUS_SALARIES = `
  query GetPreviousSalaries($employeeIds: [uuid!]!, $beforeDate: timestamptz!) {
    EmployeeSalary(
      where: {
        employeeId: { _in: $employeeIds }
        isDeleted: { _eq: false }
        requestStatus: { _eq: "APPROVED_SALARY_ADJUSTMENT" }
        createdAt: { _lt: $beforeDate }
      }
      orderBy: [{ startDate: DESC_NULLS_LAST }, { createdAt: DESC }]
    ) {
      id
      employeeId
      monthlyGrossSalary
      currency {
        code
      }
      currencyRef
      startDate
      createdAt
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

export const GET_EMPLOYEES_BY_USER_IDS = `
  query GetEmployeesByUserIds($userIds: [String!]!) {
    Employee(
      where: { userId: { _in: $userIds }, isDeleted: { _eq: false } }
    ) {
      userId
      displayName
      fullName
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
