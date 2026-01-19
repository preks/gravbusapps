import dayjs, { Dayjs } from 'dayjs'

export type DashboardPeriod = 'monthly' | 'quarterly' | 'yearly'

export interface PeriodRange {
  start: Dayjs
  end: Dayjs
}

export const buildPeriodRange = (now: Dayjs, period: DashboardPeriod): PeriodRange => {
  const start =
    period === 'yearly' ? now.startOf('year') : period === 'quarterly' ? now.startOf('quarter') : now.startOf('month')
  const end =
    period === 'yearly' ? now.endOf('year') : period === 'quarterly' ? now.endOf('quarter') : now.endOf('month')
  return { start, end }
}

export const toIso = (d: Dayjs): string => d.toISOString()

export const buildDashboardVariables = (
  employeeId: string,
  currency: string,
  nowInput?: Dayjs,
  period: DashboardPeriod = 'monthly'
) => {
  const now = nowInput ?? dayjs()
  const { start: periodStart, end: periodEnd } = buildPeriodRange(now, period)

  return {
    employeeId,
    currency,
    currentDate: toIso(now),
    currentMonthStart: toIso(periodStart),
    currentMonthEnd: toIso(periodEnd),
    previousMonthStart: toIso(now.subtract(1, 'month').startOf('month')),
    previousMonthEnd: toIso(now.subtract(1, 'month').endOf('month')),
    currentQuarterStart: toIso(now.startOf('quarter')),
    currentQuarterEnd: toIso(now.endOf('quarter')),
    previousQuarterStart: toIso(now.subtract(1, 'quarter').startOf('quarter')),
    previousQuarterEnd: toIso(now.subtract(1, 'quarter').endOf('quarter')),
    currentYearStart: toIso(now.startOf('year')),
    currentYearEnd: toIso(now.endOf('year')),
    previousYearStart: toIso(now.subtract(1, 'year').startOf('year')),
    previousYearEnd: toIso(now.subtract(1, 'year').endOf('year')),
    currentMonthStartTz: toIso(now.startOf('month')),
    currentMonthEndTz: toIso(now.endOf('month')),
    currentQuarterStartTz: toIso(now.startOf('quarter')),
    currentQuarterEndTz: toIso(now.endOf('quarter')),
    currentYearStartTz: toIso(now.startOf('year')),
    currentYearEndTz: toIso(now.endOf('year'))
  } as const
}
