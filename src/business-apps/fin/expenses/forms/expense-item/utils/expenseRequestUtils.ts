/**
 * Expense Request utilities for the Expense Item module
 */
import { getDateFormat } from '../../../../../../common/utils/windowUtils'
import { getExpenseRequestStatusDisplay } from '../../../apps/personal-expenses/utils'
import dayjs from 'dayjs'

/**
 * Formats an expense request item with a formatted date and status information
 * @param item - The expense request item from the API
 * @returns Formatted expense request item with status info, date, and title
 */
export const formatExpenseRequestItem = (item: any) => {
  const formattedDate = dayjs(item.createdAt).format(getDateFormat('date-long'))
  const statusDisplay = item.status ? getExpenseRequestStatusDisplay(item.status) : null
  return {
    id: item.id,
    title: item.title,
    formattedDate,
    status: item.status,
    statusDisplay
  }
}

/**
 * Sorts expense requests by creation date (newest first) and formats them
 * @param expenseRequests - Array of expense request items
 * @returns Sorted and formatted expense request items
 */
export const sortAndFormatExpenseRequests = (expenseRequests: any[]) => {
  // Sort by creation date (newest first)
  const sortedItems = [...expenseRequests].sort(
    (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  // Format each item
  return sortedItems.map(formatExpenseRequestItem)
}

/**
 * Prepares the expense requests list with a "None" option at the beginning
 * @param expenseRequests - Array of expense request items
 * @param noneLabel - Label for the "None" option
 * @returns Complete list with "None" option and formatted expense requests
 */
export const prepareExpenseRequestsList = (expenseRequests: any[], noneLabel: string) => {
  const formattedRequests = sortAndFormatExpenseRequests(expenseRequests)
  return [
    {
      id: '0',
      title: noneLabel
    },
    ...formattedRequests
  ]
}
