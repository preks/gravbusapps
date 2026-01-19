/**
 * Currency utilities for the Expense Item module
 */
import { Currency } from '../types'
import { PRIORITY_CURRENCIES } from '../context/constants'

/**
 * API Currency type from the backend
 */
export type ApiCurrency = {
  id: string
  code: string
  value: string
  [key: string]: any
}

/**
 * Transforms API currency data to the Currency interface format with proper sorting
 * @param currencyData - Raw currency data from API
 * @returns Formatted and sorted currency list
 */
export const transformCurrencies = (currencyData: ApiCurrency[]): Currency[] => {
  try {
    const sortedCurrencies = Array.from(currencyData).sort((a: ApiCurrency, b: ApiCurrency) => {
      if (a.code < b.code) return -1
      if (a.code > b.code) return 1
      return 0
    })

    const priorityList = sortedCurrencies.filter((currency: ApiCurrency) => PRIORITY_CURRENCIES.includes(currency.code))

    const sortedPriorityList = Array.from(priorityList).sort(
      (a: ApiCurrency, b: ApiCurrency) => PRIORITY_CURRENCIES.indexOf(a.code) - PRIORITY_CURRENCIES.indexOf(b.code)
    )

    const otherCurrencies = sortedCurrencies.filter(
      (currency: ApiCurrency) => !PRIORITY_CURRENCIES.includes(currency.code)
    )
    return [...sortedPriorityList, ...otherCurrencies].map(c => ({
      id: c.id,
      code: c.code,
      name: c.value
    }))
  } catch {
    const sortedCurrencies = [...currencyData].sort((a: ApiCurrency, b: ApiCurrency) => {
      if (a.code < b.code) return -1
      if (a.code > b.code) return 1
      return 0
    })

    const priorityList = sortedCurrencies.filter((currency: ApiCurrency) => PRIORITY_CURRENCIES.includes(currency.code))

    const sortedPriorityList = [...priorityList].sort(
      (a: ApiCurrency, b: ApiCurrency) => PRIORITY_CURRENCIES.indexOf(a.code) - PRIORITY_CURRENCIES.indexOf(b.code)
    )

    const otherCurrencies = sortedCurrencies.filter(
      (currency: ApiCurrency) => !PRIORITY_CURRENCIES.includes(currency.code)
    )

    return [...sortedPriorityList, ...otherCurrencies].map(c => ({
      id: c.id,
      code: c.code,
      name: c.value
    }))
  }
}
