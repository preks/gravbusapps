import {
  selectReportingWorkingCondition,
  selectReportingWorkingConditionsByEmployee
} from './workingConditionSelection'

describe('workingConditionSelection', () => {
  it('uses a single working condition as legacy data', () => {
    const workingCondition = {
      employeeId: 'employee-1',
      activeFrom: null,
      activeTo: null
    }

    expect(selectReportingWorkingCondition([workingCondition], '2026-05-25')).toBe(workingCondition)
  })

  it('selects the working condition active on the reporting date', () => {
    const previousWorkingCondition = {
      employeeId: 'employee-1',
      activeFrom: '2025-01-01',
      activeTo: '2026-05-20'
    }
    const activeWorkingCondition = {
      employeeId: 'employee-1',
      activeFrom: '2026-05-21',
      activeTo: null
    }

    expect(selectReportingWorkingCondition([previousWorkingCondition, activeWorkingCondition], '2026-05-25')).toBe(
      activeWorkingCondition
    )
  })

  it('excludes employees with multiple entries but no active working condition today', () => {
    const workingConditions = [
      {
        employeeId: 'employee-1',
        activeFrom: '2025-01-01',
        activeTo: '2025-12-31'
      },
      {
        employeeId: 'employee-1',
        activeFrom: '2026-01-01',
        activeTo: '2026-04-30'
      },
      {
        employeeId: 'employee-2',
        activeFrom: '2026-01-01',
        activeTo: null
      }
    ]

    expect(selectReportingWorkingConditionsByEmployee(workingConditions, '2026-05-25')).toEqual([workingConditions[2]])
  })
})
