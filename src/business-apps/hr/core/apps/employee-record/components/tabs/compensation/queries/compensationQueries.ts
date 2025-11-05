/**
 * GraphQL queries for employee compensation data
 *
 * Database tables:
 * - EmployeeWorkingCondition - Contains salary data (monthlyGrossSalary, annualGrossSalary, stockOptions)
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

/**
 * Query for current employee compensation
 * Fetches from EmployeeWorkingCondition and CompensationBand
 */
export const GET_EMPLOYEE_COMPENSATION_DATA = /*sql*/ `
  query GetEmployeeCompensationData($employeeId: uuid!) {
    # Current working condition with salary information
    EmployeeWorkingCondition(
      where: {
        employeeId: {_eq: $employeeId}
      }
      orderBy: {createdAt: DESC}
      limit: 1
    ) {
      id
      employeeId
      monthlyGrossSalary
      annualGrossSalary
      hireDate
      exitDate
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
        id
        value
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
        id
        value
      }
      benefitTypeRef
      benefitProvider {
        id
        value
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
    }
  }
`

/**
 * Query for employee compensation history
 * Fetches all historical working conditions and bonus records
 */
export const GET_EMPLOYEE_COMPENSATION_HISTORY = /*sql*/ `
  query GetEmployeeCompensationHistory($employeeId: uuid!) {
    # Historical working conditions with salary changes
    EmployeeWorkingCondition(
      where: {
        employeeId: {_eq: $employeeId}
      }
      orderBy: {createdAt: DESC}
    ) {
      id
      employeeId
      monthlyGrossSalary
      annualGrossSalary
      hireDate
      exitDate
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
        id
        value
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
