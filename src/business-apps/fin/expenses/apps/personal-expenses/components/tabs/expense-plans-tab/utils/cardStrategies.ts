import dayjs from 'dayjs'
import { ExpenseStatus } from '../../../../utils'

export type PlanCardContext = {
  setPlanDateRange: (range: [Date | null, Date | null] | null) => void
  setStartDateRange: (range: [Date | null, Date | null] | null) => void
  setEndDateRange: (range: [Date | null, Date | null] | null) => void
  // New: use effective date instead of plan/start directly
  setEffectiveDateRange?: (range: [Date | null, Date | null] | null) => void
  handleFilterChange: (filterId: string, selected: boolean) => void
  setDestinationFilter: (value: string | null) => void
  topDestination: string | null | undefined | Record<string, unknown> // Can be string or catalog entry object
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

// Helper function to check if a string is a valid UUID
const isValidUUID = (str: string | null | undefined): boolean => {
  if (!str) return false
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
}

// Helper function to extract value from catalog object property
const getCatalogProperty = (obj: Record<string, unknown>, key: string): string | null => {
  if (!(key in obj)) return null
  const value = (obj as Record<string, unknown>)[key]
  return typeof value === 'string' ? value : null
}

// Helper function to extract destination value from catalog object
const extractFromCatalogObject = (obj: Record<string, unknown>): string | null => {
  // Prefer id (if UUID), then value, then code
  const id = getCatalogProperty(obj, 'id')
  if (id && isValidUUID(id)) {
    return id
  }

  const value = getCatalogProperty(obj, 'value')
  if (value) return value

  const code = getCatalogProperty(obj, 'code')
  if (code) return code

  return null
}

// Helper function to extract destination value from various formats
const extractDestinationValue = (
  topDestination: string | null | undefined | Record<string, unknown>
): string | null => {
  if (!topDestination || topDestination === 'N/A') {
    return null
  }

  if (typeof topDestination === 'string') {
    return topDestination
  }

  if (typeof topDestination === 'object' && topDestination !== null) {
    return extractFromCatalogObject(topDestination as Record<string, unknown>)
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

/**
 * Clears filters then re-applies only currency filters.
 * When no currency is selected (showing "All"), applies mostUsedCurrencyRef so the card scope shows a single currency (pill + dropdown).
 */
export const preserveCurrencyAndResetPlans = (
  selectedFilters: string[],
  clearFilters: () => void,
  setFilters: (filters: string[]) => void,
  mostUsedCurrencyRef?: string
) => {
  let currencies = selectedFilters.filter(f => f.startsWith('currency:'))
  if (currencies.length === 0 && mostUsedCurrencyRef) {
    currencies = [`currency:${mostUsedCurrencyRef}`]
  }
  clearFilters()
  if (currencies.length > 0) {
    setFilters(currencies)
  }
}
