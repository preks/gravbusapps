import dayjs from 'dayjs'
import {
  EXPENSE_REQUEST_FILTER_STATUSES,
  LEGACY_EXPENSE_REQUEST_FILTER_IDS
} from '../../../../hooks/useExpenseRequestFilters'

const ALL_RESETTABLE_REQUEST_STATUSES = [...EXPENSE_REQUEST_FILTER_STATUSES, ...LEGACY_EXPENSE_REQUEST_FILTER_IDS]

export type RequestsCardContext = {
  setRequestDateRange: (range: [Date | null, Date | null] | null) => void
  setStartDateRange: (range: [Date | null, Date | null] | null) => void
  setEndDateRange: (range: [Date | null, Date | null] | null) => void
  // New: use effective date instead of request/start directly
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

export const getRequestCardStrategies = (ctx: RequestsCardContext): Record<string, CardStrategy> => ({
  'total-requests': {
    apply: () => {
      if (ctx.setEffectiveDateRange) {
        ctx.setEffectiveDateRange(currentMonthRange())
      } else {
        ctx.setRequestDateRange(currentMonthRange())
      }
      ctx.handleFilterChange('PAID', true)
      ctx.handleFilterChange('CLOSED', true)
      ctx.handleFilterChange('TRANSFERRED', true)
    },
    remove: () => {
      if (ctx.setEffectiveDateRange) {
        ctx.setEffectiveDateRange(null)
      } else {
        ctx.setRequestDateRange(null)
      }
      ctx.handleFilterChange('PAID', false)
      ctx.handleFilterChange('CLOSED', false)
      ctx.handleFilterChange('TRANSFERRED', false)
    }
  },
  'total-amount': {
    apply: () => {
      if (ctx.setEffectiveDateRange) {
        ctx.setEffectiveDateRange(currentMonthRange())
      } else {
        ctx.setRequestDateRange(currentMonthRange())
      }
      ctx.handleFilterChange('PAID', true)
      ctx.handleFilterChange('CLOSED', true)
      ctx.handleFilterChange('TRANSFERRED', true)
    },
    remove: () => {
      if (ctx.setEffectiveDateRange) {
        ctx.setEffectiveDateRange(null)
      } else {
        ctx.setRequestDateRange(null)
      }
      ctx.handleFilterChange('PAID', false)
      ctx.handleFilterChange('CLOSED', false)
      ctx.handleFilterChange('TRANSFERRED', false)
    }
  },
  'pending-approval': {
    apply: () => {
      ctx.setRequestDateRange(null)
      ctx.setStartDateRange(null)
      ctx.setEndDateRange(null)
      ALL_RESETTABLE_REQUEST_STATUSES.forEach(s => ctx.handleFilterChange(s, false))
      ctx.handleFilterChange('PENDING', true)
    },
    remove: () => {
      ctx.handleFilterChange('PENDING', false)
    }
  },
  reimbursable: {
    apply: () => {
      ctx.setRequestDateRange(null)
      ctx.setStartDateRange(null)
      ctx.setEndDateRange(null)
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
