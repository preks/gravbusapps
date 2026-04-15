import { formatDateRangeForChip } from '../../../../utils/tableUtils'
import { TOP_DESTINATION_FILTER_TOKEN_PREFIX } from './expensePlanFilterTokens'

export function buildExpensePlansFiltersObject(
  selectedFilters: string[],
  planDateRange: [Date | null, Date | null] | null | undefined,
  effectiveDateRange: [Date | null, Date | null] | null | undefined,
  startDateRange: [Date | null, Date | null] | null | undefined,
  endDateRange: [Date | null, Date | null] | null | undefined,
  availableStatuses: string[]
): Record<string, unknown> {
  const statusIds = selectedFilters.filter(f => availableStatuses.includes(f))
  const planTypeIds = selectedFilters.filter(f => f.startsWith('planType:'))
  const topDestinationIds = selectedFilters.filter(f => f.startsWith(TOP_DESTINATION_FILTER_TOKEN_PREFIX))
  const obj: Record<string, unknown> = {}
  if (statusIds.length > 0) obj.statusIds = statusIds
  if (planTypeIds.length > 0) obj.planTypeIds = planTypeIds
  if (topDestinationIds.length > 0) obj.topDestinationIds = topDestinationIds
  const planDateStr = formatDateRangeForChip(planDateRange)
  if (planDateStr) obj.planDateRange = planDateStr
  const effectiveDateStr = formatDateRangeForChip(effectiveDateRange)
  if (effectiveDateStr) obj.effectiveDateRange = effectiveDateStr
  const startDateStr = formatDateRangeForChip(startDateRange)
  if (startDateStr) obj.startDateRange = startDateStr
  const endDateStr = formatDateRangeForChip(endDateRange)
  if (endDateStr) obj.endDateRange = endDateStr
  return obj
}
