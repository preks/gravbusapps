import dayjs from 'dayjs'
import { formatAmount } from '@/common/utils/numberFormatter'
import type { EquityInvestmentSummary } from '../../../shared/types'

export interface DistributionData {
  type: string
  count: number
  totalAmount?: number
  percentage?: number
  minValue?: number
  maxValue?: number
  sortOrder?: number
}

/**
 * Filter investments by currency and compute distribution data by a specific field
 */
export const computeDistributionByField = (
  investments: EquityInvestmentSummary[],
  currency: string,
  getField: (inv: EquityInvestmentSummary) => string
): DistributionData[] => {
  return investments
    .filter(inv => inv.currencyCode === currency)
    .reduce((acc: DistributionData[], equity: EquityInvestmentSummary) => {
      const fieldValue = getField(equity)

      const existing = acc.find(item => item.type === fieldValue)
      if (existing) {
        existing.count += 1
        existing.totalAmount = (existing.totalAmount || 0) + (equity.investment.totalInvestmentAmount || 0)
      } else {
        acc.push({
          type: fieldValue,
          count: 1,
          totalAmount: equity.investment.totalInvestmentAmount || 0
        })
      }

      return acc
    }, [])
}

/**
 * Helper function to format duration
 */
export const formatDuration = (years: number): string => {
  if (years >= 1) {
    return `${Math.floor(years)}y`
  } else {
    const months = Math.floor(years * 12)
    return `${months}m`
  }
}

/**
 * Calculate dynamic investment size ranges based on quintiles
 */
export const calculateInvestmentSizeRanges = (
  investments: EquityInvestmentSummary[],
  currency: string
): DistributionData[] => {
  const filteredInvestments = investments.filter(inv => inv.currencyCode === currency)

  if (filteredInvestments.length === 0) {
    return []
  }

  // Get all investment amounts and sort them
  const amounts = filteredInvestments
    .map(inv => inv.investment.totalInvestmentAmount || 0)
    .filter(amount => amount > 0)
    .sort((a, b) => a - b)

  if (amounts.length === 0) {
    return []
  }

  // Calculate dynamic ranges based on quintiles (5 groups)
  const quintileSize = Math.floor(amounts.length / 5)
  const ranges: Array<{ min: number; max: number; label: string }> = []

  // Create 5 ranges based on data distribution
  for (let i = 0; i < 5; i++) {
    const startIdx = i * quintileSize
    const endIdx = i === 4 ? amounts.length - 1 : (i + 1) * quintileSize - 1

    const min = i === 0 ? 0 : amounts[startIdx]
    const max = i === 4 ? Infinity : amounts[endIdx]

    let label: string
    if (i === 0) {
      label = `<${formatAmount(amounts[endIdx], 0)}`
    } else if (i === 4) {
      label = `>${formatAmount(amounts[startIdx], 0)}`
    } else {
      label = `${formatAmount(amounts[startIdx], 0)}-${formatAmount(amounts[endIdx], 0)}`
    }

    ranges.push({ min, max, label })
  }

  // Count investments in each range
  const rangeData = ranges.map((range, index) => {
    const count = filteredInvestments.filter(inv => {
      const amount = inv.investment.totalInvestmentAmount || 0
      if (range.max === Infinity) {
        return amount >= range.min
      }
      return amount >= range.min && amount <= range.max
    }).length

    return {
      type: range.label,
      count,
      percentage: (count / filteredInvestments.length) * 100,
      minValue: range.min,
      maxValue: range.max,
      sortOrder: index
    }
  })

  // Ensure data is sorted by minValue for consistent legend display
  return rangeData.sort((a, b) => (a.minValue || 0) - (b.minValue || 0))
}

/**
 * Calculate dynamic investment duration ranges based on quintiles
 */
export const calculateInvestmentDurationRanges = (investments: EquityInvestmentSummary[]): DistributionData[] => {
  const investmentsWithDuration = investments.filter(inv => inv.investment.acquisitionDate)

  if (investmentsWithDuration.length === 0) {
    return []
  }

  // Calculate duration in years for each investment and sort
  const durations = investmentsWithDuration
    .map(inv => {
      const acquisitionDate = dayjs(inv.investment.acquisitionDate)
      const today = dayjs()
      return today.diff(acquisitionDate, 'year', true)
    })
    .filter(duration => duration >= 0)
    .sort((a, b) => a - b)

  if (durations.length === 0) {
    return []
  }

  // Calculate dynamic ranges based on quintiles (5 groups)
  const quintileSize = Math.floor(durations.length / 5)
  const ranges: Array<{ min: number; max: number; label: string }> = []

  // Create 5 ranges based on data distribution
  for (let i = 0; i < 5; i++) {
    const startIdx = i * quintileSize
    const endIdx = i === 4 ? durations.length - 1 : (i + 1) * quintileSize - 1

    const min = i === 0 ? 0 : durations[startIdx]
    const max = i === 4 ? Infinity : durations[endIdx]

    let label: string
    if (i === 0) {
      label = `<${formatDuration(durations[endIdx])}`
    } else if (i === 4) {
      label = `>${formatDuration(durations[startIdx])}`
    } else {
      label = `${formatDuration(durations[startIdx])}-${formatDuration(durations[endIdx])}`
    }

    ranges.push({ min, max, label })
  }

  // Count investments in each range
  const rangeData = ranges.map((range, index) => {
    const count = investmentsWithDuration.filter(inv => {
      const acquisitionDate = dayjs(inv.investment.acquisitionDate)
      const today = dayjs()
      const durationYears = today.diff(acquisitionDate, 'year', true)

      if (range.max === Infinity) {
        return durationYears >= range.min
      }
      return durationYears >= range.min && durationYears <= range.max
    }).length

    return {
      type: range.label,
      count,
      percentage: (count / investmentsWithDuration.length) * 100,
      minValue: range.min,
      maxValue: range.max,
      sortOrder: index
    }
  })

  // Ensure data is sorted by minValue for consistent legend display
  return rangeData.sort((a, b) => (a.minValue || 0) - (b.minValue || 0))
}
