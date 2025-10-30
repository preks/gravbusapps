/**
 * Mock Compensation Growth Data Generator
 *
 * TEMPORARY: This file generates mock growth timeline data until the EmployeeCareerMilestone table is created.
 *
 * Purpose:
 * - Simulates 3 years of compensation growth with realistic milestones
 * - Generates monthly data points for smooth timeline visualization
 * - Calculates growth statistics (total growth, average annual increase)
 *
 * TODO: Replace with GraphQL queries when EmployeeCareerMilestone table is available
 */

import { CompensationMilestone, CompensationDataPoint, GrowthData } from '../types/compensationTypes'

/**
 * Configuration constants for mock data generation
 */
const MOCK_DATA_CONFIG = {
  YEARS_BACK: 3,
  MONTHS_TOTAL: 36,
  STARTING_SALARY: 50000,
  CURRENT_SALARY: 70000,
  BENEFITS_BASE: 12000,
  BENEFITS_ANNUAL_GROWTH_RATE: 0.02
}

/**
 * Mock currency object (EUR)
 */
const MOCK_CURRENCY = {
  id: 'EUR',
  code: 'EUR',
  value: 'Euro'
}

/**
 * Creates mock compensation milestones over a 3-year period
 * Simulates realistic career progression with various milestone types
 */
const createMockMilestones = (threeYearsAgo: Date): CompensationMilestone[] => {
  return [
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
      currency: MOCK_CURRENCY,
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
      currency: MOCK_CURRENCY,
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
      currency: MOCK_CURRENCY,
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
      currency: MOCK_CURRENCY,
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
      currency: MOCK_CURRENCY,
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
      currency: MOCK_CURRENCY,
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
      currency: MOCK_CURRENCY,
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
      currency: MOCK_CURRENCY,
      reason: 'Role expansion and increased responsibilities'
    },
    {
      id: 'milestone-009',
      employeeId: 'temp',
      date: new Date(new Date().getFullYear(), 2, 1).toISOString(),
      type: 'Bonus Payout' as const,
      title: 'Quarterly Bonus',
      description: 'Q1 performance bonus',
      previousAmount: 70000,
      newAmount: 70000,
      changeAmount: 6000,
      changePercentage: 0,
      currency: MOCK_CURRENCY,
      reason: 'Outstanding Q1 results',
      relatedBonusId: 'bonus-002'
    },
    {
      id: 'milestone-010',
      employeeId: 'temp',
      date: new Date(new Date().getFullYear(), 6, 1).toISOString(),
      type: 'Salary Increase' as const,
      title: 'Mid-Year Salary Review',
      description: 'Salary increase following mid-year review',
      previousAmount: 70000,
      newAmount: 75000,
      changeAmount: 5000,
      changePercentage: 7.1,
      currency: MOCK_CURRENCY,
      reason: 'Recognition of continued high performance'
    }
  ]
}

/**
 * Generates monthly data points for smooth timeline chart visualization
 * Creates 36 monthly snapshots with progressive compensation values
 */
const generateMonthlyDataPoints = (
  threeYearsAgo: Date,
  milestones: CompensationMilestone[]
): CompensationDataPoint[] => {
  const dataPoints: CompensationDataPoint[] = []
  let currentSalary = MOCK_DATA_CONFIG.STARTING_SALARY
  let currentBonuses = 0
  let currentEquity = 0

  for (let i = 0; i <= MOCK_DATA_CONFIG.MONTHS_TOTAL; i++) {
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

    // Update values based on milestone type
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
    const benefitsGrowth = Math.floor(
      MOCK_DATA_CONFIG.BENEFITS_BASE * (1 + yearsPassed * MOCK_DATA_CONFIG.BENEFITS_ANNUAL_GROWTH_RATE)
    )

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

  return dataPoints
}

/**
 * Calculates growth statistics from compensation data
 */
const calculateGrowthStatistics = () => {
  const startAmount = MOCK_DATA_CONFIG.STARTING_SALARY
  const currentAmount = MOCK_DATA_CONFIG.CURRENT_SALARY
  const changeAmount = currentAmount - startAmount
  const changePercentage = (changeAmount / startAmount) * 100

  const averageAnnualIncrease = changePercentage / MOCK_DATA_CONFIG.YEARS_BACK

  return {
    totalGrowth: {
      startAmount,
      currentAmount,
      changeAmount,
      changePercentage: Math.round(changePercentage * 10) / 10
    },
    averageAnnualIncrease: Math.round(averageAnnualIncrease * 10) / 10
  }
}

/**
 * Main function: Generates complete mock growth data
 * Returns growth timeline with milestones, data points, and statistics
 *
 * @returns GrowthData object with 3 years of compensation history
 */
export const getMockGrowthData = (): GrowthData => {
  const currentDate = new Date()
  const threeYearsAgo = new Date(currentDate)
  threeYearsAgo.setFullYear(currentDate.getFullYear() - MOCK_DATA_CONFIG.YEARS_BACK)

  const milestones = createMockMilestones(threeYearsAgo)
  const dataPoints = generateMonthlyDataPoints(threeYearsAgo, milestones)
  const statistics = calculateGrowthStatistics()

  return {
    startDate: threeYearsAgo.toISOString(),
    endDate: currentDate.toISOString(),
    dataPoints,
    milestones,
    ...statistics,
    totalMilestonesCount: milestones.length
  }
}
