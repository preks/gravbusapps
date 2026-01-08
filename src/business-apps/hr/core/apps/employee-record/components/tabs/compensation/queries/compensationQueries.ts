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
 * Logic:
 * 1. Filters by requestStatus = "APPROVED_SALARY_ADJUSTMENT" (only approved salaries)
 * 2. Filters by isDeleted = false (exclude soft-deleted records)
 * 3. Filters by date: startDate <= today AND (endDate IS NULL OR endDate >= today)
 * 4. Orders by startDate DESC to get the most recent active salary
 * 5. Limits to 1 record for efficiency (server-side filtering)
 * 6. Shows "No active salary configured" message if no approved active salary exists
 */
export const GET_EMPLOYEE_COMPENSATION_DATA = /*sql*/ `
  query GetEmployeeCompensationData($employeeId: uuid!, $today: date!) {
    # EmployeeSalary - Contains salary data
    # Server-side filtering for efficiency: only approved, active salaries
    # Note: endDate filter uses _not with _lt to include both null values and dates >= today
    AllEmployeeSalaries: EmployeeSalary(
      where: {
        employeeId: {_eq: $employeeId}
        isDeleted: {_eq: false}
        requestStatus: {_eq: "APPROVED_SALARY_ADJUSTMENT"}
        startDate: {_lte: $today}
        _not: {endDate: {_lt: $today}}
      }
      orderBy: [{startDate: DESC}, {createdAt: DESC}]
      limit: 1
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
