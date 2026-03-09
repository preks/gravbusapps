import { useEffect, useMemo, useState, useCallback } from 'react'
import type { FilterConfiguration } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ReportType } from '../../hooks/useBackofficeExpenseReportData'
import { getActiveStructureDepartmentNames } from '../../utils/departmentOptions'
import {
  type ReportFilterOptionSnapshot,
  EMPTY_REPORT_FILTERS,
  TRANSFER_REQUIRED_LABEL,
  normalizeReportFilters,
  areReportFiltersEqual,
  normalizeStatusFilterValue,
  buildTransferRequiredAliases
} from './reportFilterUtils'

interface UseReportFiltersParams {
  selectedReportType: ReportType | null
  reportRowsWithGroupedStatuses: any[]
  organizationalUnits: any[] | undefined
  fetchAllForFilterOptions: () => Promise<unknown>
  filtersByReportType: Partial<Record<ReportType, Record<string, any>>>
  setFiltersByReportType: React.Dispatch<React.SetStateAction<Partial<Record<ReportType, Record<string, any>>>>>
  setCurrentPage: (page: number) => void
  setLocalSearchText: (text: string) => void
  setSearchTerm: (term: string) => void
}

export const useReportFilters = (params: UseReportFiltersParams) => {
  const {
    selectedReportType,
    reportRowsWithGroupedStatuses,
    organizationalUnits,
    fetchAllForFilterOptions,
    filtersByReportType,
    setFiltersByReportType,
    setCurrentPage,
    setLocalSearchText,
    setSearchTerm
  } = params

  const [fullFilterOptionsByType, setFullFilterOptionsByType] = useState<
    Partial<Record<ReportType, ReportFilterOptionSnapshot>>
  >({})
  const transferRequiredStatusAliases = useMemo(() => buildTransferRequiredAliases(), [])

  const selectedFilters = useMemo(() => {
    if (!selectedReportType) return EMPTY_REPORT_FILTERS
    return normalizeReportFilters(filtersByReportType[selectedReportType] ?? {})
  }, [filtersByReportType, selectedReportType])

  const statusFilterOptions = useMemo(() => {
    if (selectedReportType === ReportType.APPROVAL_PAYOUT_CYCLE) {
      return [
        {
          id: 'In Approval',
          label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.in_approval', 'In Approval')
        },
        {
          id: 'Verification Required',
          label: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_statuses.verification_required',
            'Verification Required'
          )
        },
        {
          id: 'Payment Required',
          label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.payment_required', 'Payment Required')
        },
        { id: 'Prepared', label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.prepared', 'Prepared') },
        {
          id: TRANSFER_REQUIRED_LABEL,
          label: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_statuses.transfer_required',
            TRANSFER_REQUIRED_LABEL
          )
        },
        { id: 'Paid', label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.paid', 'Paid') }
      ]
    }
    const restrictedStatuses = new Set(['Payment Required', 'Prepared'])
    const options = Array.from(
      new Set(reportRowsWithGroupedStatuses.map(row => String(row?.status || '').trim()).filter(Boolean))
    )
      .sort((a, b) => a.localeCompare(b))
      .map(v => ({ id: v, label: v }))
    if (selectedReportType === ReportType.ADVANCE_PAYMENT) return options
    return options.filter(o => !restrictedStatuses.has(String(o.id)))
  }, [selectedReportType, reportRowsWithGroupedStatuses])

  useEffect(() => {
    if (!selectedReportType || fullFilterOptionsByType[selectedReportType]) return
    let cancelled = false
    const load = async () => {
      const allRows = (await fetchAllForFilterOptions()) as any[]
      if (cancelled) return
      const employees = Array.from(
        new Set(allRows.map(r => String(r?.employeeName || '').trim()).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b))
      const departments = Array.from(
        new Set(allRows.map(r => String(r?.departmentName || '').trim()).filter(Boolean))
      ).sort((a, b) => a.localeCompare(b))
      setFullFilterOptionsByType(prev => ({ ...prev, [selectedReportType]: { employees, departments } }))
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [selectedReportType, fullFilterOptionsByType, fetchAllForFilterOptions])

  const employeeFilterOptions = useMemo(() => {
    const full = selectedReportType ? fullFilterOptionsByType[selectedReportType]?.employees || [] : []
    return full.map(v => ({ id: v, label: v }))
  }, [selectedReportType, fullFilterOptionsByType])

  const departmentFilterOptions = useMemo(() => {
    const structureDepts = getActiveStructureDepartmentNames(organizationalUnits || []).map(v => ({ id: v, label: v }))
    if (structureDepts.length > 0) return structureDepts
    const full = selectedReportType ? fullFilterOptionsByType[selectedReportType]?.departments || [] : []
    if (full.length > 0) return full.map(v => ({ id: v, label: v }))
    return Array.from(
      new Set(reportRowsWithGroupedStatuses.map(r => String(r?.departmentName || '').trim()).filter(Boolean))
    )
      .sort((a, b) => a.localeCompare(b))
      .map(v => ({ id: v, label: v }))
  }, [organizationalUnits, reportRowsWithGroupedStatuses, selectedReportType, fullFilterOptionsByType])

  const filterConfiguration = useMemo<FilterConfiguration>(() => {
    const statusLabel = getTranslationFromI18nKeyAndLabel('lowcoder:common.status', 'Status')
    const employeeLabel = getTranslationFromI18nKeyAndLabel('lowcoder:common.employee', 'Employee')
    const departmentLabel = getTranslationFromI18nKeyAndLabel('lowcoder:common.department', 'Department')
    return {
      id: `backoffice-expense-reports-filters-${selectedReportType || 'unknown'}`,
      name: getTranslationFromI18nKeyAndLabel('lowcoder:common.report_filters', 'Report Filters'),
      groups: [
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
                searchPlaceholder: `${employeeLabel}...`,
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
  }, [statusFilterOptions, employeeFilterOptions, departmentFilterOptions, selectedReportType])

  useEffect(() => {
    if (!selectedReportType) return
    const allowedStatusIds = new Set(statusFilterOptions.map(o => String(o.id)))
    const allowedEmployeeIds = new Set(employeeFilterOptions.map(o => String(o.id)))
    const allowedDepartmentIds = new Set(departmentFilterOptions.map(o => String(o.id)))
    const current = normalizeReportFilters(filtersByReportType[selectedReportType] ?? {})
    const sanitized = {
      status: current.status.filter(s => allowedStatusIds.has(s)),
      employeeName: current.employeeName.filter(e => allowedEmployeeIds.has(e)),
      departmentName: current.departmentName.filter(d => allowedDepartmentIds.has(d))
    }
    if (
      sanitized.status.length === current.status.length &&
      sanitized.employeeName.length === current.employeeName.length &&
      sanitized.departmentName.length === current.departmentName.length
    )
      return
    setFiltersByReportType(prev => ({ ...prev, [selectedReportType]: sanitized }))
  }, [
    selectedReportType,
    statusFilterOptions,
    employeeFilterOptions,
    departmentFilterOptions,
    filtersByReportType,
    setFiltersByReportType
  ])

  const filteredReportRows = useMemo(() => {
    const isBackendFiltered = selectedReportType !== ReportType.EXPENSE_ITEM
    const statuses = selectedFilters.status
    const employees = selectedFilters.employeeName
    const departments = selectedFilters.departmentName
    if (statuses.length === 0 && employees.length === 0 && departments.length === 0)
      return reportRowsWithGroupedStatuses
    const statusSet = isBackendFiltered
      ? new Set<string>()
      : new Set(statuses.map(s => normalizeStatusFilterValue(s, transferRequiredStatusAliases)).filter(Boolean))
    const employeeSet = isBackendFiltered ? new Set<string>() : new Set(employees.map(String))
    const departmentSet = isBackendFiltered ? new Set<string>() : new Set(departments.map(String))
    return reportRowsWithGroupedStatuses.filter(
      row =>
        (statusSet.size === 0 || statusSet.has(String(row?.status || ''))) &&
        (employeeSet.size === 0 || employeeSet.has(String(row?.employeeName || ''))) &&
        (departmentSet.size === 0 || departmentSet.has(String(row?.departmentName || '')))
    )
  }, [selectedReportType, reportRowsWithGroupedStatuses, selectedFilters, transferRequiredStatusAliases])

  const hasClientSideFilters = useMemo(() => {
    const isBackendFiltered = selectedReportType !== ReportType.EXPENSE_ITEM
    return (
      !isBackendFiltered &&
      (selectedFilters.employeeName.length > 0 ||
        selectedFilters.status.length > 0 ||
        selectedFilters.departmentName.length > 0)
    )
  }, [selectedFilters, selectedReportType])

  const handleFilterChange = useCallback(
    (filters: Record<string, any>) => {
      if (!selectedReportType) return
      const nextFilters = normalizeReportFilters(filters)
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
