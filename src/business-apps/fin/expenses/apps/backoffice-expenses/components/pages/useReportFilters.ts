import { useEffect, useMemo, useCallback } from 'react'
import type { FilterConfiguration } from '@newwork/nw-design-system'
import { ReportType } from '../../hooks/useBackofficeExpenseReportData'
import { getActiveStructureDepartmentOptions } from '../../utils/departmentOptions'
import { EMPTY_REPORT_FILTERS, normalizeReportFilters, areReportFiltersEqual } from './reportFilterUtils'

type TranslateFn = (key: string, vars?: Record<string, unknown>) => string

interface UseReportFiltersParams {
  selectedReportType: ReportType | null
  reportRowsWithGroupedStatuses: any[]
  organizationalUnits: any[] | undefined
  allEmployeeNames: string[]
  filtersByReportType: Partial<Record<ReportType, Record<string, any>>>
  setFiltersByReportType: React.Dispatch<React.SetStateAction<Partial<Record<ReportType, Record<string, any>>>>>
  setCurrentPage: (page: number) => void
  setLocalSearchText: (text: string) => void
  setSearchTerm: (term: string) => void
  t: TranslateFn
}

function makeDateGroup(id: string, label: string) {
  return {
    id,
    label,
    collapsible: true,
    defaultExpanded: false,
    filters: [
      {
        id: id,
        field: id,
        label,
        type: 'date' as const,
        config: {
          mode: 'range' as const,
          dateType: 'date' as const,
          showClearButton: true
        }
      }
    ]
  }
}

