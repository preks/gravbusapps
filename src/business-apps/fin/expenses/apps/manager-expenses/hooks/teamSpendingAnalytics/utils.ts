// Utility functions for Team Spending Analytics data processing

import dayjs from 'dayjs'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { normalizeStatus } from '../../constants/expenseStatus'
import type {
  ExpenseItem,
  ExpensePosition,
  ChartData,
  TimeSeriesData,
  StatusBreakdown,
  OrgUnitBreakdown,
  LocationBreakdown
} from './types'

/**
 * Get localized category display name from expense position
 */
export function getCategoryDisplayName(position: ExpensePosition): string {
  const catalog = position.expenseGroup
  const safeLocale = globalThis.window === undefined ? 'en-US' : getCurrentActiveUserLocale()
  const locale = String(safeLocale).toLowerCase()
  const translated = catalog?.translations?.find(t => t?.localeCode?.toLowerCase() === locale)?.value
  const display = translated || catalog?.value
  const codeKey = position.expenseGroupRef || 'Uncategorized'
  return display || codeKey
}

/**
 * Add amount to category map
 */
export function addToCategory(categoryMap: Map<string, number>, category: string, amount: number): void {
  const currentAmount = categoryMap.get(category) || 0
  categoryMap.set(category, currentAmount + amount)
}

/**
 * Process a single expense item for categorization
 */
export function processItemCategory(item: ExpenseItem, categoryMap: Map<string, number>): void {
  if (item.expensePosition && Array.isArray(item.expensePosition)) {
    const positions = item.expensePosition
    if (positions.length > 0) {
      // Divide total amount equally among positions
      const amountPerPosition = (item.totalAmount || 0) / positions.length
      for (const position of positions) {
        const category = getCategoryDisplayName(position)
        addToCategory(categoryMap, category, amountPerPosition)
      }
    } else {
      addToCategory(categoryMap, 'Uncategorized', item.totalAmount || 0)
    }
  } else {
    addToCategory(categoryMap, 'Uncategorized', item.totalAmount || 0)
  }
}

/**
 * Process expense items into category chart data
 */
export function processExpenseItemsByCategory(items: ExpenseItem[]): ChartData[] {
  const categoryMap = new Map<string, number>()
  for (const item of items) {
    processItemCategory(item, categoryMap)
  }

  return Array.from(categoryMap.entries())
    .map(([name, value]) => ({
      name,
      value
    }))
    .sort((a, b) => b.value - a.value) // Sort by value descending
}

/**
 * Process time series data (monthly aggregation)
 * Handles TRIP vs EXPENSES date logic
 */
export function processTimeSeriesData(
  items: any[],
  amountField: string = 'totalAmount',
  dateField: string = 'createdAt'
): TimeSeriesData[] {
  if (!Array.isArray(items)) return []

  const monthMap = new Map<string, number>()

  for (const item of items) {
    // Unified effective date logic for analytics time series:
    // ExpenseItem: EXPENSES → expenseDate; TRIP → expenseRequest.startDate
    let rawDate: string | undefined = item?.[dateField]
    if (item?.expenseRequest?.requestTypeRef === 'ExpenseRequestType:v1:TRIP') {
      rawDate = item?.expenseRequest?.startDate || rawDate
    } else if (item?.expenseDate) {
      rawDate = item.expenseDate
    }
    if (!rawDate) continue
    const date = dayjs(rawDate).format('YYYY-MM')
    const currentAmount = monthMap.get(date) || 0
    const addAmount = Number(item?.[amountField] ?? 0)
    monthMap.set(date, currentAmount + (Number.isNaN(addAmount) ? 0 : addAmount))
  }

  // Sort by date
  return Array.from(monthMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, value]) => ({ date, value }))
}

/**
 * Process data by status
 */
export function processStatusData(items: any[], amountField: string = 'totalAmount'): StatusBreakdown[] {
  if (!Array.isArray(items)) return []

  const statusMap = new Map<string, { count: number; amount: number }>()

  for (const item of items) {
    if (!item) continue
    // Normalize to canonical statuses used in Expenses
    const status = normalizeStatus(item.status)
    const prev = statusMap.get(status) || { count: 0, amount: 0 }
    const addAmount = Number(item?.[amountField] ?? 0)
    statusMap.set(status, {
      count: prev.count + 1,
      amount: prev.amount + (Number.isNaN(addAmount) ? 0 : addAmount)
    })
  }

  return Array.from(statusMap.entries())
    .map(([status, agg]) => ({ status, count: agg.count, amount: agg.amount }))
    .sort((a, b) => b.count - a.count)
}

