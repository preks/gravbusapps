import type { FilterConfiguration } from '@newwork/nw-design-system'
import { formatDateRangeForChip, type DateRange } from '../../../../../../common/utils/dateRangeFilterUtils'
import {
  createDateRangeConfig,
  createFluentExpenseAmountRangeFilterGroup
} from '../../../../common/config/filterConfigHelpers'
import { buildStatusDisplayName } from '../../../../utils/sharedUtils'
import { getAdvancePaymentStatusDisplay, type TranslateFn } from '../../../../utils/utils'
import { ADVANCE_PAYMENT_REPORTER_FILTER_GROUP_ID } from '../constants/advancePaymentReporterFilter'

interface DepartmentOption {
  id: string
  name: string
}

interface BuildAdvancePaymentFilterConfigurationParams {
  t: TranslateFn
  availableStatuses: string[]
  departmentOptions: DepartmentOption[]
  reporterOptions: Array<{ id: string; label: string }>
}

interface BuildAdvancePaymentFiltersObjectParams {
  statusFilter: string[]
  selectedReporters: string[]
  departmentId: string
  dateFrom: string
  dateTo: string
  amountMinFilter: string
  amountMaxFilter: string
  advanceMinFilter: string
  advanceMaxFilter: string
}

function parseNumberRange(raw: unknown): { minValue: string; maxValue: string } {
  const range = raw as { min?: number; max?: number } | undefined
  if (!range) {
    return { minValue: '', maxValue: '' }
  }

  const minValue = range.min !== undefined && !Number.isNaN(Number(range.min)) ? String(range.min) : ''
  const maxValue = range.max !== undefined && !Number.isNaN(Number(range.max)) ? String(range.max) : ''
  return { minValue, maxValue }
}

function toDateRange(dateFrom: string, dateTo: string): DateRange {
  if (!dateFrom && !dateTo) {
    return null
  }

  return [dateFrom ? new Date(dateFrom) : null, dateTo ? new Date(dateTo) : null]
}

export function buildAdvancePaymentFilterConfiguration({
  t,
  availableStatuses,
  departmentOptions,
  reporterOptions
}: BuildAdvancePaymentFilterConfigurationParams): FilterConfiguration {
  const statusOptions = availableStatuses.map(status => ({
    id: status,
    label: buildStatusDisplayName(status, getAdvancePaymentStatusDisplay, t)
  }))

  const departmentFilterOptions = departmentOptions.map(department => ({
    id: department.id,
    label: department.name
  }))

  return {
    id: 'backoffice-advance-payments-filters',
    name: t('tab-advance-payments'),
    groups: [
      {
        id: 'status-group',
        label: t('filter-status'),
        collapsible: true,
        defaultExpanded: true,
        filters: [
          {
            id: 'statusIds',
            field: 'statusIds',
            label: t('filter-status'),
            type: 'multi-select',
            config: { options: statusOptions }
          }
        ]
      },
      {
        id: ADVANCE_PAYMENT_REPORTER_FILTER_GROUP_ID,
        label: t('filter-employee'),
        collapsible: true,
        defaultExpanded: true,
        filters: [
          {
            id: 'reporterIds',
            field: 'reporterIds',
            label: t('filter-employee'),
            type: 'multi-select',
            config: { options: reporterOptions, showSearch: false, showSelectAll: false }
          }
        ]
      },
      {
        id: 'department-group',
        label: t('filter-department'),
        collapsible: true,
        defaultExpanded: false,
        filters: [
          {
            id: 'departmentIds',
            field: 'departmentIds',
            label: t('filter-department'),
            type: 'multi-select',
            config: { options: departmentFilterOptions, showSearch: true, showSelectAll: false }
          }
        ]
      },
      {
        id: 'date-range-group',
        label: t('filter-date-range'),
        collapsible: true,
        defaultExpanded: false,
        filters: [
          {
            id: 'dateRange',
            field: 'dateRange',
            label: t('filter-date-range'),
            type: 'date',
            config: createDateRangeConfig(t)
          }
        ]
      },
      createFluentExpenseAmountRangeFilterGroup(t, 'amount', 'amount', 'filter-amount'),
      createFluentExpenseAmountRangeFilterGroup(t, 'advance', 'advance', 'filter-advance')
    ]
  }
}

function buildRangeFilter(minFilter: string, maxFilter: string): { min?: number; max?: number } | undefined {
  const range = parseNumberRange({
    min: minFilter ? Number(minFilter) : undefined,
    max: maxFilter ? Number(maxFilter) : undefined
  })
  if (!range.minValue && !range.maxValue) return undefined
  return {
    min: range.minValue ? Number(range.minValue) : undefined,
    max: range.maxValue ? Number(range.maxValue) : undefined
  }
}

export function buildAdvancePaymentFiltersObject({
  statusFilter,
  selectedReporters,
  departmentId,
  dateFrom,
  dateTo,
  amountMinFilter,
  amountMaxFilter,
  advanceMinFilter,
  advanceMaxFilter
}: BuildAdvancePaymentFiltersObjectParams): Record<string, unknown> {
  const filters: Record<string, unknown> = {}

  if (statusFilter.length > 0) {
    filters.statusIds = statusFilter
  }
  if (selectedReporters.length > 0) {
    filters.reporterIds = selectedReporters
  }
  if (departmentId) {
    filters.departmentIds = [departmentId]
  }

  const dateRangeLabel = formatDateRangeForChip(toDateRange(dateFrom, dateTo))
  if (dateRangeLabel) {
    filters.dateRange = dateRangeLabel
  }

  const amountRange = buildRangeFilter(amountMinFilter, amountMaxFilter)
  if (amountRange) {
    filters.amount = amountRange
  }

  const advanceRange = buildRangeFilter(advanceMinFilter, advanceMaxFilter)
  if (advanceRange) {
    filters.advance = advanceRange
  }

  return filters
}

export function buildReporterOptions(
  selectedReporters: string[],
  reporterSearchResults: string[]
): Array<{ id: string; label: string }> {
  const unique = new Set<string>([...selectedReporters, ...reporterSearchResults])
  return Array.from(unique).map(value => ({ id: value, label: value }))
}
