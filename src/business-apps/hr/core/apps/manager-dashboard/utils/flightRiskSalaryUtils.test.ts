import type { RawSalaryRecord } from '../types/flightRisk.types'
import {
  calculateTeamMedianSalaryByCurrency,
  groupSalaryDataByEmployee,
  processSalaryChanges
} from './flightRiskSalaryUtils'

const buildSalaryRecord = (overrides: Partial<RawSalaryRecord> = {}): RawSalaryRecord => ({
  id: 'salary-1',
  employeeId: 'employee-1',
  annualGrossSalary: 100000,
  monthlyGrossSalary: null,
  hourlyGrossSalary: null,
  currency: {
    id: 'currency-1',
    code: 'USD',
    value: 'USD'
  },
  currencyRef: 'currency-1',
  startDate: '2026-01-01',
  endDate: null,
  requestedPercent: null,
  requestedAmount: null,
  salaryAdjustReasonRef: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides
})

describe('flightRiskSalaryUtils', () => {
  const today = new Date('2026-04-15T12:00:00.000Z')

  it('calculates team median separately for each currency', () => {
    const records = [
      buildSalaryRecord({ id: 'usd-1', employeeId: 'employee-usd-1', annualGrossSalary: 100000 }),
      buildSalaryRecord({ id: 'usd-2', employeeId: 'employee-usd-2', annualGrossSalary: 120000 }),
      buildSalaryRecord({
        id: 'eur-1',
        employeeId: 'employee-eur-1',
        annualGrossSalary: 90000,
        currency: { id: 'currency-2', code: 'EUR', value: 'EUR' },
        currencyRef: 'currency-2'
      }),
      buildSalaryRecord({
        id: 'eur-2',
        employeeId: 'employee-eur-2',
        annualGrossSalary: 110000,
        currency: { id: 'currency-2', code: 'EUR', value: 'EUR' },
        currencyRef: 'currency-2'
      })
    ]

    const medians = calculateTeamMedianSalaryByCurrency(records, today)

    expect(medians.get('USD')).toBe(110000)
    expect(medians.get('EUR')).toBe(100000)
  })

  it('assigns each employee the median for their own salary currency only', () => {
    const records = [
      buildSalaryRecord({ id: 'usd-1', employeeId: 'employee-usd-1', annualGrossSalary: 100000 }),
      buildSalaryRecord({ id: 'usd-2', employeeId: 'employee-usd-2', annualGrossSalary: 120000 }),
      buildSalaryRecord({
        id: 'eur-1',
        employeeId: 'employee-eur-1',
        annualGrossSalary: 90000,
        currency: { id: 'currency-2', code: 'EUR', value: 'EUR' },
        currencyRef: 'currency-2'
      }),
      buildSalaryRecord({
        id: 'eur-2',
        employeeId: 'employee-eur-2',
        annualGrossSalary: 110000,
        currency: { id: 'currency-2', code: 'EUR', value: 'EUR' },
        currencyRef: 'currency-2'
      })
    ]

    const salaryData = groupSalaryDataByEmployee(records, today, calculateTeamMedianSalaryByCurrency(records, today))

    expect(salaryData.get('employee-usd-1')?.teamMedianSalary).toBe(110000)
    expect(salaryData.get('employee-eur-1')?.teamMedianSalary).toBe(100000)
  })

  it('does not compare salary changes across different currencies', () => {
    const salaryChanges = processSalaryChanges([
      buildSalaryRecord({
        id: 'newest-usd',
        annualGrossSalary: 120000,
        currency: { id: 'currency-1', code: 'USD', value: 'USD' },
        startDate: '2026-01-01'
      }),
      buildSalaryRecord({
        id: 'older-eur',
        annualGrossSalary: 100000,
        currency: { id: 'currency-2', code: 'EUR', value: 'EUR' },
        currencyRef: 'currency-2',
        startDate: '2025-01-01'
      })
    ])

    expect(salaryChanges[0].previousAmount).toBeNull()
    expect(salaryChanges[0].changePercent).toBeNull()
  })
})
