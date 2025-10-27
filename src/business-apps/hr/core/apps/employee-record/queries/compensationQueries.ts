/**
 * GraphQL queries for employee compensation data
 *
 * ✅ CONNECTED TO REAL DATABASE TABLES:
 * - EmployeeWorkingCondition - Contains salary data (monthlyGrossSalary, annualGrossSalary, stockOptions)
 * - CompensationBand - Salary bands and pay grades
 * - EmployeeBonus - Bonus payments tracking
 * - EmployeeBenefit - Employee benefits and perks
 * - EmployeePayslip - Monthly payslip records
 *
 * ✅ REQUIRED CATALOGS:
 * - EmployeeBonusType catalog (Performance, Annual, Signing, Referral, etc.)
 * - BenefitType catalog (Health Insurance, Dental, Vision, Retirement, etc.)
 * - BenefitProvider catalog (Insurance companies, pension funds, etc.)
 */

/**
 * Query for current employee compensation using REAL database tables
 * Fetches from EmployeeWorkingCondition and CompensationBand
 */
export const GET_EMPLOYEE_COMPENSATION_DATA = /*sql*/ `
  query GetEmployeeCompensationData($employeeId: uuid!) {
    # Query to fetch: EmployeeWorkingCondition, EmployeePosition, EmployeeBonus, EmployeeBenefit
    # ✅ REAL DATA: Current working condition with salary information
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
    
    # ✅ REAL DATA: Compensation band via employee position and job level
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
    
    # ✅ REAL DATA: Employee bonuses
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
    
    # ✅ REAL DATA: Employee benefits
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
 * Query for employee compensation history using REAL database tables
 * Fetches all historical working conditions and bonus records
 */
export const GET_EMPLOYEE_COMPENSATION_HISTORY = /*sql*/ `
  query GetEmployeeCompensationHistory($employeeId: uuid!) {
    # ✅ REAL DATA: Historical working conditions with salary changes
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
    
    # ✅ REAL DATA: Historical bonus records
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
    
    # ✅ REAL DATA: Historical payslip records
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

// ==========================================
// 🔄 MOCK DATA (TEMPORARY - Only for Growth Timeline)
// ==========================================
// ✅ EmployeeBonus, EmployeeBenefit, EmployeePayslip are now using REAL data
// 🔄 Growth timeline still uses mock data until EmployeeCareerMilestone table is created

/**
 * Mock data for growth timeline (until EmployeeCareerMilestone table is created)
 * Generates 3 years of compensation growth data with milestones
 */
export const getMockGrowthData = () => {
  const currentDate = new Date()
  const threeYearsAgo = new Date(currentDate)
  threeYearsAgo.setFullYear(currentDate.getFullYear() - 3)

  const currency = {
    id: 'EUR',
    code: 'EUR',
    value: 'Euro'
  }

  // Define milestones over 3 years (€50,000 → €85,000)
  const milestones = [
    {
      id: 'milestone-001',
      employeeId: 'temp',
      date: new Date(threeYearsAgo.getFullYear(), 0, 1).toISOString(),
      type: 'Salary Increase' as const,
      title: 'Starting Salary',
      description: 'Initial compensation',
      newAmount: 50000,
      changeAmount: 0,
      changePercentage: 0,
      currency,
      reason: 'Starting point'
    },
    {
      id: 'milestone-002',
      employeeId: 'temp',
      date: new Date(threeYearsAgo.getFullYear(), 5, 15).toISOString(),
      type: 'Merit Increase' as const,
      title: 'Annual Merit Increase',
      description: 'Performance-based salary adjustment',
      previousAmount: 50000,
      newAmount: 52500,
      changeAmount: 2500,
      changePercentage: 5.0,
      currency,
      reason: 'Exceeded performance expectations'
    },
    {
      id: 'milestone-003',
      employeeId: 'temp',
      date: new Date(threeYearsAgo.getFullYear() + 1, 0, 10).toISOString(),
      type: 'Bonus Payout' as const,
      title: 'Year-End Bonus',
      description: 'Annual performance bonus',
      previousAmount: 52500,
      newAmount: 52500,
      changeAmount: 5000,
      changePercentage: 0,
      currency,
      reason: 'Achievement of annual targets',
      relatedBonusId: 'bonus-003'
    },
    {
      id: 'milestone-004',
      employeeId: 'temp',
      date: new Date(threeYearsAgo.getFullYear() + 1, 2, 1).toISOString(),
      type: 'Promotion' as const,
      title: 'Promoted to Senior Position',
      description: 'Promotion with significant salary increase',
      previousAmount: 52500,
      newAmount: 62000,
      changeAmount: 9500,
      changePercentage: 18.1,
      currency,
      reason: 'Promotion based on exceptional performance and leadership'
    },
    {
      id: 'milestone-005',
      employeeId: 'temp',
      date: new Date(threeYearsAgo.getFullYear() + 1, 8, 1).toISOString(),
      type: 'Equity Grant' as const,
      title: 'Stock Options Grant',
      description: 'Equity compensation grant',
      previousAmount: 62000,
      newAmount: 62000,
      changeAmount: 8000,
      changePercentage: 0,
      currency,
      reason: 'Long-term incentive program'
    },
    {
      id: 'milestone-006',
      employeeId: 'temp',
      date: new Date(threeYearsAgo.getFullYear() + 2, 0, 15).toISOString(),
      type: 'Bonus Payout' as const,
      title: 'Performance Bonus',
      description: 'Quarterly bonus payout',
      previousAmount: 62000,
      newAmount: 62000,
      changeAmount: 4000,
      changePercentage: 0,
      currency,
      reason: 'Q4 performance achievement',
      relatedBonusId: 'bonus-001'
    },
    {
      id: 'milestone-007',
      employeeId: 'temp',
      date: new Date(threeYearsAgo.getFullYear() + 2, 5, 1).toISOString(),
      type: 'Market Adjustment' as const,
      title: 'Market Rate Adjustment',
      description: 'Salary adjustment to market rates',
      previousAmount: 62000,
      newAmount: 65000,
      changeAmount: 3000,
      changePercentage: 4.8,
      currency,
      reason: 'Market competitiveness review'
    },
    {
      id: 'milestone-008',
      employeeId: 'temp',
      date: new Date(threeYearsAgo.getFullYear() + 2, 11, 1).toISOString(),
      type: 'Band Movement' as const,
      title: 'Moved to Higher Compensation Band',
      description: 'Advancement to senior compensation band',
      previousAmount: 65000,
      newAmount: 70000,
      changeAmount: 5000,
      changePercentage: 7.7,
      currency,
      reason: 'Role expansion and increased responsibilities'
    },
    {
      id: 'milestone-009',
      employeeId: 'temp',
      date: new Date(currentDate.getFullYear(), 2, 1).toISOString(),
      type: 'Bonus Payout' as const,
      title: 'Quarterly Bonus',
      description: 'Q1 performance bonus',
      previousAmount: 70000,
      newAmount: 70000,
      changeAmount: 6000,
      changePercentage: 0,
      currency,
      reason: 'Outstanding Q1 results',
      relatedBonusId: 'bonus-002'
    },
    {
      id: 'milestone-010',
      employeeId: 'temp',
      date: new Date(currentDate.getFullYear(), 6, 1).toISOString(),
      type: 'Salary Increase' as const,
      title: 'Mid-Year Salary Review',
      description: 'Salary increase following mid-year review',
      previousAmount: 70000,
      newAmount: 75000,
      changeAmount: 5000,
      changePercentage: 7.1,
      currency,
      reason: 'Recognition of continued high performance'
    }
  ]

  // Generate monthly data points for smooth line chart (last 3 years)
  const dataPoints = []
  let currentSalary = 50000
  let currentBonuses = 0
  let currentEquity = 0

  for (let i = 0; i <= 36; i++) {
    // 36 months = 3 years
    const pointDate = new Date(threeYearsAgo)
    pointDate.setMonth(threeYearsAgo.getMonth() + i)

    const dateStr = `${pointDate.getFullYear()}-${String(pointDate.getMonth() + 1).padStart(2, '0')}`
    const displayDate = pointDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })

    // Check for milestones in this month
    const monthMilestone = milestones.find(m => {
      const milestoneDate = new Date(m.date)
      return (
        milestoneDate.getFullYear() === pointDate.getFullYear() && milestoneDate.getMonth() === pointDate.getMonth()
      )
    })

    // Update values based on milestone
    if (monthMilestone) {
      if (
        monthMilestone.type === 'Promotion' ||
        monthMilestone.type === 'Salary Increase' ||
        monthMilestone.type === 'Merit Increase' ||
        monthMilestone.type === 'Market Adjustment' ||
        monthMilestone.type === 'Band Movement'
      ) {
        currentSalary = monthMilestone.newAmount
      }
      if (monthMilestone.type === 'Equity Grant') {
        currentEquity += monthMilestone.changeAmount
      }
      if (monthMilestone.type === 'Bonus Payout') {
        currentBonuses += monthMilestone.changeAmount
      }
    }

    // Benefits grow slightly over time (2% annually)
    const yearsPassed = i / 12
    const benefitsGrowth = Math.floor(12000 * (1 + yearsPassed * 0.02))

    dataPoints.push({
      date: dateStr,
      displayDate,
      baseSalary: currentSalary,
      totalCompensation: currentSalary + currentBonuses + benefitsGrowth + currentEquity,
      bonuses: currentBonuses,
      benefits: benefitsGrowth,
      equity: currentEquity,
      milestone: monthMilestone
    })
  }

  // Calculate growth statistics
  const startAmount = 50000
  const currentAmount = 70000 // Current total comp from Total Rewards
  const changeAmount = currentAmount - startAmount
  const changePercentage = (changeAmount / startAmount) * 100

  // Average annual increase
  const years = 3
  const averageAnnualIncrease = changePercentage / years

  return {
    startDate: threeYearsAgo.toISOString(),
    endDate: currentDate.toISOString(),
    dataPoints,
    milestones,
    totalGrowth: {
      startAmount,
      currentAmount,
      changeAmount,
      changePercentage: Math.round(changePercentage * 10) / 10
    },
    averageAnnualIncrease: Math.round(averageAnnualIncrease * 10) / 10,
    totalMilestonesCount: milestones.length
  }
}
