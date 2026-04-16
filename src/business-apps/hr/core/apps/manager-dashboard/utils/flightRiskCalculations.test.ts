import type { RawFeedback, RawPerformanceGoal } from '../types/flightRisk.types'
import {
  calculateCompensationRiskScore,
  calculateEngagementRiskScore,
  calculatePerformanceRiskScore,
  calculateTenureMonths,
  getCompensationRiskDescription,
  getEngagementRiskDescription,
  getPerformanceRiskDescription,
  getTenureRiskDescription
} from './flightRiskCalculations'

const buildGoal = (overrides: Partial<RawPerformanceGoal> = {}): RawPerformanceGoal => ({
  id: 'goal-1',
  employeeId: 'employee-1',
  title: 'Goal',
  progressPercent: 0,
  status: 'ON_TRACK',
  startDate: '2026-01-01T00:00:00.000Z',
  dueDate: '2026-12-31T00:00:00.000Z',
  ...overrides
})

const buildFeedback = (overrides: Partial<RawFeedback> = {}): RawFeedback => ({
  id: 'feedback-1',
  employeeId: 'employee-1',
  feedback: 'Feedback',
  feedbackDate: '2026-04-01T00:00:00.000Z',
  senderEmployeeId: 'manager-1',
  ...overrides
})

describe('flightRiskCalculations', () => {
  beforeEach(() => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2026-04-15T12:00:00.000Z'))
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('calculates tenure months using the current date, not only month boundaries', () => {
    expect(calculateTenureMonths('2026-01-15T00:00:00.000Z')).toBe(3)
    expect(calculateTenureMonths('2026-01-16T00:00:00.000Z')).toBe(2)
  })

  it('returns the correct tenure description for each score band', () => {
    expect(getTenureRiskDescription(2)).toBe('Too new, not enough signal')
    expect(getTenureRiskDescription(4)).toBe('Probation period')
    expect(getTenureRiskDescription(8)).toBe('First year adjustment')
    expect(getTenureRiskDescription(14)).toBe('Peak risk starts')
    expect(getTenureRiskDescription(24)).toBe('Peak turnover zone (18-30 months)')
    expect(getTenureRiskDescription(36)).toBe('Declining risk')
    expect(getTenureRiskDescription(54)).toBe('Established')
    expect(getTenureRiskDescription(72)).toBe('Long-tenured, low risk')
  })

  it('includes progress risk and status risk in the performance score', () => {
    const goals = [
      buildGoal({ id: 'goal-1', progressPercent: 80, status: 'ON_TRACK' }),
      buildGoal({ id: 'goal-2', progressPercent: 60, status: 'BEHIND_TARGET' })
    ]

    expect(calculatePerformanceRiskScore(goals)).toBe(38)
    expect(getPerformanceRiskDescription(goals)).toContain('Progress risk 30%')
    expect(getPerformanceRiskDescription(goals)).toContain('status risk 50%')
  })

  it('uses tenure when no manager feedback exists', () => {
    expect(calculateEngagementRiskScore([], [], 4)).toBe(20)
    expect(calculateEngagementRiskScore([], [], 8)).toBe(80)
    expect(getEngagementRiskDescription([], [], 4)).toBe('New employee, still within the initial feedback window')
    expect(getEngagementRiskDescription([], [], 8)).toBe('No manager feedback recorded after 6+ months tenure')
  })

  it('lists all matched compensation factors in the description', () => {
    const salaryHistory = [
      {
        effectiveDate: '2025-02-15T00:00:00.000Z',
        newAmount: 92500,
        previousAmount: 90000,
        changePercent: 2.7777777778
      }
    ]

    expect(calculateCompensationRiskScore(20, salaryHistory, 92500, 100000)).toBe(35)

    const description = getCompensationRiskDescription(20, salaryHistory, 92500, 100000)
    expect(description).toContain('Last raise 14 months ago (+10)')
    expect(description).toContain('Last raise 2.8% is below 3% (+15)')
    expect(description).toContain('Current salary is 93% of same-currency team median (+10)')
  })

  it('uses the tenure fallback description when no salary history exists', () => {
    expect(getCompensationRiskDescription(26, undefined, undefined, undefined)).toContain('24+ months tenure')
  })

  it('keeps engagement timing based on the latest manager feedback', () => {
    const feedbackReceived = [buildFeedback({ id: 'feedback-received-1', senderEmployeeId: 'peer-1' })]
    const managerFeedback = [buildFeedback({ id: 'manager-feedback-1', feedbackDate: '2025-12-01T00:00:00.000Z' })]

    expect(calculateEngagementRiskScore(feedbackReceived, managerFeedback, 18)).toBe(55)
    expect(getEngagementRiskDescription(feedbackReceived, managerFeedback, 18)).toContain(
      'Last manager feedback 4 months ago'
    )
  })
})
