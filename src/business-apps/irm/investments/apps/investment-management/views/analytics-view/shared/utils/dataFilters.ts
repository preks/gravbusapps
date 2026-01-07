/**
 * @module shared/utils/dataFilters
 * @description Generic data filtering utilities for analytics views.
 * Provides reusable filtering, grouping, and validation logic across all investment types.
 */

/**
 * @function filterInvestmentsByCurrency
 * @description Filters investments by currency code using a generic approach.
 *
 * @template T - The investment type
 * @param {T[]} investments - Array of investments to filter
 * @param {string} currencyCode - The currency code to filter by
 * @param {(item: T) => string | null | undefined} currencyGetter - Function to extract currency from each investment
 * @returns {T[]} Filtered investments matching the currency
 *
 * @example
 * const investments = [
 *   { id: '1', currencyCode: 'EUR', amount: 1000 },
 *   { id: '2', currencyCode: 'USD', amount: 2000 },
 *   { id: '3', currencyCode: 'EUR', amount: 1500 }
 * ];
 *
 * filterInvestmentsByCurrency(
 *   investments,
 *   'EUR',
 *   inv => inv.currencyCode
 * ) // Returns: [{ id: '1', ... }, { id: '3', ... }]
 */
export function filterInvestmentsByCurrency<T>(
  investments: T[],
  currencyCode: string,
  currencyGetter: (item: T) => string | null | undefined
): T[] {
  return investments.filter(investment => {
    const currency = currencyGetter(investment)
    return currency === currencyCode
  })
}

/**
 * @function hasNonZeroValues
 * @description Checks if an array of data items has any non-zero numeric values.
 * Useful for determining if a chart should display or show an empty state.
 *
 * @template T - The data type
 * @param {T[]} data - Array of data items
 * @param {(item: T) => number} valueGetter - Function to extract the numeric value from each item
 * @returns {boolean} True if at least one value is greater than zero
 *
 * @example
 * const chartData = [
 *   { label: 'A', value: 0 },
 *   { label: 'B', value: 0 },
 *   { label: 'C', value: 100 }
 * ];
 *
 * hasNonZeroValues(chartData, item => item.value) // Returns: true
 *
 * @example
 * const emptyData = [
 *   { label: 'A', value: 0 },
 *   { label: 'B', value: 0 }
 * ];
 *
 * hasNonZeroValues(emptyData, item => item.value) // Returns: false
 */
export function hasNonZeroValues<T>(data: T[], valueGetter: (item: T) => number): boolean {
  return data.some(item => {
    const value = valueGetter(item)
    return value > 0
  })
}

/**
 * @function shouldShowEmptyState
 * @description Determines if an empty state should be shown based on data availability and values.
 * Checks both if data array is empty and if all values are zero.
 *
 * @template T - The data type
 * @param {T[]} data - Array of data items
 * @param {(item: T) => number} valueGetter - Function to extract the numeric value from each item
 * @returns {boolean} True if empty state should be shown
 *
 * @example
 * shouldShowEmptyState([], item => item.value) // Returns: true (no data)
 * shouldShowEmptyState([{ value: 0 }], item => item.value) // Returns: true (all zero)
 * shouldShowEmptyState([{ value: 100 }], item => item.value) // Returns: false (has data)
 */
export function shouldShowEmptyState<T>(data: T[], valueGetter: (item: T) => number): boolean {
  if (data.length === 0) return true
  return !hasNonZeroValues(data, valueGetter)
}

/**
 * @function groupInvestmentsByField
 * @description Groups investments by a specified field and optionally aggregates a numeric value.
 *
 * @template T - The investment type
 * @template K - The key type for grouping
 * @param {T[]} investments - Array of investments to group
 * @param {(item: T) => K} keyGetter - Function to extract the grouping key
 * @param {object} [options] - Optional aggregation options
 * @param {(item: T) => number} [options.valueGetter] - Function to extract numeric value for aggregation
 * @param {'sum' | 'average' | 'count'} [options.aggregation='count'] - Type of aggregation
 * @returns {Map<K, { items: T[], value: number }>} Map of grouped data with aggregated values
 *
 * @example
 * const investments = [
 *   { type: 'Equity', amount: 1000 },
 *   { type: 'Debt', amount: 2000 },
 *   { type: 'Equity', amount: 1500 }
 * ];
 *
 * groupInvestmentsByField(
 *   investments,
 *   inv => inv.type,
 *   { valueGetter: inv => inv.amount, aggregation: 'sum' }
 * )
 * // Returns: Map {
 * //   'Equity' => { items: [...], value: 2500 },
 * //   'Debt' => { items: [...], value: 2000 }
 * // }
 */
export function groupInvestmentsByField<T, K>(
  investments: T[],
  keyGetter: (item: T) => K,
  options?: {
    valueGetter?: (item: T) => number
    aggregation?: 'sum' | 'average' | 'count'
  }
): Map<K, { items: T[]; value: number }> {
  const { valueGetter, aggregation = 'count' } = options || {}
  const groups = new Map<K, { items: T[]; value: number }>()

  for (const investment of investments) {
    const key = keyGetter(investment)
    const existing = groups.get(key)

    if (existing) {
      existing.items.push(investment)
    } else {
      groups.set(key, {
        items: [investment],
        value: 0
      })
    }
  }

  // Calculate aggregated values
  for (const [, groupData] of groups) {
    switch (aggregation) {
      case 'count':
        groupData.value = groupData.items.length
        break
      case 'sum':
        if (valueGetter) {
          groupData.value = groupData.items.reduce((sum: number, item: T) => sum + valueGetter(item), 0)
        }
        break
      case 'average':
        if (valueGetter && groupData.items.length > 0) {
          const sum = groupData.items.reduce((acc: number, item: T) => acc + valueGetter(item), 0)
          groupData.value = sum / groupData.items.length
        }
        break
    }
  }

  return groups
}

