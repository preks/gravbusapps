/**
 * GraphQL queries for employee compensation data
 *
 * CONNECTED TO EXISTING DATABASE TABLES:
 * ✅ EmployeeWorkingCondition - Contains salary data (monthlyGrossSalary, annuallyGrossSalary, stockOptions)
 * ✅ CompensationBand - Salary bands and pay grades
 *
 * TODO - FUTURE DATABASE TABLES (Not yet created):
 * 🔄 EmployeeBonus - Bonus payments tracking
 *    Recommended fields: id, employeeId, bonusTypeRef (catalog), amount, currencyRef,
 *                       paymentDate, fiscalYear, status, description, notes, isDeleted
 *
 * 🔄 EmployeeBenefit - Employee benefits and perks
 *    Recommended fields: id, employeeId, benefitTypeRef (catalog), provider, monetaryValue,
 *                       currencyRef, startDate, endDate, status, notes, isDeleted
 *
 * 🔄 EmployeePayslip - Monthly payslip records
 *    Recommended fields: id, employeeId, payPeriod, paymentDate, grossAmount, netAmount,
 *                       currencyRef, status, documentUrl, fiscalYear, isDeleted
 *
 * 🔄 CATALOGS NEEDED:
 *    - BonusType catalog (Performance, Annual, Signing, Referral, etc.)
 *    - BenefitType catalog (Health Insurance, Dental, Vision, Retirement, etc.)
 */

/**
 * Query for current employee compensation using REAL database tables
 * Fetches from EmployeeWorkingCondition and CompensationBand
 */
export const GET_EMPLOYEE_COMPENSATION_DATA = /*sql*/ `
  query GetEmployeeCompensationData($employeeId: uuid!) {
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
    
    # 🔄 TODO: Uncomment when EmployeeBonus table is created
    # EmployeeBonus(
    #   where: {
    #     employeeId: {_eq: $employeeId}
    #     isDeleted: {_eq: false}
    #     fiscalYear: {_eq: $currentYear}
    #     status: {_in: ["Approved", "Paid"]}
    #   }
    #   order_by: {paymentDate: desc}
    # ) {
    #   id
    #   employeeId
    #   bonusType {
    #     id
    #     value
    #     translations(where: {localeCode: {_eq: $activeUserLocale}}) {
    #       localeCode
    #       value
    #     }
    #   }
    #   amount
    #   currency {
    #     id
    #     code
    #     value
    #   }
    #   paymentDate
    #   fiscalYear
    #   status
    #   description
    #   notes
    # }
    
    # 🔄 TODO: Uncomment when EmployeeBenefit table is created
    # EmployeeBenefit(
    #   where: {
    #     employeeId: {_eq: $employeeId}
    #     isDeleted: {_eq: false}
    #     status: {_eq: "Active"}
    #   }
    #   orderBy: {startDate: DESC}
    # ) {
    #   id
    #   employeeId
    #   benefitType {
    #     id
    #     value
    #     translations(where: {localeCode: {_eq: $activeUserLocale}}) {
    #       localeCode
    #       value
    #     }
    #   }
    #   provider
    #   monetaryValue
    #   currency {
    #     id
    #     code
    #     value
    #   }
    #   startDate
    #   endDate
    #   status
    #   notes
    # }
  }
`

/**
 * Query for employee compensation history using REAL database tables
 * Fetches all historical working conditions for salary change tracking
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
    
    # 🔄 TODO: Uncomment when EmployeeBonus table is created
    # EmployeeBonus(
    #   where: {
    #     employeeId: {_eq: $employeeId}
    #     isDeleted: {_eq: false}
    #   }
    #   order_by: {paymentDate: desc}
    # ) {
    #   id
    #   employeeId
    #   bonusType {
    #     id
    #     value
    #     translations(where: {localeCode: {_eq: $activeUserLocale}}) {
    #       localeCode
    #       value
    #     }
    #   }
    #   amount
    #   currency {
    #     id
    #     code
    #     value
    #   }
    #   paymentDate
    #   fiscalYear
    #   status
    #   description
    #   notes
    #   createdAt
    # }
  }
`

// ==========================================
// 🔄 MOCK DATA (TEMPORARY - Only for Bonuses & Benefits)
// ==========================================
// Remove this section once EmployeeBonus and EmployeeBenefit tables are created

/**
 * Mock data for bonuses (until EmployeeBonus table is created)
 */
