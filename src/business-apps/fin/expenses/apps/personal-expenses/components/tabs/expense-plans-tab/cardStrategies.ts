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

// Helper function to extract destination value from various formats
const extractDestinationValue = (topDestination: string | null | undefined | any): string | null => {
  if (!topDestination || topDestination === 'N/A') {
    return null
  }

  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  if (typeof topDestination === 'object' && topDestination !== null) {
    // Catalog object - prefer id (if UUID), then value, then code
    if ('id' in topDestination) {
      const maybeId = (topDestination as { id?: string })?.id ?? null
      if (maybeId && uuidRegex.test(maybeId)) {
        return maybeId
      }
    }
    if ('value' in topDestination) {
      const value = (topDestination as { value?: string })?.value ?? null
      if (value) return value
    }
    if ('code' in topDestination) {
      const code = (topDestination as { code?: string })?.code ?? null
      if (code) return code
    }
    return null
  }

  if (typeof topDestination === 'string') {
    return topDestination
  }

  return null
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
      // Clear date ranges but keep status filters - destination filter should work with all statuses
      ctx.setStartDateRange(null)
      ctx.setEndDateRange(null)
      if (ctx.setEffectiveDateRange) {
        ctx.setEffectiveDateRange(null)
      }
      ctx.setPlanDateRange(null)

      // Don't clear status filters - let destination filter work with existing status filters
      // This allows users to see plans with the destination regardless of status

      const destinationValue = extractDestinationValue(ctx.topDestination)
      ctx.setDestinationFilter(destinationValue)
    },
    remove: () => {
      ctx.setStartDateRange(null)
      ctx.setEndDateRange(null)
      if (ctx.setEffectiveDateRange) {
        ctx.setEffectiveDateRange(null)
      }
      ctx.setPlanDateRange(null)
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
