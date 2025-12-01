import type { Dayjs } from 'dayjs'

export interface CalendarExpenseItem {
  id: string
  title: string
  expenseDate: Dayjs
  endDate?: Dayjs
  totalAmount: number
  currencyCode: string
  status: string
  type: 'expense' | 'plan' | 'request'
}
