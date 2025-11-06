import dayjs from 'dayjs'
import { ExpenseStatus } from '../../../utils'

export type PlanCardContext = {
  setPlanDateRange: (range: [Date | null, Date | null] | null) => void
  setStartDateRange: (range: [Date | null, Date | null] | null) => void
  setEndDateRange: (range: [Date | null, Date | null] | null) => void
  // New: use effective date instead of plan/start directly
  setEffectiveDateRange?: (range: [Date | null, Date | null] | null) => void
  handleFilterChange: (filterId: string, selected: boolean) => void
  setDestinationFilter: (value: string | null) => void
  topDestination: string | null | undefined | any // Can be string or catalog entry object
}

export type CardStrategy = {
  apply: () => void
  remove: () => void
}

const currentMonthRange = (): [Date, Date] => {
  const start = dayjs().startOf('month').toDate()
  const end = dayjs().endOf('month').toDate()
  return [start, end]
}

export const getPlanCardStrategies = (ctx: PlanCardContext): Record<string, CardStrategy> => ({
  'total-plans': {
    apply: () => {
      // Prefer effective date (TRIP -> startDate, EXPENSES -> planDate)
      if (ctx.setEffectiveDateRange) {
        ctx.setEffectiveDateRange(currentMonthRange())
      } else {
        ctx.setPlanDateRange(currentMonthRange())
      }
      ctx.handleFilterChange(ExpenseStatus.CLOSED, true)
      ctx.handleFilterChange(ExpenseStatus.PAID, true)
    },
    remove: () => {
      if (ctx.setEffectiveDateRange) {
        ctx.setEffectiveDateRange(null)
      } else {
        ctx.setPlanDateRange(null)
      }
      ctx.handleFilterChange(ExpenseStatus.CLOSED, false)
      ctx.handleFilterChange(ExpenseStatus.PAID, false)
    }
  },
  'total-estimated': {
    apply: () => {
      if (ctx.setEffectiveDateRange) {
        ctx.setEffectiveDateRange(currentMonthRange())
      } else {
        ctx.setPlanDateRange(currentMonthRange())
      }
      const statuses = [
        ExpenseStatus.PREPARED,
        ExpenseStatus.ASSIGNED,
        ExpenseStatus.PENDING,
        ExpenseStatus.APPROVED,
        ExpenseStatus.REJECTED,
        ExpenseStatus.VERIFIED,
        ExpenseStatus.BOOKED,
        ExpenseStatus.TRANSFERRED
      ]
      statuses.forEach(s => ctx.handleFilterChange(s, true))
    },
    remove: () => {
      if (ctx.setEffectiveDateRange) {
        ctx.setEffectiveDateRange(null)
      } else {
        ctx.setPlanDateRange(null)
      }
      const statuses = [
        ExpenseStatus.PREPARED,
        ExpenseStatus.ASSIGNED,
        ExpenseStatus.PENDING,
        ExpenseStatus.APPROVED,
        ExpenseStatus.REJECTED,
        ExpenseStatus.VERIFIED,
        ExpenseStatus.BOOKED,
        ExpenseStatus.TRANSFERRED
      ]
      statuses.forEach(s => ctx.handleFilterChange(s, false))
    }
  },
  'pending-approval': {
    apply: () => {
      // Clear all date ranges for a pure status filter
      ctx.setStartDateRange(null)
      ctx.setEndDateRange(null)
      if (ctx.setEffectiveDateRange) {
        ctx.setEffectiveDateRange(null)
      }
      ctx.setPlanDateRange(null)

      // Generalized: clear all known statuses then select only PENDING
      const allStatuses = [
        ExpenseStatus.PREPARED,
        ExpenseStatus.CREATED,
        ExpenseStatus.ASSIGNED,
        ExpenseStatus.PENDING,
        ExpenseStatus.APPROVED,
        ExpenseStatus.REJECTED,
        ExpenseStatus.VERIFIED,
        ExpenseStatus.BOOKED,
        ExpenseStatus.CLOSED,
        ExpenseStatus.PAID,
        ExpenseStatus.TRANSFERRED
      ]
      allStatuses.forEach(s => ctx.handleFilterChange(s, false))
      ctx.handleFilterChange(ExpenseStatus.PENDING, true)
    },
    remove: () => {
      ctx.handleFilterChange(ExpenseStatus.PENDING, false)
    }
  },
  'top-destinations': {
    apply: () => {
      ctx.setStartDateRange(null)
      ctx.setEndDateRange(null)
      const statuses = [
        ExpenseStatus.PREPARED,
        ExpenseStatus.ASSIGNED,
        ExpenseStatus.PENDING,
        ExpenseStatus.APPROVED,
        ExpenseStatus.REJECTED,
        ExpenseStatus.VERIFIED,
        ExpenseStatus.BOOKED,
        ExpenseStatus.CLOSED,
        ExpenseStatus.TRANSFERRED
      ]
      statuses.forEach(s => ctx.handleFilterChange(s, false))
      if (ctx.topDestination && ctx.topDestination !== 'N/A') {
        // Extract value if it's a catalog entry object (for translation), otherwise use string directly
        const destinationValue =
          typeof ctx.topDestination === 'object' && ctx.topDestination !== null && 'value' in ctx.topDestination
            ? ((ctx.topDestination as { value?: string })?.value ?? null)
            : typeof ctx.topDestination === 'string'
              ? ctx.topDestination
              : null
        ctx.setDestinationFilter(destinationValue || null)
      } else {
        ctx.setDestinationFilter(null)
      }
    },
    remove: () => {
      ctx.setStartDateRange(null)
      ctx.setEndDateRange(null)
      ctx.setDestinationFilter(null)
    }
  }
})

export const preserveCurrencyAndResetPlans = (
  selectedFilters: string[],
  clearFilters: () => void,
  setFilters: (filters: string[]) => void
) => {
  const currencies = selectedFilters.filter(f => f.startsWith('currency:'))
  clearFilters()
  if (currencies.length > 0) {
    setFilters(currencies)
  }
}
