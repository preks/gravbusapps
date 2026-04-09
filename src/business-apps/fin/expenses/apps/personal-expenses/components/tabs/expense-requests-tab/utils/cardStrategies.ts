import dayjs from 'dayjs'
import { EXPENSE_REQUEST_FILTER_STATUSES, LEGACY_EXPENSE_REQUEST_FILTER_IDS } from './expenseRequestFilterConstants'

const ALL_RESETTABLE_REQUEST_STATUSES = [...EXPENSE_REQUEST_FILTER_STATUSES, ...LEGACY_EXPENSE_REQUEST_FILTER_IDS]

/** Dashboard cards that scope “completed” requests by month + terminal statuses. */
const TERMINAL_REQUEST_STATUS_FILTERS = ['PAID', 'CLOSED', 'TRANSFERRED'] as const

export type RequestsCardContext = {
  setRequestDateRange: (range: [Date | null, Date | null] | null) => void
  setStartDateRange: (range: [Date | null, Date | null] | null) => void
  setEndDateRange: (range: [Date | null, Date | null] | null) => void
  setEffectiveDateRange?: (range: [Date | null, Date | null] | null) => void
  handleFilterChange: (filterId: string, selected: boolean) => void
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

function setCurrentMonthRangeOnContext(ctx: RequestsCardContext, range: [Date, Date] | null): void {
  if (ctx.setEffectiveDateRange) {
    ctx.setEffectiveDateRange(range)
  } else {
    ctx.setRequestDateRange(range)
  }
}

function applyMonthScopeAndTerminalStatuses(ctx: RequestsCardContext, active: boolean): void {
  setCurrentMonthRangeOnContext(ctx, active ? currentMonthRange() : null)
  for (const status of TERMINAL_REQUEST_STATUS_FILTERS) {
    ctx.handleFilterChange(status, active)
  }
}

function clearRequestDateDimensions(ctx: RequestsCardContext): void {
  ctx.setRequestDateRange(null)
  ctx.setStartDateRange(null)
  ctx.setEndDateRange(null)
}

export const getRequestCardStrategies = (ctx: RequestsCardContext): Record<string, CardStrategy> => ({
  'total-requests': {
    apply: () => applyMonthScopeAndTerminalStatuses(ctx, true),
    remove: () => applyMonthScopeAndTerminalStatuses(ctx, false)
  },
  'total-amount': {
    apply: () => applyMonthScopeAndTerminalStatuses(ctx, true),
    remove: () => applyMonthScopeAndTerminalStatuses(ctx, false)
  },
  'pending-approval': {
    apply: () => {
      clearRequestDateDimensions(ctx)
      ALL_RESETTABLE_REQUEST_STATUSES.forEach(s => ctx.handleFilterChange(s, false))
      ctx.handleFilterChange('PENDING', true)
    },
    remove: () => {
      ctx.handleFilterChange('PENDING', false)
    }
  },
  reimbursable: {
    apply: () => {
      clearRequestDateDimensions(ctx)
      EXPENSE_REQUEST_FILTER_STATUSES.forEach(s => ctx.handleFilterChange(s, !['PAID', 'TRANSFERRED'].includes(s)))
    },
    remove: () => {
      EXPENSE_REQUEST_FILTER_STATUSES.filter(s => !['PAID', 'TRANSFERRED'].includes(s)).forEach(s =>
        ctx.handleFilterChange(s, false)
      )
    }
  }
})

/**
 * Clears filters then re-applies only currency filters.
 * When no currency is selected (showing "All"), applies mostUsedCurrencyRef so the card scope shows a single currency (pill + dropdown).
 */
export const preserveCurrencyAndReset = (
  selectedFilters: string[],
  clearFilters: () => void,
  addFilter: (filterId: string) => void,
  mostUsedCurrencyRef?: string
) => {
  let currencies = selectedFilters.filter(f => f.startsWith('currency:'))
  if (currencies.length === 0 && mostUsedCurrencyRef) {
    currencies = [`currency:${mostUsedCurrencyRef}`]
  }
  clearFilters()
  currencies.forEach(cf => addFilter(cf))
}
