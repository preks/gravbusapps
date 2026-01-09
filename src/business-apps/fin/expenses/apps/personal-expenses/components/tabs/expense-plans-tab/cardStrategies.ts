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
      // Clear date ranges but keep status filters - destination filter should work with all statuses
      ctx.setStartDateRange(null)
      ctx.setEndDateRange(null)
      if (ctx.setEffectiveDateRange) {
        ctx.setEffectiveDateRange(null)
      }
      ctx.setPlanDateRange(null)

      // Don't clear status filters - let destination filter work with existing status filters
      // This allows users to see plans with the destination regardless of status

      if (ctx.topDestination && ctx.topDestination !== 'N/A') {
        // Extract identifier from catalog entry object - prefer id, then value, then code
        let destinationValue: string | null = null
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

        if (typeof ctx.topDestination === 'object' && ctx.topDestination !== null) {
          // Catalog object
          // Only prefer `id` when it's a UUID. Some catalog sources expose an `id` that is NOT
          // the database UUID (e.g. a catalog ref), which won't match `travelRegion.value`.
          if ('id' in ctx.topDestination) {
            const maybeId = (ctx.topDestination as { id?: string })?.id ?? null
            if (maybeId && uuidRegex.test(maybeId)) {
              destinationValue = maybeId
            }
          }
          if (!destinationValue && 'value' in ctx.topDestination) {
            destinationValue = (ctx.topDestination as { value?: string })?.value ?? null
          }
          if (!destinationValue && 'code' in ctx.topDestination) {
            destinationValue = (ctx.topDestination as { code?: string })?.code ?? null
          }
        } else if (typeof ctx.topDestination === 'string') {
          // String value - use directly
          destinationValue = ctx.topDestination
        }

        // Only set filter if we have a valid destination value
        if (destinationValue && destinationValue !== 'N/A') {
          ctx.setDestinationFilter(destinationValue)
        } else {
          ctx.setDestinationFilter(null)
        }
      } else {
        ctx.setDestinationFilter(null)
      }
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