/**
 * Process data by organizational unit
 */
export function processOrgUnitData(
  items: any[],
  orgUnitMap: Map<string, { count: number; amount: number }>,
  amountField: string = 'totalAmount'
): void {
  if (!Array.isArray(items)) return

  for (const item of items) {
    if (!item) continue

    const employee = item.employee || item.expensePlan?.employee
    if (!employee) continue

    const orgUnit = employee.employeePosition?.organizationalUnit?.name || 'Unknown'
    const current = orgUnitMap.get(orgUnit) || { count: 0, amount: 0 }
    const addAmount = Number(item?.[amountField] ?? 0)
    orgUnitMap.set(orgUnit, {
      count: current.count + 1,
      amount: current.amount + (Number.isNaN(addAmount) ? 0 : addAmount)
    })
  }
}

/**
 * Process data by location
 */
export function processLocationData(
  items: any[],
  locationMap: Map<string, { count: number; amount: number }>,
  amountField: string = 'totalAmount'
): void {
  if (!Array.isArray(items)) return

  for (const item of items) {
    if (!item) continue

    const employee = item.employee || item.expensePlan?.employee
    if (!employee) continue

    const location = employee.employeePosition?.siteLocation?.name || 'Unknown'
    const current = locationMap.get(location) || { count: 0, amount: 0 }
    const addAmount = Number(item?.[amountField] ?? 0)
    locationMap.set(location, {
      count: current.count + 1,
      amount: current.amount + (Number.isNaN(addAmount) ? 0 : addAmount)
    })
  }
}

/**
 * Convert map to org unit breakdown array
 */
export function mapToOrgUnitBreakdown(orgUnitMap: Map<string, { count: number; amount: number }>): OrgUnitBreakdown[] {
  return Array.from(orgUnitMap.entries())
    .map(([orgUnit, agg]) => ({ orgUnit, count: agg.count, amount: agg.amount }))
    .sort((a, b) => b.amount - a.amount)
}

/**
 * Convert map to location breakdown array
 */
export function mapToLocationBreakdown(
  locationMap: Map<string, { count: number; amount: number }>
): LocationBreakdown[] {
  return Array.from(locationMap.entries())
    .map(([location, agg]) => ({ location, count: agg.count, amount: agg.amount }))
    .sort((a, b) => b.amount - a.amount)
}

/**
 * Calculate total amount from items
 */
export function calculateTotalAmount(items: any[], amountField: string = 'totalAmount'): number {
  if (!Array.isArray(items)) return 0
  return items.reduce((sum, item) => {
    const amount = Number(item?.[amountField] ?? 0)
    return sum + (Number.isNaN(amount) ? 0 : amount)
  }, 0)
}

/**
 * Extract currencies from raw data
 */
export function extractAvailableCurrencies(rawData: any): string[] {
  if (!rawData) return []

  const currencyCount = new Map<string, number>()

  const addFromRef = (ref?: string) => {
    if (!ref) return
    const code = ref.split(':').pop()
    if (code) {
      currencyCount.set(code, (currencyCount.get(code) || 0) + 1)
    }
  }

  const collect = <T>(list: T[] | undefined, getRef: (item: T) => string | undefined) => {
    if (!Array.isArray(list)) return
    for (const item of list) addFromRef(getRef(item))
  }

  collect(rawData.expenseItems, (i: any) => i.currencyRef)
  collect(rawData.expenseRequests, (r: any) => r.currencyRef)
  collect(rawData.expensePlans, (p: any) => p.currencyRef)
  collect(rawData.advancePayments, (p: any) => p.currencyRef)

  // Sort by usage count (most used first), then alphabetically
  return Array.from(currencyCount.entries())
    .sort((a, b) => {
      const countDiff = b[1] - a[1] // Most used first
      return countDiff === 0 ? a[0].localeCompare(b[0]) : countDiff
    })
    .map(([currency]) => currency)
}
