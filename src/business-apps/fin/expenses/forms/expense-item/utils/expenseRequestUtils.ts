/**
 * Expense Request utilities for the Expense Item module
 */
import { getDateFormat } from "../../../../../../common/utils/windowUtils";
import dayjs from 'dayjs'
/**
 * Formats an expense request item with a formatted date in the title
 * @param item - The expense request item from the API
 * @returns Formatted expense request item with date in title
 */
export const formatExpenseRequestItem = (item: any) => {
  const formattedDate = dayjs(item.createdAt).format(getDateFormat('date-long'));
  return {
    id: item.id,
    title: `${formattedDate} - ${item.title}`,
  };
};

/**
 * Sorts expense requests by creation date (newest first) and formats them
 * @param expenseRequests - Array of expense request items
 * @returns Sorted and formatted expense request items
 */
export const sortAndFormatExpenseRequests = (expenseRequests: any[]) => {
  // Sort by creation date (newest first)
  const sortedItems = [...expenseRequests].sort(
    (a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  
  // Format each item
  return sortedItems.map(formatExpenseRequestItem);
};

/**
 * Prepares the expense requests list with a "None" option at the beginning
 * @param expenseRequests - Array of expense request items
 * @param noneLabel - Label for the "None" option
 * @returns Complete list with "None" option and formatted expense requests
 */
export const prepareExpenseRequestsList = (expenseRequests: any[], noneLabel: string) => {
  const formattedRequests = sortAndFormatExpenseRequests(expenseRequests);
  return [
    {
      id: "0",
      title: noneLabel,
    },
    ...formattedRequests
  ];
};
