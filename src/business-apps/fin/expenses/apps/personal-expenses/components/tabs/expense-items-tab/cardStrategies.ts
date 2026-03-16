import dayjs from 'dayjs'

export type ItemsCardContext = {
  setExpenseDateRange: (range: [Date | null, Date | null] | null) => void
  onStatusFilterChange: (status: string, selected: boolean) => void
}

export type CardStrategy = {
  apply: () => void
  remove: () => void
}

export const getItemsCardStrategies = (ctx: ItemsCardContext): Record<string, CardStrategy> => ({
  'total-expenses': {
    apply: () => {
      const start = dayjs().startOf('month').toDate()
      const end = dayjs().endOf('month').toDate()
      ctx.setExpenseDateRange([start, end])
      ctx.onStatusFilterChange('PAID', true)
      ctx.onStatusFilterChange('CLOSED', true)
    },
    remove: () => {
      ctx.setExpenseDateRange(null)
      ctx.onStatusFilterChange('PAID', false)
      ctx.onStatusFilterChange('CLOSED', false)
    }
  },
  'pending-reimbursement': {
    apply: () => {
      const start = dayjs().startOf('month').toDate()
      const end = dayjs().endOf('month').toDate()
      ctx.setExpenseDateRange([start, end])
      ctx.onStatusFilterChange('PENDING', true)
    },
    remove: () => {
      ctx.setExpenseDateRange(null)
      ctx.onStatusFilterChange('PENDING', false)
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
