import { useCallback, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import type { FilterConfiguration } from '@newwork/nw-design-system'
import { applyDateRangeFromFilter } from '@/business-apps/fin/expenses/common/utils/dateRangeFilterUtils'
import { createDateRangeConfig } from '@/business-apps/fin/expenses/common/config/filterConfigHelpers'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { AssetStatus } from '../types'
import { formatStatus } from '../components/AssetTableUtils'

interface FilterOption {
  id: string
  label: string
}

interface UseAssetFilterStateParams {
  statusOptions: AssetStatus[]
  categoryOptions: FilterOption[]
  locationOptions: FilterOption[]
  employeeOptions: FilterOption[]
  employeeIds: string[]
  setEmployeeIds: (value: string[]) => void
  setCurrentPage: (value: number) => void
}

interface DateRangeState {
  from: string
  to: string
}

export function useAssetFilterState({
  statusOptions,
  categoryOptions,
  locationOptions,
  employeeOptions,
  employeeIds,
  setEmployeeIds,
  setCurrentPage
}: UseAssetFilterStateParams) {
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedLocations, setSelectedLocations] = useState<string[]>([])
  const [acquisitionDateRange, setAcquisitionDateRange] = useState<DateRangeState>({ from: '', to: '' })
  const [disposalDateRange, setDisposalDateRange] = useState<DateRangeState>({ from: '', to: '' })

  const filterConfiguration = useMemo<FilterConfiguration>(
    () => ({
      id: 'asset-management-filters',
      name: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.asset_management', 'Asset Management'),
      groups: [
        {
          id: 'status-group',
          label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.status', 'Status'),
          collapsible: true,
          defaultExpanded: true,
          filters: [
            {
              id: 'statusIds',
              field: 'statusIds',
              label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.status', 'Status'),
              type: 'multi-select',
              config: {
                options: statusOptions.map(status => ({
                  id: status,
                  label: formatStatus(status)
                }))
              }
            }
          ]
        },
        {
          id: 'category-group',
          label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.category', 'Category'),
          collapsible: true,
          defaultExpanded: true,
          filters: [
            {
              id: 'categoryIds',
              field: 'categoryIds',
              label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.category', 'Category'),
              type: 'multi-select',
              config: { options: categoryOptions, showSearch: true, showSelectAll: false }
            }
          ]
        },
        {
          id: 'location-group',
          label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.location', 'Location'),
          collapsible: true,
          defaultExpanded: false,
          filters: [
            {
              id: 'locationIds',
              field: 'locationIds',
              label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.location', 'Location'),
              type: 'multi-select',
              config: { options: locationOptions, showSearch: true, showSelectAll: false }
            }
          ]
        },
        {
          id: 'employee-group',
          label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.employee', 'Employee'),
          collapsible: true,
          defaultExpanded: false,
          filters: [
            {
              id: 'employeeIds',
              field: 'employeeIds',
              label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.employee', 'Employee'),
              type: 'multi-select',
              config: { options: employeeOptions, showSearch: false, showSelectAll: false }
            }
          ]
        },
        {
          id: 'acquisition-date-group',
          label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.acquisition_date', 'Acquisition Date'),
          collapsible: true,
          defaultExpanded: false,
          filters: [
            {
              id: 'acquisitionDateRange',
              field: 'acquisitionDateRange',
              label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.acquisition_date', 'Acquisition Date'),
              type: 'date',
              config: createDateRangeConfig()
            }
          ]
        },
        {
          id: 'disposal-date-group',
          label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.disposal_date', 'Disposal Date'),
          collapsible: true,
          defaultExpanded: false,
          filters: [
            {
              id: 'disposalDateRange',
              field: 'disposalDateRange',
              label: getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.disposal_date', 'Disposal Date'),
              type: 'date',
              config: createDateRangeConfig()
            }
          ]
        }
      ]
    }),
    [categoryOptions, employeeOptions, locationOptions, statusOptions]
  )

  const filtersObject = useMemo(() => {
    const filters: Record<string, unknown> = {}

    if (selectedStatuses.length > 0) {
      filters.statusIds = selectedStatuses
    }

    if (selectedCategories.length > 0) {
      filters.categoryIds = selectedCategories
    }

    if (selectedLocations.length > 0) {
      filters.locationIds = selectedLocations
    }

    if (employeeIds.length > 0) {
      filters.employeeIds = employeeIds
    }

    if (acquisitionDateRange.from || acquisitionDateRange.to) {
      filters.acquisitionDateRange = {
        from: acquisitionDateRange.from || undefined,
        to: acquisitionDateRange.to || undefined
      }
    }

    if (disposalDateRange.from || disposalDateRange.to) {
      filters.disposalDateRange = {
        from: disposalDateRange.from || undefined,
        to: disposalDateRange.to || undefined
      }
    }

    return filters
  }, [acquisitionDateRange, disposalDateRange, employeeIds, selectedCategories, selectedLocations, selectedStatuses])

  const queryFilterState = useMemo(
    () => ({
      statusFilter: selectedStatuses,
      categoryFilter: selectedCategories,
      locationFilter: selectedLocations,
      employeeFilter: employeeIds,
      acquisitionDateFrom: acquisitionDateRange.from || undefined,
      acquisitionDateTo: acquisitionDateRange.to || undefined,
      disposalDateFrom: disposalDateRange.from || undefined,
      disposalDateTo: disposalDateRange.to || undefined
    }),
    [acquisitionDateRange, disposalDateRange, employeeIds, selectedCategories, selectedLocations, selectedStatuses]
  )

  const hasActiveFilters = useMemo(
    () =>
      selectedStatuses.length > 0 ||
      selectedCategories.length > 0 ||
      selectedLocations.length > 0 ||
      employeeIds.length > 0 ||
      Boolean(acquisitionDateRange.from || acquisitionDateRange.to || disposalDateRange.from || disposalDateRange.to),
    [
      acquisitionDateRange,
      disposalDateRange,
      employeeIds.length,
      selectedCategories.length,
      selectedLocations.length,
      selectedStatuses.length
    ]
  )

  const applyDateRange = useCallback((raw: unknown, setter: (value: DateRangeState) => void) => {
    applyDateRangeFromFilter(raw, range => {
      setter({
        from: range?.[0] ? dayjs(range[0]).format('YYYY-MM-DD') : '',
        to: range?.[1] ? dayjs(range[1]).format('YYYY-MM-DD') : ''
      })
    })
  }, [])

  const handleFilterChangeFromDisplay = useCallback(
    (filters: Record<string, unknown>) => {
      if (Object.keys(filters).length === 0) {
        setSelectedStatuses([])
        setSelectedCategories([])
        setSelectedLocations([])
        setEmployeeIds([])
        setAcquisitionDateRange({ from: '', to: '' })
        setDisposalDateRange({ from: '', to: '' })
        setCurrentPage(1)
        return
      }

      setSelectedStatuses((filters.statusIds as string[] | undefined) ?? [])
      setSelectedCategories((filters.categoryIds as string[] | undefined) ?? [])
      setSelectedLocations((filters.locationIds as string[] | undefined) ?? [])
      setEmployeeIds((filters.employeeIds as string[] | undefined) ?? [])
      applyDateRange(filters.acquisitionDateRange, setAcquisitionDateRange)
      applyDateRange(filters.disposalDateRange, setDisposalDateRange)
      setCurrentPage(1)
    },
    [applyDateRange, setCurrentPage, setEmployeeIds]
  )

  return {
    filterConfiguration,
    filtersObject,
    queryFilterState,
    hasActiveFilters,
    handleFilterChangeFromDisplay
  }
}
