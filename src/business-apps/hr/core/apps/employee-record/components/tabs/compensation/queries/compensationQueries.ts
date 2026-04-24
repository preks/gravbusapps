/**
 * GraphQL queries for employee compensation data
 *
 * Database tables:
 * - EmployeeSalary - Contains salary data (monthlyGrossSalary, annualGrossSalary, hourlyGrossSalary)
 * - CompensationBand - Salary bands and pay grades
 * - EmployeeBonus - Bonus payments tracking
 * - EmployeeBenefit - Employee benefits and perks
 * - EmployeePayslip - Monthly payslip records
 *
 * Required catalogs:
 * - EmployeeBonusType catalog (Performance, Annual, Signing, Referral, etc.)
 * - BenefitType catalog (Health Insurance, Dental, Vision, Retirement, etc.)
 * - BenefitProvider catalog (Insurance companies, pension funds, etc.)
 */

import { CATALOG_ENTRY_REF } from '@/common/data/catalog/queries/catalogFragments'

/**
 * Query for current employee compensation
 * Fetches from EmployeeSalary (latest active APPROVED salary) and CompensationBand
 *
 * HYBRID APPROACH (Server-side + Client-side filtering):
 *
 * Server-side filters:
 * 1. requestStatus = "APPROVED_SALARY_ADJUSTMENT" (only approved salaries)
 * 2. isDeleted = false (exclude soft-deleted records)
 * 3. startDate <= today (salary has started)
 * 4. Orders by startDate DESC (most recent first)
 * 5. Limit: 5 records (small set for client-side filtering)
 *
 * Client-side filters (in hook):
 * 6. Find first where: startDate <= today AND (endDate IS NULL OR endDate >= today)
 * 7. Returns null if no active salary found (UI shows "No active salary configured")
 *
 * Why limit: 5?
 * - Efficient: Minimal data transfer
 * - Safe: Covers edge cases (expired salaries, overlapping dates)
 * - Accurate: Client-side can properly handle null endDate values
 */
export const GET_EMPLOYEE_COMPENSATION_DATA = /*sql*/ `
  query GetEmployeeCompensationData($employeeId: uuid!, $today: date!) {
    # EmployeeSalary - Contains salary data
    # Fetch up to 5 most recent approved salaries for client-side filtering
    # Note: endDate filter removed due to GraphQL null handling issues - done client-side instead
    AllEmployeeSalaries: EmployeeSalary(
      where: {
        employeeId: {_eq: $employeeId}
        isDeleted: {_eq: false}
        requestStatus: {_eq: "APPROVED_SALARY_ADJUSTMENT"}
        startDate: {_lte: $today}
      }
      orderBy: [{startDate: DESC}, {createdAt: DESC}]
      limit: 5
    ) {
      id
      employeeId
      annualGrossSalary
      monthlyGrossSalary
      hourlyGrossSalary
      stockOptions
      currency {
        id
        code
        value
      }
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
      notes
      salaryAdjustReasonRef
      decisionEmployeeId
      createdAt
      isDeleted
    }
    
    # Compensation band via employee position and job level
    EmployeePosition(
      where: {
        employeeId: {_eq: $employeeId}
      }
      limit: 1
    ) {
      id
      employeeId
      jobPositionId
      jobPosition {
        id
        name
        jobLevelId
        jobLevel {
          id
          name
          code
          hierarchyOrder
          compensationBandId
        }
      }
    }
    
    # Employee bonuses
    EmployeeBonus(
      where: {
        employeeId: {_eq: $employeeId}
      }
      orderBy: {paymentDate: DESC}
    ) {
      id
      employeeId
      employeeBonusType {
        ${CATALOG_ENTRY_REF}
      }
      employeeBonusTypeRef
      amount
      currency {
        id
        code
        value
      }
      currencyRef
      paymentDate
      fiscalYear
      status
      description
      notes
    }
    
    # Employee benefits
    EmployeeBenefit(
      where: {
        employeeId: {_eq: $employeeId}
      }
      orderBy: {startDate: DESC}
    ) {
      id
      employeeId
      benefitType {
        ${CATALOG_ENTRY_REF}
      }
      benefitTypeRef
      benefitProvider {
        ${CATALOG_ENTRY_REF}
      }
      benefitProviderRef
      yearlyAmount
      monthlyAmount
      employeeYearlyContribution
      employeeMonthlyContribution
      currency {
        id
        code
        value
      }
      currencyRef
      startDate
      endDate
      status
      benefitStatus
      notes
      createdAt
      updatedAt
    }
  }
`

/**
 * Query compensation band by ID.
 * Used as fallback where JobLevel does not expose a direct compensationBand relation.
 */
export const GET_COMPENSATION_BAND_BY_ID = /*sql*/ `
  query GetCompensationBandById($compensationBandId: uuid!) {
    CompensationBand(
      where: {
        id: {_eq: $compensationBandId}
        isDeleted: {_eq: false}
      }
      limit: 1
    ) {
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
`

/**
 * Query for employee compensation history
 * Fetches all historical APPROVED salary records and bonus records
 */
export const GET_EMPLOYEE_COMPENSATION_HISTORY = /*sql*/ `
  query GetEmployeeCompensationHistory($employeeId: uuid!) {
    # Historical salary records with salary changes
    # Only show approved salaries in history
    # Ordering: DESC_NULLS_LAST ensures null startDate goes to end for consistent fallback behavior
    AllEmployeeSalaries: EmployeeSalary(
      where: {
        employeeId: {_eq: $employeeId}
        isDeleted: {_eq: false}
        requestStatus: {_eq: "APPROVED_SALARY_ADJUSTMENT"}
      }
      orderBy: [{startDate: DESC_NULLS_LAST}, {createdAt: DESC}]
    ) {
      id
      employeeId
      annualGrossSalary
      monthlyGrossSalary
      hourlyGrossSalary
      stockOptions
      currency {
        id
        code
        value
      }
      currencyRef
      activeFrom
      activeTo
      startDate
      endDate
      requestStatus
      createdAt
    }
    
    # Historical bonus records
    EmployeeBonus(
      where: {
        employeeId: {_eq: $employeeId}
      }
      orderBy: {paymentDate: DESC}
    ) {
      id
      employeeId
      employeeBonusType {
        ${CATALOG_ENTRY_REF}
      }
      employeeBonusTypeRef
      amount
      currency {
        id
        code
        value
      }
      currencyRef
      paymentDate
      fiscalYear
      status
      description
      notes
      createdAt
    }
    
    # Historical payslip records
    EmployeePayslip(
      where: {
        employeeId: {_eq: $employeeId}
      }
      orderBy: {paymentDate: DESC}
    ) {
      id
      employeeId
      payPeriod
      paymentDate
      grossAmount
      netAmount
      currency {
        id
        code
        value
      }
      currencyRef
      status
      documentUrl
      fiscalYear
    }
  }
`