export const useReportFilters = (params: UseReportFiltersParams) => {
  const {
    selectedReportType,
    reportRowsWithGroupedStatuses,
    organizationalUnits,
    allEmployeeNames,
    filtersByReportType,
    setFiltersByReportType,
    setCurrentPage,
    setLocalSearchText,
    setSearchTerm,
    t
  } = params

  const selectedFilters = useMemo(() => {
    if (!selectedReportType) return EMPTY_REPORT_FILTERS
    return normalizeReportFilters(filtersByReportType[selectedReportType] ?? {})
  }, [filtersByReportType, selectedReportType])

  const statusFilterOptions = useMemo(() => {
    switch (selectedReportType) {
      case ReportType.APPROVAL_PAYOUT_CYCLE:
        return [
          { id: 'PENDING', label: t('status-in-approval') },
          { id: 'APPROVED', label: t('status-verification-required') },
          { id: 'VERIFIED', label: t('status-verified') },
          { id: 'BOOKED', label: t('status-booked') },
          { id: 'TRANSFERRED', label: t('status-transferred') },
          { id: 'PAID', label: t('status-paid') }
        ]
      case ReportType.EXPENSE_ITEM:
        return [
          { id: 'CREATED', label: t('status-draft') },
          { id: 'ASSIGNED', label: t('status-assigned') },
          { id: 'PENDING', label: t('status-in-approval') },
          { id: 'APPROVED', label: t('status-verification-required') },
          { id: 'REJECTED', label: t('status-revision-required') },
          { id: 'VERIFIED', label: t('status-booking-required') },
          { id: 'BOOKED', label: t('status-booked') },
          { id: 'TRANSFERRED', label: t('status-transferred') },
          { id: 'PAID', label: t('status-paid') },
          { id: 'DISCARDED', label: t('status-discarded') }
        ]
      case ReportType.EXPENSE_PLAN:
        return [
          { id: 'CREATED', label: t('status-draft') },
          { id: 'ASSIGNED', label: t('status-assigned') },
          { id: 'PENDING', label: t('status-in-approval') },
          { id: 'APPROVED', label: t('status-approved') },
          { id: 'REJECTED', label: t('status-revision-required') },
          { id: 'CLOSED', label: t('status-closed') },
          { id: 'DISCARDED', label: t('status-discarded') }
        ]
      case ReportType.EXPENSE_REQUEST:
        return [
          { id: 'CREATED', label: t('status-draft') },
          { id: 'PENDING', label: t('status-in-approval') },
          { id: 'APPROVED', label: t('status-verification-required') },
          { id: 'REJECTED', label: t('status-revision-required') },
          { id: 'VERIFIED', label: t('status-booking-required') },
          { id: 'BOOKED', label: t('status-booked') },
          { id: 'TRANSFERRED', label: t('status-transferred') },
          { id: 'PAID', label: t('status-paid') },
          { id: 'DISCARDED', label: t('status-discarded') }
        ]
      case ReportType.ADVANCE_PAYMENT:
        return [
          { id: 'CREATED', label: t('status-draft') },
          { id: 'PREPARED', label: t('status-prepared') },
          { id: 'PENDING', label: t('status-in-approval') },
          { id: 'APPROVED', label: t('status-approved') },
          { id: 'RETURNED', label: t('status-returned') },
          { id: 'REJECTED', label: t('status-revision-required') },
          { id: 'VERIFIED', label: t('status-booking-required') },
          { id: 'BOOKED', label: t('status-booked') },
          { id: 'TRANSFERRED', label: t('status-payment-required') },
          { id: 'PAID', label: t('status-paid') }
        ]
      default:
        return []
    }
  }, [selectedReportType, t])

  const employeeFilterOptions = useMemo(() => allEmployeeNames.map(v => ({ id: v, label: v })), [allEmployeeNames])

  const departmentFilterOptions = useMemo(() => {
    const structureDepts = getActiveStructureDepartmentOptions(organizationalUnits || []).map(dept => ({
      id: dept.id,
      label: dept.name
    }))
    if (structureDepts.length > 0) return structureDepts
    return Array.from(
      new Set(reportRowsWithGroupedStatuses.map(r => String(r?.departmentName || '').trim()).filter(Boolean))
    )
      .sort((a, b) => a.localeCompare(b))
      .map(v => ({ id: v, label: v }))
  }, [organizationalUnits, reportRowsWithGroupedStatuses])

  const dateGroups = useMemo(() => {
    if (selectedReportType === ReportType.EXPENSE_ITEM) {
      return [makeDateGroup('dateRange', t('header-expense-date'))]
    }
    if (selectedReportType === ReportType.ADVANCE_PAYMENT) {
      return [makeDateGroup('effectiveDateRange', t('filter-effective-date'))]
    }
    if (
      selectedReportType === ReportType.EXPENSE_PLAN ||
      selectedReportType === ReportType.EXPENSE_REQUEST ||
      selectedReportType === ReportType.APPROVAL_PAYOUT_CYCLE
    ) {
      const groups = [makeDateGroup('effectiveDateRange', t('filter-effective-date'))]
      if (selectedReportType === ReportType.EXPENSE_PLAN) {
        groups.push(makeDateGroup('planDateRange', t('header-start-date')))
      }
      if (
        selectedReportType === ReportType.EXPENSE_REQUEST ||
        selectedReportType === ReportType.APPROVAL_PAYOUT_CYCLE
      ) {
        groups.push(makeDateGroup('requestDateRange', t('header-creation-date')))
      }
      return groups
    }
    return []
  }, [selectedReportType, t])

  const filterConfiguration = useMemo<FilterConfiguration>(() => {
    const statusLabel = t('header-status')
    const employeeLabel = t('header-employee')
    const departmentLabel = t('header-department')

    return {
      id: `backoffice-expense-reports-filters-${selectedReportType || 'unknown'}`,
      name: t('filter-report-filters'),
      groups: [
        ...dateGroups,
        {
          id: 'status-group',
          label: statusLabel,
          collapsible: true,
          defaultExpanded: false,
          filters: [
            {
              id: 'status',
              field: 'status',
              label: statusLabel,
              type: 'multi-select',
              config: {
                options: statusFilterOptions,
                searchPlaceholder: `${statusLabel}...`,
                totalCount: statusFilterOptions.length,
                hasMore: false
              }
            }
          ]
        },
        {
          id: 'employee-group',
          label: employeeLabel,
          collapsible: true,
          defaultExpanded: false,
          filters: [
            {
              id: 'employeeName',
              field: 'employeeName',
              label: employeeLabel,
              type: 'multi-select',
              config: {
                options: employeeFilterOptions,
                searchPlaceholder: t('filter-search-employee'),
                totalCount: employeeFilterOptions.length,
                hasMore: false
              }
            }
          ]
        },
        {
          id: 'department-group',
          label: departmentLabel,
          collapsible: true,
          defaultExpanded: false,
          filters: [
            {
              id: 'departmentName',
              field: 'departmentName',
              label: departmentLabel,
              type: 'multi-select',
              config: {
                options: departmentFilterOptions,
                searchPlaceholder: `${departmentLabel}...`,
                totalCount: departmentFilterOptions.length,
                hasMore: false
              }
            }
          ]
        }
      ]
    }
  }, [statusFilterOptions, employeeFilterOptions, departmentFilterOptions, dateGroups, selectedReportType, t])

  useEffect(() => {
    if (!selectedReportType) return
    const allowedStatusIds = new Set(statusFilterOptions.map(o => String(o.id)))
    const allowedDepartmentIds = new Set(departmentFilterOptions.map(o => String(o.id)))
    const current = normalizeReportFilters(filtersByReportType[selectedReportType] ?? {})
    const sanitized = {
      status: current.status.filter(s => allowedStatusIds.has(s)),
      employeeName: current.employeeName,
      departmentName: current.departmentName.filter(d => allowedDepartmentIds.has(d))
    }
    if (
      sanitized.status.length === current.status.length &&
      sanitized.departmentName.length === current.departmentName.length
    )
      return
    setFiltersByReportType(prev => ({ ...prev, [selectedReportType]: sanitized }))
  }, [selectedReportType, statusFilterOptions, departmentFilterOptions, filtersByReportType, setFiltersByReportType])

  const filteredReportRows = useMemo(() => {
    return reportRowsWithGroupedStatuses
  }, [reportRowsWithGroupedStatuses])

  const hasClientSideFilters = false

  const handleFilterChange = useCallback(
    (filters: Record<string, any>) => {
      if (!selectedReportType) return

      const extractRange = (key: string): [string | undefined, string | undefined] => {
        const val = filters?.[key]
        if (!Array.isArray(val)) return [undefined, undefined]
        return [val[0] ?? undefined, val[1] ?? undefined]
      }

      const [dateFrom, dateTo] = extractRange('dateRange')
      const [effectiveDateFrom, effectiveDateTo] = extractRange('effectiveDateRange')
      const [requestDateFrom, requestDateTo] = extractRange('requestDateRange')
      const [planDateFrom, planDateTo] = extractRange('planDateRange')

      const nextFilters = normalizeReportFilters({
        ...filters,
        dateFrom,
        dateTo,
        effectiveDateFrom,
        effectiveDateTo,
        requestDateFrom,
        requestDateTo,
        planDateFrom,
        planDateTo
      })
      const currentFilters = normalizeReportFilters(filtersByReportType[selectedReportType] ?? {})
      if (areReportFiltersEqual(currentFilters, nextFilters)) return
      setFiltersByReportType(prev => ({ ...prev, [selectedReportType]: nextFilters }))
      setCurrentPage(1)
    },
    [selectedReportType, filtersByReportType, setCurrentPage, setFiltersByReportType]
  )

  const handleResetFilters = useCallback(() => {
    if (!selectedReportType) return
    setFiltersByReportType(prev => ({ ...prev, [selectedReportType]: { ...EMPTY_REPORT_FILTERS } }))
    setLocalSearchText('')
    setSearchTerm('')
    setCurrentPage(1)
  }, [selectedReportType, setCurrentPage, setLocalSearchText, setSearchTerm, setFiltersByReportType])

  return {
    selectedFilters,
    filterConfiguration,
    filteredReportRows,
    hasClientSideFilters,
    handleFilterChange,
    handleResetFilters
  }
}
