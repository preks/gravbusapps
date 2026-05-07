import dayjs from 'dayjs'
import type { CalendarExpenseItem } from '../types'
import type { ExpenseItem } from '../../../../hooks/useGetExpenseItems'
import type { ExpensePlan } from '../../../../hooks/useGetExpensePlans'
import type { ExpenseRequest } from '../../../../hooks/useGetExpenseRequests'

const extractCurrency = (code?: string | null): string => {
  if (!code) return 'EUR'
  const parts = String(code).split(':')
  const last = parts[parts.length - 1]
  return last || 'EUR'
}

export const toCalendarItemFromExpense = (item: ExpenseItem, unknownStatusLabel: string): CalendarExpenseItem => ({
  id: item.id,
  title: item.title,
  expenseDate: dayjs(item.expenseDate),
  totalAmount: item.totalAmount,
  currencyCode: extractCurrency(item.currency?.code),
  status: item.status || unknownStatusLabel,
  type: 'expense'
})

export const toCalendarItemFromPlan = (plan: ExpensePlan, unknownStatusLabel: string): CalendarExpenseItem | null => {
  if (plan.startDate && plan.endDate) {
    return {
      id: plan.id,
      title: plan.title,
      expenseDate: dayjs(plan.startDate),
      endDate: dayjs(plan.endDate),
      totalAmount: plan.totalAmount,
      currencyCode: extractCurrency(plan.currency?.code),
      status: plan.status || unknownStatusLabel,
      type: 'plan'
    }
  }
  if (plan.planDate) {
    return {
      id: plan.id,
      title: plan.title,
      expenseDate: dayjs(plan.planDate),
      totalAmount: plan.totalAmount,
      currencyCode: extractCurrency(plan.currency?.code),
      status: plan.status || unknownStatusLabel,
      type: 'plan'
    }
  }
  return null
}

export const toCalendarItemFromRequest = (
  request: ExpenseRequest,
  unknownStatusLabel: string
): CalendarExpenseItem | null => {
  if (request.startDate && request.endDate) {
    return {
      id: request.id,
      title: request.title,
      expenseDate: dayjs(request.startDate),
      endDate: dayjs(request.endDate),
      totalAmount: request.totalAmount,
      currencyCode: extractCurrency(request.currency?.code),
      status: request.status || unknownStatusLabel,
      type: 'request'
    }
  }
  if (request.requestDate) {
    return {
      id: request.id,
      title: request.title,
      expenseDate: dayjs(request.requestDate),
      totalAmount: request.totalAmount,
      currencyCode: extractCurrency(request.currency?.code),
      status: request.status || unknownStatusLabel,
      type: 'request'
    }
  }
  return null
}
