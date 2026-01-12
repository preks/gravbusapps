import { KPIConfig, BaseKPIData, KPIValidationResult, KPIFormat } from './types'
import { formatCurrencyCompact, formatPercentage } from '@/common/utils/numberFormatter'

/**
 * Validate that data object contains all fields required by KPI config
 *
 * @param data - The data object to validate
 * @param config - The KPI configuration to validate against
 * @returns Validation result with missing/extra fields
 */
export function validateKPIData<T extends BaseKPIData>(data: T, config: KPIConfig): KPIValidationResult {
  const dataFields = new Set(Object.keys(data))
  const requiredFields = new Set(config.kpis.map(kpi => kpi.field))

  const missingFields = Array.from(requiredFields).filter(field => !dataFields.has(field))
  const extraFields = Array.from(dataFields).filter(field => !requiredFields.has(field))

  return {
    isValid: missingFields.length === 0,
    missingFields,
    extraFields
  }
}

/**
 * Format duration in days to human-readable string
 *
 * @param days - Number of days
 * @returns Formatted duration string
 */
export function formatDuration(days: number): string {
  if (days === 0) return '0 days'

  const years = Math.floor(days / 365)
  const remainingDays = days % 365
  const months = Math.floor(remainingDays / 30)

  const parts: string[] = []
  if (years > 0) parts.push(`${years}y`)
  if (months > 0) parts.push(`${months}m`)

  return parts.length > 0 ? parts.join(' ') : `${days}d`
}

/**
 * Format a KPI value based on its format type
 *
 * @param value - The value to format
 * @param format - The format type
 * @param currencyCode - Currency code for currency formatting (optional)
 * @returns Formatted value string
 */
export function formatKPIValue(value: number, format: KPIFormat, currencyCode: string = 'EUR'): string {
  switch (format) {
    case 'number':
      return value.toLocaleString('en-US')

    case 'currency':
      return formatCurrencyCompact(value, currencyCode, undefined, 1, true)

    case 'percentage':
      return formatPercentage(value)

    case 'duration':
      return formatDuration(value)

    case 'multiplier':
      return `${value.toFixed(1)}x`

    default:
      return value.toString()
  }
}

/**
 * Calculate percentage change between current and previous values
 *
 * @param current - Current period value
 * @param previous - Previous period value
 * @returns Object with formatted change value and direction
 */
export function calculateChange(current: number, previous: number): { value: string; positive: boolean } {
  if (previous === 0) {
    return {
      value: current > 0 ? '+100%' : '0%',
      positive: current > 0
    }
  }

  const change = ((current - previous) / Math.abs(previous)) * 100
  const formattedChange = Math.abs(change).toFixed(1)

  return {
    value: `${change >= 0 ? '+' : '-'}${formattedChange}%`,
    positive: change >= 0
  }
}

/**
 * Validate KPI config structure
 *
 * @param config - KPI configuration to validate
 * @returns True if config is valid, throws error otherwise
 */
export function validateKPIConfig(config: KPIConfig): boolean {
  if (!config.name || !config.description) {
    throw new Error('KPI config must have name and description')
  }

  if (!config.kpis || config.kpis.length === 0) {
    throw new Error('KPI config must have at least one KPI definition')
  }

  const keys = new Set<string>()
  const fields = new Set<string>()

  for (const kpi of config.kpis) {
    // Check for duplicate keys
    if (keys.has(kpi.key)) {
      throw new Error(`Duplicate KPI key: ${kpi.key}`)
    }
    keys.add(kpi.key)

    // Check for duplicate fields
    if (fields.has(kpi.field)) {
      throw new Error(`Duplicate KPI field: ${kpi.field}`)
    }
    fields.add(kpi.field)

    // Validate required properties
    if (!kpi.title || !kpi.field || !kpi.icon || !kpi.color || !kpi.format || !kpi.description) {
      throw new Error(`Invalid KPI definition for key: ${kpi.key}`)
    }
  }

  return true
}
