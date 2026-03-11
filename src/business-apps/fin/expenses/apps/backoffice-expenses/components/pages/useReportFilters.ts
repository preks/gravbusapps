import { useEffect, useMemo, useCallback } from 'react'
import type { FilterConfiguration } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ReportType } from '../../hooks/useBackofficeExpenseReportData'
import { getActiveStructureDepartmentOptions } from '../../utils/departmentOptions'
import { EMPTY_REPORT_FILTERS, normalizeReportFilters, areReportFiltersEqual } from './reportFilterUtils'

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
    setSearchTerm
  } = params

  const selectedFilters = useMemo(() => {
    if (!selectedReportType) return EMPTY_REPORT_FILTERS
    return normalizeReportFilters(filtersByReportType[selectedReportType] ?? {})
  }, [filtersByReportType, selectedReportType])

  const statusFilterOptions = useMemo(() => {
    const t = getTranslationFromI18nKeyAndLabel
    switch (selectedReportType) {
      case ReportType.APPROVAL_PAYOUT_CYCLE:
        return [
          { id: 'PENDING', label: t('lowcoder:expense_statuses.in_approval', 'In Approval') },
          { id: 'APPROVED', label: t('lowcoder:expense_statuses.verification_required', 'Verification Required') },
          { id: 'VERIFIED', label: t('lowcoder:expense_statuses.verified', 'Verified') },
          { id: 'BOOKED', label: t('lowcoder:expense_statuses.booked', 'Booked') },
          { id: 'TRANSFERRED', label: t('lowcoder:expense_statuses.transferred', 'Transferred') },
          { id: 'PAID', label: t('lowcoder:expense_statuses.paid', 'Paid') }
        ]
      case ReportType.EXPENSE_ITEM:
        return [
          { id: 'CREATED', label: t('lowcoder:expense_statuses.draft', 'Draft') },
          { id: 'PENDING', label: t('lowcoder:expense_statuses.in_approval', 'In Approval') },
          { id: 'APPROVED', label: t('lowcoder:expense_statuses.verification_required', 'Verification Required') },
          { id: 'VERIFIED', label: t('lowcoder:expense_statuses.booking_required', 'Booking Required') },
          { id: 'BOOKED', label: t('lowcoder:expense_statuses.booked', 'Booked') },
          { id: 'TRANSFERRED', label: t('lowcoder:expense_statuses.transferred', 'Transferred') },
          { id: 'PAID', label: t('lowcoder:expense_statuses.paid', 'Paid') },
          { id: 'CLOSED', label: t('lowcoder:expense_statuses.closed', 'Closed') }
        ]
      case ReportType.EXPENSE_PLAN:
        return [
          { id: 'CREATED', label: t('lowcoder:expense_statuses.draft', 'Draft') },
          { id: 'PENDING', label: t('lowcoder:expense_statuses.in_approval', 'In Approval') },
          { id: 'REJECTED', label: t('lowcoder:expense_statuses.revision_required', 'Revision Required') },
          { id: 'APPROVED', label: t('lowcoder:expense_statuses.verification_required', 'Verification Required') },
          { id: 'VERIFIED', label: t('lowcoder:expense_statuses.booking_required', 'Booking Required') },
          { id: 'BOOKED', label: t('lowcoder:expense_statuses.booked', 'Booked') },
          { id: 'TRANSFERRED', label: t('lowcoder:expense_statuses.transferred', 'Transferred') },
          { id: 'PAID', label: t('lowcoder:expense_statuses.paid', 'Paid') },
          { id: 'CLOSED', label: t('lowcoder:expense_statuses.closed', 'Closed') },
          { id: 'DISCARDED', label: t('lowcoder:expense_statuses.discarded', 'Discarded') }
        ]
      case ReportType.EXPENSE_REQUEST:
        return [
          { id: 'CREATED', label: t('lowcoder:expense_statuses.draft', 'Draft') },
          { id: 'PENDING', label: t('lowcoder:expense_statuses.in_approval', 'In Approval') },
          { id: 'REJECTED', label: t('lowcoder:expense_statuses.revision_required', 'Revision Required') },
          { id: 'APPROVED', label: t('lowcoder:expense_statuses.verification_required', 'Verification Required') },
          { id: 'VERIFIED', label: t('lowcoder:expense_statuses.booking_required', 'Booking Required') },
          { id: 'BOOKED', label: t('lowcoder:expense_statuses.booked', 'Booked') },
          { id: 'TRANSFERRED', label: t('lowcoder:expense_statuses.transferred', 'Transferred') },
          { id: 'PAID', label: t('lowcoder:expense_statuses.paid', 'Paid') },
          { id: 'DISCARDED', label: t('lowcoder:expense_statuses.discarded', 'Discarded') }
        ]
      case ReportType.ADVANCE_PAYMENT:
        return [
          { id: 'PREPARED', label: t('lowcoder:expense_statuses.prepared', 'Prepared') },
          { id: 'PENDING', label: t('lowcoder:expense_statuses.in_approval', 'In Approval') },
          { id: 'REJECTED', label: t('lowcoder:expense_statuses.revision_required', 'Revision Required') },
          { id: 'RETURNED', label: t('lowcoder:expense_statuses.returned', 'Returned') },
          { id: 'APPROVED', label: t('lowcoder:expense_statuses.approved', 'Approved') },
          { id: 'VERIFIED', label: t('lowcoder:expense_statuses.booking_required', 'Booking Required') },
          { id: 'BOOKED', label: t('lowcoder:expense_statuses.booked', 'Booked') },
          { id: 'TRANSFERRED', label: t('lowcoder:expense_statuses.payment_required', 'Payment Required') },
          { id: 'PAID', label: t('lowcoder:expense_statuses.paid', 'Paid') }
        ]
      default:
        return []
    }
  }, [selectedReportType])

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
    const t = getTranslationFromI18nKeyAndLabel
    if (selectedReportType === ReportType.EXPENSE_ITEM) {
      return [makeDateGroup('dateRange', t('lowcoder:personal_expenses.expense_date_label', 'Expense Date'))]
    }
    if (selectedReportType === ReportType.ADVANCE_PAYMENT) {
      return [makeDateGroup('effectiveDateRange', t('lowcoder:personal_expenses.effective_date', 'Effective Date'))]
    }
    if (
      selectedReportType === ReportType.EXPENSE_PLAN ||
      selectedReportType === ReportType.EXPENSE_REQUEST ||
      selectedReportType === ReportType.APPROVAL_PAYOUT_CYCLE
    ) {
      const groups = [
        makeDateGroup('effectiveDateRange', t('lowcoder:personal_expenses.effective_date', 'Effective Date'))
      ]
      if (selectedReportType === ReportType.EXPENSE_PLAN) {
        groups.push(makeDateGroup('planDateRange', t('lowcoder:personal_expenses.plan_date', 'Plan Date')))
      }
      if (
        selectedReportType === ReportType.EXPENSE_REQUEST ||
        selectedReportType === ReportType.APPROVAL_PAYOUT_CYCLE
      ) {
        groups.push(
          makeDateGroup(
            'requestDateRange',
            t('lowcoder:manager_expense_request_list.expense_table.creation_date', 'Creation Date')
          )
        )
      }
      return groups
    }
    return []
  }, [selectedReportType])

  const filterConfiguration = useMemo<FilterConfiguration>(() => {
    const statusLabel = getTranslationFromI18nKeyAndLabel('lowcoder:common.status', 'Status')
    const employeeLabel = getTranslationFromI18nKeyAndLabel('lowcoder:common.employee', 'Employee')
    const departmentLabel = getTranslationFromI18nKeyAndLabel('lowcoder:common.department', 'Department')

    return {
      id: `backoffice-expense-reports-filters-${selectedReportType || 'unknown'}`,
      name: getTranslationFromI18nKeyAndLabel('lowcoder:common.report_filters', 'Report Filters'),
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
                searchPlaceholder: getTranslationFromI18nKeyAndLabel(
                  'lowcoder:expense_request_table.employee_search_filter',
                  'Search employee...'
                ),
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
  }, [statusFilterOptions, employeeFilterOptions, departmentFilterOptions, dateGroups, selectedReportType])

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