/**
 * @function filterByDateRange
 * @description Filters investments by a date range.
 *
 * @template T - The investment type
 * @param {T[]} investments - Array of investments to filter
 * @param {(item: T) => string | Date | null} dateGetter - Function to extract date from each investment
 * @param {string | Date} startDate - The start date of the range
 * @param {string | Date} endDate - The end date of the range
 * @returns {T[]} Filtered investments within the date range
 *
 * @example
 * const investments = [
 *   { id: '1', date: '2023-01-15', amount: 1000 },
 *   { id: '2', date: '2023-06-20', amount: 2000 },
 *   { id: '3', date: '2024-01-10', amount: 1500 }
 * ];
 *
 * filterByDateRange(
 *   investments,
 *   inv => inv.date,
 *   '2023-01-01',
 *   '2023-12-31'
 * ) // Returns: [{ id: '1', ... }, { id: '2', ... }]
 */
export function filterByDateRange<T>(
  investments: T[],
  dateGetter: (item: T) => string | Date | null,
  startDate: string | Date,
  endDate: string | Date
): T[] {
  const start = new Date(startDate)
  const end = new Date(endDate)

  return investments.filter(investment => {
    const dateValue = dateGetter(investment)
    if (!dateValue) return false

    const date = new Date(dateValue)
    return date >= start && date <= end
  })
}

// Helper function to compare values by type
function compareValues(valueA: any, valueB: any, direction: 'asc' | 'desc'): number {
  if (typeof valueA === 'string' && typeof valueB === 'string') {
    return direction === 'asc' ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA)
  }

  if (typeof valueA === 'number' && typeof valueB === 'number') {
    return direction === 'asc' ? valueA - valueB : valueB - valueA
  }

  return 0
}

/**
 * @function sortInvestments
 * @description Sorts investments by a specified field and direction.
 *
 * @template T - The investment type
 * @param {T[]} investments - Array of investments to sort
 * @param {(item: T) => any} sortGetter - Function to extract the value to sort by
 * @param {'asc' | 'desc'} [direction='asc'] - Sort direction
 * @returns {T[]} Sorted investments
 *
 * @example
 * const investments = [
 *   { name: 'B', amount: 2000 },
 *   { name: 'A', amount: 1000 },
 *   { name: 'C', amount: 1500 }
 * ];
 *
 * sortInvestments(investments, inv => inv.amount, 'desc')
 * // Returns: [{ name: 'B', ... }, { name: 'C', ... }, { name: 'A', ... }]
 */
export function sortInvestments<T>(
  investments: T[],
  sortGetter: (item: T) => any,
  direction: 'asc' | 'desc' = 'asc'
): T[] {
  return [...investments].sort((a, b) => {
    const valueA = sortGetter(a)
    const valueB = sortGetter(b)

    if (valueA == null && valueB == null) return 0
    if (valueA == null) return direction === 'asc' ? 1 : -1
    if (valueB == null) return direction === 'asc' ? -1 : 1

    return compareValues(valueA, valueB, direction)
  })
}

/**
 * @function getTopItems
 * @description Gets the top N items from an array based on a value.
 *
 * @template T - The item type
 * @param {T[]} items - Array of items
 * @param {(item: T) => number} valueGetter - Function to extract the numeric value
 * @param {number} [count=10] - Number of top items to return
 * @returns {T[]} Top N items sorted by value descending
 *
 * @example
 * const data = [
 *   { name: 'A', value: 100 },
 *   { name: 'B', value: 500 },
 *   { name: 'C', value: 300 }
 * ];
 *
 * getTopItems(data, item => item.value, 2)
 * // Returns: [{ name: 'B', ... }, { name: 'C', ... }]
 */
export function getTopItems<T>(items: T[], valueGetter: (item: T) => number, count: number = 10): T[] {
  return sortInvestments(items, valueGetter, 'desc').slice(0, count)
}

/**
 * @function deduplicateInvestments
 * @description Removes duplicate investments based on a key field.
 *
 * @template T - The investment type
 * @param {T[]} investments - Array of investments
 * @param {(item: T) => any} keyGetter - Function to extract the unique key
 * @returns {T[]} Deduplicated investments (first occurrence kept)
 *
 * @example
 * const investments = [
 *   { id: '1', name: 'Investment A' },
 *   { id: '2', name: 'Investment B' },
 *   { id: '1', name: 'Investment A Duplicate' }
 * ];
 *
 * deduplicateInvestments(investments, inv => inv.id)
 * // Returns: [{ id: '1', name: 'Investment A' }, { id: '2', name: 'Investment B' }]
 */
export function deduplicateInvestments<T>(investments: T[], keyGetter: (item: T) => any): T[] {
  const seen = new Set()
  return investments.filter(investment => {
    const key = keyGetter(investment)
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}