export const getMockBonuses = () => {
  return [
    {
      id: 'bonus-001',
      employeeId: 'temp',
      bonusType: {
        id: 'performance',
        value: 'Performance Bonus'
      },
      amount: 5000,
      currency: {
        id: 'EUR',
        code: 'EUR',
        value: 'Euro'
      },
      paymentDate: `${new Date().getFullYear()}-03-15`,
      fiscalYear: new Date().getFullYear(),
      status: 'Paid',
      description: 'Q1 Performance Bonus',
      notes: 'Exceeded performance targets'
    },
    {
      id: 'bonus-002',
      employeeId: 'temp',
      bonusType: {
        id: 'annual',
        value: 'Annual Bonus'
      },
      amount: 8000,
      currency: {
        id: 'EUR',
        code: 'EUR',
        value: 'Euro'
      },
      paymentDate: `${new Date().getFullYear() - 1}-12-20`,
      fiscalYear: new Date().getFullYear() - 1,
      status: 'Paid',
      description: 'Annual Performance Bonus',
      notes: 'End of year bonus'
    }
  ]
}

/**
 * Mock data for benefits (until EmployeeBenefit table is created)
 */
export const getMockBenefits = () => {
  return [
    {
      id: 'benefit-001',
      employeeId: 'temp',
      benefitType: {
        id: 'health',
        value: 'Car Allowance'
      },
      provider: 'N/A',
      monetaryValue: 6000,
      currency: {
        id: 'EUR',
        code: 'EUR',
        value: 'Euro'
      },
      startDate: '2024-01-01',
      endDate: null,
      status: 'Active',
      notes: 'Premium car lease allowance'
    },
    {
      id: 'benefit-002',
      employeeId: 'temp',
      benefitType: {
        id: 'retirement',
        value: 'Retirement Plan'
      },
      provider: 'Pension Fund International',
      monetaryValue: 4500,
      currency: {
        id: 'EUR',
        code: 'EUR',
        value: 'Euro'
      },
      startDate: '2024-01-01',
      endDate: null,
      status: 'Active',
      notes: 'Company match up to 5%'
    },
    {
      id: 'benefit-003',
      employeeId: 'temp',
      benefitType: {
        id: 'gym',
        value: 'Gym Membership'
      },
      provider: 'FitnessCorp',
      monetaryValue: 400,
      currency: {
        id: 'EUR',
        code: 'EUR',
        value: 'Euro'
      },
      startDate: '2024-01-01',
      endDate: null,
      status: 'Active',
      notes: 'Access to all locations'
    }
  ]
}

/**
 * Mock data for payslips (until EmployeePayslip table is created)
 * Generates 24 months of payslip history
 */
export const getMockPayslips = () => {
  const payslips = []
  const currentDate = new Date()

  for (let i = 0; i < 24; i++) {
    const payPeriodDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
    const year = payPeriodDate.getFullYear()
    const month = payPeriodDate.getMonth() + 1
    const monthName = payPeriodDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

    // Vary amounts slightly for realism
    const baseGross = 5000
    const variation = (i % 3) * 200
    const grossAmount = baseGross + variation

    payslips.push({
      id: `payslip-${String(i + 1).padStart(3, '0')}`,
      employeeId: 'temp',
      payPeriod: `${year}-${String(month).padStart(2, '0')}`,
      paymentDate: new Date(year, month - 1, 28).toISOString().split('T')[0],
      grossAmount,
      netAmount: Math.round(grossAmount * 0.76), // ~24% deductions
      currency: {
        id: 'EUR',
        code: 'EUR',
        value: 'Euro'
      },
      status: 'Paid' as const,
      documentUrl: `/api/payslips/download/${year}/${String(month).padStart(2, '0')}`,
      fiscalYear: year,
      monthName
    })
  }

  return payslips
}

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
