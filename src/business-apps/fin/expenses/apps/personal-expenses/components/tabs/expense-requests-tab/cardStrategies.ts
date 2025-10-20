import dayjs from 'dayjs'

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
      const statuses = [
        'PREPARED',
        'CREATED',
        'ASSIGNED',
        'PENDING',
        'APPROVED',
        'REJECTED',
        'VERIFIED',
        'BOOKED',
        'PAID',
        'CLOSED',
        'TRANSFERRED'
      ]
      statuses.forEach(s => ctx.handleFilterChange(s, false))
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
      const statuses = [
        'PREPARED',
        'CREATED',
        'ASSIGNED',
        'PENDING',
        'APPROVED',
        'REJECTED',
        'VERIFIED',
        'BOOKED',
        'PAID',
        'CLOSED',
        'TRANSFERRED'
      ]
      statuses.forEach(s => ctx.handleFilterChange(s, !['PAID', 'CLOSED', 'TRANSFERRED'].includes(s)))
    },
    remove: () => {
      const statuses = ['PREPARED', 'CREATED', 'ASSIGNED', 'PENDING', 'APPROVED', 'REJECTED', 'VERIFIED', 'BOOKED']
      statuses.forEach(s => ctx.handleFilterChange(s, false))
    }
  }
})

export const preserveCurrencyAndReset = (
  selectedFilters: string[],
  clearFilters: () => void,
  addFilter: (filterId: string) => void
) => {
  const currencies = selectedFilters.filter(f => f.startsWith('currency:'))
  clearFilters()
  currencies.forEach(cf => addFilter(cf))
}
