/**
 * Calculation utilities for the Expense Item module
 */
import { ExpensePosition } from '../types'

/**
 * Calculates the total amount from all expense positions
 * @param positions - Array of expense positions
 * @returns Total amount as a number
 */
export const calculateTotalAmount = (positions: ExpensePosition[]): number => {
  return positions.reduce((total, position) => total + (Number(position.amount) || 0), 0)
}

/**
 * Formats a number to a currency string with 2 decimal places
 * @param amount - The amount to format
 * @param currencyCode - Optional currency code (e.g., EUR, USD)
 * @returns Formatted currency string
 */
export const formatCurrency = (amount: number, currencyCode?: string): string => {
  const formattedAmount = amount.toFixed(2)
  return currencyCode ? `${formattedAmount} ${currencyCode}` : formattedAmount
}
