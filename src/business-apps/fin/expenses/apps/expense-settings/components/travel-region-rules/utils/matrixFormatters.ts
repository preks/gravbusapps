import dayjs from 'dayjs'

/**
 * Format date string to DD/MM/YYYY
 */
export const formatDate = (dateString?: string): string => {
  if (!dateString) return ''
  return dayjs(dateString).format('DD/MM/YYYY')
}

/**
 * Format date string to DD/MM/YY (short format)
 */
export const formatDateShort = (dateString?: string): string => {
  if (!dateString) return ''
  return dayjs(dateString).format('DD/MM/YY')
}

/**
 * Format amount with 2 decimal places
 */
export const formatAmount = (amount: number): string => {
  return amount.toFixed(2)
}

/**
 * Format period display (from - to)
 */
export const formatPeriod = (activeFrom?: string, activeTo?: string): string => {
  const from = activeFrom ? formatDate(activeFrom) : 'New'
  const to = activeTo ? formatDate(activeTo) : '∞'
  return `${from} - ${to}`
}

/**
 * Format period display (short format for cells)
 */
export const formatPeriodShort = (activeFrom?: string, activeTo?: string): string => {
  const from = activeFrom ? formatDateShort(activeFrom) : 'New'
  const to = activeTo ? formatDateShort(activeTo) : '∞'
  return `${from} - ${to}`
}
