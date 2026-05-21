import type { ExpenseRecordI18nPrefix } from '../types/expenseRecordShared.types'

export const expenseRecordKey = (prefix: ExpenseRecordI18nPrefix, suffix: string): string => `${prefix}-${suffix}`

export const expenseStatusTranslationKey = (status: string): string =>
  `expense-status-${status.toLowerCase().replace(/_/g, '-')}`
