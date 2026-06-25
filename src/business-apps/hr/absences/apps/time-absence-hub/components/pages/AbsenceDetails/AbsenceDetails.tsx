import React, { useMemo, useState, useCallback, useEffect, useLayoutEffect } from 'react'
import dayjs from 'dayjs'
import { ArrowLeftIcon, CalendarBlankIcon } from '@phosphor-icons/react'
import { Button, Card, CardContent, CardHeader, CardTitle, useTranslation } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { getAbsenceStatusLabel } from '@/business-apps/hr/absences/utils/absenceStatusUtils'

const formatDateForLocale = (dateString: string): string => {
  const userLocale = getCurrentActiveUserLocale()
  const date = new Date(dateString)
  return date.toLocaleDateString(userLocale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AbsenceList } from '../../tabs/absence-list-tab/AbsenceList/AbsenceList'
import { DashboardData } from '../../../types'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getOverlapAggregates } from '../../../utils/getOverlapAggregates'
import { toUtcDayRangeISO } from '../../../utils/dateUtils'
import { getOverlapStatusBreakdown, OverlapStatusResult } from '../../../utils/getOverlapStatusBreakdown'
import { getSafeHubErrorMessage } from '../../../utils/safeErrorMessage'
import { ErrorStateCard } from '../../views/shared/DataStateCards'
import translations from '../../../_i18n'

interface AbsenceDetailsProps extends BusinessAppContextProps {
  month?: string
  startDate?: string
  endDate?: string
  status?: string
  department?: string
  departmentId?: string
  dashboardData: DashboardData
  onNavigateBack: () => void
}

interface AbsenceTimeFilterWindow extends Window {
  __ABSENCE_TIME_FILTER__?: string
}

const getGlobalAbsenceTimeFilter = (): string | null => {
  if (globalThis.window === undefined) {
    return null
  }

  const absenceWindow = globalThis.window as AbsenceTimeFilterWindow
  const value = absenceWindow.__ABSENCE_TIME_FILTER__
  return typeof value === 'string' ? value : null
}

const getEffectiveStatusFilters = (selectedStatuses: string[], currentStatus?: string): string[] => {
  if (selectedStatuses.length > 0) {
    return selectedStatuses
  }

  if (!currentStatus) {
    return []
  }

  return [currentStatus.toUpperCase()]
}

const formatShortDateForLocale = (dateStr: string): string =>
  new Date(dateStr).toLocaleDateString(getCurrentActiveUserLocale(), {
    month: 'short',
    day: 'numeric'
  })

interface OverlappingInfo {
  fullyWithin: number
  spanningInto: number
  spanningOut: number
  spanningAcross: number
  spanningIntoRequests: any[]
  spanningOutRequests: any[]
  fullyWithinRequests: any[]
  spanningAcrossRequests: any[]
}

interface CurrentUIState {
  title: string
  description: string
  breadcrumb: string
  hasChangedFilters: boolean
  currentDateRange: { startDate?: string; endDate?: string }
}

interface DynamicAnalysisSource {
  sourceData: any[]
  isFiltered: boolean
  appliedFilters: any
}

const getEmptyOverlappingInfo = (): OverlappingInfo => ({
  fullyWithin: 0,
  spanningInto: 0,
  spanningOut: 0,
  spanningAcross: 0,
  spanningIntoRequests: [],
  spanningOutRequests: [],
  fullyWithinRequests: [],
  spanningAcrossRequests: []
})

const doesDateOverlapRange = (absence: any, rangeStart: Date, rangeEnd: Date): boolean => {
  const absenceStart = new Date(absence.startDate)
  const absenceEnd = new Date(absence.endDate)
  return absenceStart <= rangeEnd && absenceEnd >= rangeStart
}

const matchesDepartmentSelection = (
  absence: any,
  selectedDeptIds: string[],
  includeNoDepartment: boolean,
  department?: string
): boolean => {
  const employeeDepartment = absence.employee?.employeePosition?.organizationalUnit
  const employeeDepartmentId = employeeDepartment?.id

  if (selectedDeptIds.length > 0 || includeNoDepartment) {
    const matchesSelectedDepartment = selectedDeptIds.includes(employeeDepartmentId ?? '')
    const matchesNoDepartment = includeNoDepartment && !employeeDepartment?.id
    return matchesSelectedDepartment || matchesNoDepartment
  }

  if (!department) {
    return true
  }

  const deptName = employeeDepartment?.name
  if (department === 'NO_DEPARTMENT_SPECIAL') {
    return !deptName || deptName.trim() === ''
  }

  return deptName === department
}

const matchesStatusSelection = (absence: any, effectiveStatusSet: Set<string>): boolean => {
  if (effectiveStatusSet.size === 0) {
    return true
  }

  return effectiveStatusSet.has(String(absence.status || '').toUpperCase())
}

const matchesEmployeeSelection = (absence: any, selectedEmployeeIds: string[]): boolean => {
  if (selectedEmployeeIds.length === 0) {
    return true
  }

  return selectedEmployeeIds.includes(absence.employee?.id)
}

const getCurrentDateRange = (
  currentFilteredData: any,
  startDate?: string,
  endDate?: string
): { startDate?: string; endDate?: string } => ({
  startDate: currentFilteredData?.appliedFilters?.currentDateRange?.startDate || startDate,
  endDate: currentFilteredData?.appliedFilters?.currentDateRange?.endDate || endDate
})

const buildFilteredDescriptionParts = (filters: any): string[] => {
  const parts: string[] = []

  if (filters.currentDateRange?.startDate && filters.currentDateRange?.endDate) {
    parts.push(
      `${formatDateForLocale(filters.currentDateRange.startDate)} ${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.to_date', 'to')} ${formatDateForLocale(filters.currentDateRange.endDate)}`
    )
  }

  if (filters.search) {
    parts.push(`"${filters.search}"`)
  }

  if (filters.selectedFilters?.length > 0) {
    parts.push(
      `${filters.selectedFilters.length} ${getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.absence_details.filters', 'filters')}`
    )
  }

  return parts
}

interface UIStateConfig {
  currentDateRange: { startDate?: string; endDate?: string }
  hasChangedFilters: boolean
  titleKey: string
  titleFallback: string
  description: string
  breadcrumbKey: string
  breadcrumbFallback: string
}

const buildUIState = ({
  currentDateRange,
  hasChangedFilters,
  titleKey,
  titleFallback,
  description,
  breadcrumbKey,
  breadcrumbFallback
}: UIStateConfig): CurrentUIState => ({
  title: getTranslationFromI18nKeyAndLabel(titleKey, titleFallback),
  description,
  breadcrumb: getTranslationFromI18nKeyAndLabel(breadcrumbKey, breadcrumbFallback),
  hasChangedFilters,
  currentDateRange
})

const buildDateRangeDescription = (
  currentDateRange: { startDate?: string; endDate?: string },
  fallbackKey: string,
  fallbackValue: string
): string => {
  if (currentDateRange.startDate && currentDateRange.endDate) {
    return `${formatDateForLocale(currentDateRange.startDate)} ${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.to_date', 'to')} ${formatDateForLocale(currentDateRange.endDate)}`
  }

  return getTranslationFromI18nKeyAndLabel(fallbackKey, fallbackValue)
}

const resolveCustomFiltersUIState = (
  currentDateRange: { startDate?: string; endDate?: string },
  hasChangedFilters: boolean,
  filters: any
): CurrentUIState => {
  const descriptionParts = buildFilteredDescriptionParts(filters)
  const hasDescriptionParts = descriptionParts.length > 0

  return {
    title: hasDescriptionParts
      ? getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_backoffice.absence_details.filtered_absence_details',
          'Filtered Absence Details'
        )
      : getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_backoffice.absence_details.title',
          'Absence Details'
        ),
    description: hasDescriptionParts
      ? descriptionParts.join(' • ')
      : getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_backoffice.absence_details.all_absence_results',
          'All absence results'
        ),
    breadcrumb: getTranslationFromI18nKeyAndLabel(
      'lowcoder:absence_management_hub_backoffice.absence_details.custom_filters',
      'Custom Filters'
    ),
    hasChangedFilters,
    currentDateRange
  }
}

const resolveMonthUIState = (
  currentDateRange: { startDate?: string; endDate?: string },
  hasChangedFilters: boolean,
  month: string
): CurrentUIState =>
  buildUIState({
    currentDateRange,
    hasChangedFilters,
    titleKey: 'lowcoder:absence_management_hub_backoffice.absence_details.month_absence_details',
    titleFallback: `${month} Absence Details`,
    description: buildDateRangeDescription(
      currentDateRange,
      'lowcoder:absence_management_hub_backoffice.absence_details.all_absences_for_month',
      `All absences for ${month}`
    ),
    breadcrumbKey: 'lowcoder:absence_management_hub_backoffice.absence_details.month_details',
    breadcrumbFallback: `${month} Details`
  })

const resolveDepartmentUIState = (
  currentDateRange: { startDate?: string; endDate?: string },
  hasChangedFilters: boolean,
  department: string
): CurrentUIState =>
  buildUIState({
    currentDateRange,
    hasChangedFilters,
    titleKey: 'lowcoder:absence_management_hub_backoffice.absence_details.department_details',
    titleFallback: `${department} Department Details`,
    description: getTranslationFromI18nKeyAndLabel(
      'lowcoder:absence_management_hub_backoffice.absence_details.all_absences_for_department',
      `All absences for ${department} department`
    ),
    breadcrumbKey: 'lowcoder:absence_management_hub_backoffice.absence_details.department',
    breadcrumbFallback: `${department} Department`
  })

const resolveStatusUIState = (
  currentDateRange: { startDate?: string; endDate?: string },
  hasChangedFilters: boolean,
  status: string
): CurrentUIState =>
  buildUIState({
    currentDateRange,
    hasChangedFilters,
    titleKey: 'lowcoder:absence_management_hub_backoffice.absence_details.status_details',
    titleFallback: `${status} Status Details`,
    description: getTranslationFromI18nKeyAndLabel(
      'lowcoder:absence_management_hub_backoffice.absence_details.all_status_absences',
      `All ${status.toLowerCase()} absences`
    ),
    breadcrumbKey: 'lowcoder:absence_management_hub_backoffice.absence_details.status',
    breadcrumbFallback: `${status} Status`
  })

const resolveDefaultUIState = (
  currentDateRange: { startDate?: string; endDate?: string },
  hasChangedFilters: boolean
): CurrentUIState =>
  buildUIState({
    currentDateRange,
    hasChangedFilters,
    titleKey: 'lowcoder:absence_management_hub_backoffice.absence_details.title',
    titleFallback: 'Absence Details',
    description: getTranslationFromI18nKeyAndLabel(
      'lowcoder:absence_management_hub_backoffice.absence_details.filtered_results',
      'Filtered absence results'
    ),
    breadcrumbKey: 'lowcoder:absence_management_hub_backoffice.absence_details.filtered_details',
    breadcrumbFallback: 'Filtered Details'
  })

const resolveCurrentUIState = ({
  currentFilteredData,
  startDate,
  endDate,
  month,
  department,
  status
}: {
  currentFilteredData: any
  startDate?: string
  endDate?: string
  month?: string
  department?: string
  status?: string
}): CurrentUIState => {
  const currentDateRange = getCurrentDateRange(currentFilteredData, startDate, endDate)
  const hasChangedFilters =
    currentFilteredData?.isFiltered || currentDateRange.startDate !== startDate || currentDateRange.endDate !== endDate

  if (hasChangedFilters && currentFilteredData?.appliedFilters) {
    return resolveCustomFiltersUIState(currentDateRange, hasChangedFilters, currentFilteredData.appliedFilters)
  }

  if (month) {
    return resolveMonthUIState(currentDateRange, hasChangedFilters, month)
  }

  if (department) {
    return resolveDepartmentUIState(currentDateRange, hasChangedFilters, department)
  }

  if (status) {
    return resolveStatusUIState(currentDateRange, hasChangedFilters, status)
  }

  return resolveDefaultUIState(currentDateRange, hasChangedFilters)
}

const resolveDynamicAnalysisSource = ({
  currentFilteredData,
  filteredAbsencesForMonth,
  startDate,
  endDate,
  month,
  department,
  status
}: {
  currentFilteredData: any
  filteredAbsencesForMonth: { absences: any[] }
  startDate?: string
  endDate?: string
  month?: string
  department?: string
  status?: string
}): DynamicAnalysisSource | null => {
  if (currentFilteredData?.absences?.length) {
    return {
      sourceData: currentFilteredData.absences,
      isFiltered: currentFilteredData.isFiltered,
      appliedFilters: currentFilteredData.appliedFilters
    }
  }

  if (filteredAbsencesForMonth?.absences?.length) {
    return {
      sourceData: filteredAbsencesForMonth.absences,
      isFiltered: !!(startDate || endDate || month || department || status),
      appliedFilters: {
        dateRange: startDate || endDate ? { startDate, endDate } : undefined,
        month,
        department,
        status
      }
    }
  }

  return null
}

const AbsenceDetails: React.FC<AbsenceDetailsProps> = ({
  accessToken,
  userInfo,
  month,
  startDate,
  endDate,
  status,
  department,
  departmentId,
  dashboardData,
  onNavigateBack
}) => {
  const { t } = useTranslation(translations)
  const graphQLClient = useGraphQLClient(accessToken)

  // Resolve initial date range from provided props or dashboard time filter
  const resolvedStartDate = React.useMemo(() => {
    const absenceTimeFilter = getGlobalAbsenceTimeFilter()

    if (startDate) return startDate
    if (month) return dayjs(month).startOf('month').format('YYYY-MM-DD')
    if (status && !startDate && !endDate) {
      // no-op: will be handled by fallbacks below
    }
    if (absenceTimeFilter === 'month') {
      return dayjs().startOf('month').format('YYYY-MM-DD')
    }
    if (absenceTimeFilter === 'quarter') {
      const qStart = dayjs().startOf('quarter')
      return qStart.format('YYYY-MM-DD')
    }
    return dayjs().startOf('year').format('YYYY-MM-DD')
  }, [startDate, month, status])

  const resolvedEndDate = React.useMemo(() => {
    const absenceTimeFilter = getGlobalAbsenceTimeFilter()

    if (endDate) return endDate
    if (month) return dayjs(month).endOf('month').format('YYYY-MM-DD')
    if (absenceTimeFilter === 'month') {
      return dayjs().endOf('month').format('YYYY-MM-DD')
    }
    if (absenceTimeFilter === 'quarter') {
      const qEnd = dayjs().endOf('quarter')
      return qEnd.format('YYYY-MM-DD')
    }
    return dayjs().endOf('year').format('YYYY-MM-DD')
  }, [endDate, month])

  // Ensure page starts at the top when navigating from dashboard
  useLayoutEffect(() => {
    try {
      globalThis.window.scrollTo({ top: 0, behavior: 'auto' })
    } catch {}
  }, [])

  // Server-side aggregates for details KPIs
  const [serverTotalRequests, setServerTotalRequests] = useState<number | null>(null)
  const [serverTotalDays, setServerTotalDays] = useState<number | null>(null)
  const [serverUniqueEmployees, setServerUniqueEmployees] = useState<number | null>(null)
  const [serverStatusBreakdown, setServerStatusBreakdown] = useState<OverlapStatusResult | null>(null)

  // 🚀 PHASE 2: Track current filtered data for dynamic analysis
  const [currentFilteredData, setCurrentFilteredData] = useState<{
    absences: any[]
    total: number
    isFiltered: boolean
    appliedFilters: any
  } | null>(null)

  // Build effective filters for server/local calculations
  const buildEffectiveFilters = useCallback(() => {
    const selected = currentFilteredData?.appliedFilters?.selectedFilters || []
    const departmentIds: string[] = []
    let includeNoDepartment = false
    const statuses: string[] = []
    const employeeIds: string[] = []
    const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

    selected.forEach((token: string) => {
      if (token.startsWith('department-')) {
        const id = token.replace('department-', '')
        if (id === 'no-department') includeNoDepartment = true
        else if (id) departmentIds.push(id)
      } else if (token.startsWith('status-')) {
        const s = token.replace('status-', '')
        if (s) statuses.push(s.toUpperCase())
      } else if (token && uuidRegex.test(token)) {
        employeeIds.push(token)
      }
    })

    const activeStart =
      currentFilteredData?.appliedFilters?.currentDateRange?.startDate || startDate || resolvedStartDate
    const activeEnd = currentFilteredData?.appliedFilters?.currentDateRange?.endDate || endDate || resolvedEndDate
    const { startIso, endIso } = toUtcDayRangeISO(activeStart, activeEnd)

    return {
      activeStart,
      activeEnd,
      startIso: startIso || dayjs(activeStart).startOf('day').toISOString(),
      endIso: endIso || dayjs(activeEnd).endOf('day').toISOString(),
      departmentIds,
      includeNoDepartment,
      statuses,
      employeeIds
    }
  }, [
    currentFilteredData?.appliedFilters?.currentDateRange?.startDate,
    currentFilteredData?.appliedFilters?.currentDateRange?.endDate,
    currentFilteredData?.appliedFilters?.selectedFilters,
    startDate,
    endDate,
    resolvedStartDate,
    resolvedEndDate
  ])

  // Load aggregates when filters change (date, department/status)
  const loadAggregates = useCallback(() => {
    if (!accessToken) return
    // Require table to seed current filters at least once to avoid mismatches until pagination/search changes
    if (!currentFilteredData) return
    const ef = buildEffectiveFilters()
    const effectiveStatuses = getEffectiveStatusFilters(ef.statuses, status)
    const normalizedStatus = status ? status.toUpperCase() : null

    // Determine effective department filtering strategy
    const hasDynamicDept = (ef.departmentIds && ef.departmentIds.length > 0) || ef.includeNoDepartment
    ;(async () => {
      try {
        const result = await getOverlapAggregates(graphQLClient, {
          startIso: ef.startIso,
          endIso: ef.endIso,
          // Only apply navigation-provided dept when no dynamic dept filters are active
          departmentId: hasDynamicDept ? (undefined as any) : departmentId || null,
          departmentName: hasDynamicDept ? (undefined as any) : department || null,
          departmentIds: ef.departmentIds.length > 0 ? ef.departmentIds : undefined,
          includeNoDepartment: ef.includeNoDepartment || undefined,
          statuses: effectiveStatuses.length > 0 ? effectiveStatuses : undefined,
          employeeIds: ef.employeeIds.length > 0 ? ef.employeeIds : undefined,
          groupIds: (currentFilteredData?.appliedFilters?.selectedFilters || [])
            .filter((t: string) => t.startsWith('group-'))
            .map((t: string) => t.replace('group-', '')),
          status: !effectiveStatuses.length && normalizedStatus ? normalizedStatus : undefined
        })
        setServerTotalRequests(result.totalRequests)
        setServerTotalDays(result.totalDays)
        setServerUniqueEmployees(result.distinctEmployees)

        // Align Status Distribution with dashboard via server aggregates
        const singleStatus = effectiveStatuses.length === 1 ? effectiveStatuses[0] : null
        const statusRes = await getOverlapStatusBreakdown(graphQLClient, {
          startIso: ef.startIso,
          endIso: ef.endIso,
          // Dept rules: prefer exact dynamic selection; if none selected, fall back to navigation department
          departmentId:
            (ef.departmentIds.length === 1 ? ef.departmentIds[0] : undefined) ||
            (hasDynamicDept ? null : departmentId || null),
          departmentName: hasDynamicDept ? null : department || null,
          departmentIds: ef.departmentIds.length > 0 ? ef.departmentIds : undefined,
          includeNoDepartment: ef.includeNoDepartment || undefined,
          employeeIds: ef.employeeIds.length > 0 ? ef.employeeIds : undefined,
          status: singleStatus
        })
        setServerStatusBreakdown(statusRes)
      } catch {
        setServerTotalRequests(null)
        setServerTotalDays(null)
        setServerUniqueEmployees(null)
        setServerStatusBreakdown(null)
      }
    })()
  }, [
    accessToken,
    graphQLClient,
    departmentId,
    department,
    status,
    startDate,
    endDate,
    currentFilteredData?.appliedFilters?.currentDateRange?.startDate,
    currentFilteredData?.appliedFilters?.currentDateRange?.endDate,
    JSON.stringify(currentFilteredData?.appliedFilters?.selectedFilters || [])
  ])

  // 🚀 PHASE 2: Callback to receive filtered data from AbsenceList
  const handleDataChange = useCallback(
    (data: { absences: any[]; total: number; isFiltered: boolean; appliedFilters: any }) => {
      setCurrentFilteredData(data)
    },
    []
  )

  // Run server aggregates whenever dependencies change
  useEffect(() => {
    loadAggregates()
  }, [loadAggregates])

  // Ensure first aggregates run immediately after table seeds currentFilteredData
  useEffect(() => {
    if (accessToken && currentFilteredData) {
      loadAggregates()
    }
  }, [accessToken, currentFilteredData, loadAggregates])

  // 🎯 FILTER rawAbsences for the specific month/date range - MOVE THIS BEFORE EARLY RETURNS
  const filteredAbsencesForMonth = useMemo(() => {
    // 🔧 FIX: Use current date ranges from table if available, otherwise use props
    const currentStartDate =
      currentFilteredData?.appliedFilters?.currentDateRange?.startDate || startDate || resolvedStartDate
    const currentEndDate = currentFilteredData?.appliedFilters?.currentDateRange?.endDate || endDate || resolvedEndDate
    const selected = currentFilteredData?.appliedFilters?.selectedFilters || []
    const selectedDeptIds: string[] = []
    let includeNoDepartment = false
    const selectedStatuses: string[] = []
    const selectedEmployeeIds: string[] = []

    selected.forEach((token: string) => {
      if (token.startsWith('department-')) {
        const id = token.replace('department-', '')
        if (id === 'no-department') includeNoDepartment = true
        else if (id) selectedDeptIds.push(id)
      } else if (token.startsWith('status-')) {
        const s = token.replace('status-', '')
        if (s) selectedStatuses.push(s.toUpperCase())
      } else if (token && token.length > 0 && !token.includes('-')) {
        selectedEmployeeIds.push(token)
      }
    })

    if (!currentStartDate || !currentEndDate || !dashboardData.rawAbsences) {
      return {
        absences: dashboardData.rawAbsences || [],
        overlappingInfo: getEmptyOverlappingInfo()
      }
    }

    const { startIso: rs, endIso: re } = toUtcDayRangeISO(currentStartDate, currentEndDate)
    const rangeStart = rs ? new Date(rs) : new Date(dayjs(currentStartDate).toISOString())
    const rangeEnd = re ? new Date(re) : new Date(dayjs(currentEndDate).toISOString())
    const effectiveStatusSet = new Set(getEffectiveStatusFilters(selectedStatuses, status))

    // Filter absences using overlap logic AND department/status/employee filters
    const filtered = dashboardData.rawAbsences.filter((absence: any) => {
      if (!doesDateOverlapRange(absence, rangeStart, rangeEnd)) {
        return false
      }

      if (!matchesDepartmentSelection(absence, selectedDeptIds, includeNoDepartment, department)) {
        return false
      }

      if (!matchesStatusSelection(absence, effectiveStatusSet)) {
        return false
      }

      return matchesEmployeeSelection(absence, selectedEmployeeIds)
    })

    // Categorize overlapping types for analysis
    const fullyWithinRequests: any[] = []
    const spanningIntoRequests: any[] = []
    const spanningOutRequests: any[] = []
    const spanningAcrossRequests: any[] = []

    filtered.forEach((absence: any) => {
      const absenceStart = new Date(absence.startDate)
      const absenceEnd = new Date(absence.endDate)

      if (absenceStart >= rangeStart && absenceEnd <= rangeEnd) {
        fullyWithinRequests.push(absence)
      } else if (absenceStart < rangeStart && absenceEnd <= rangeEnd) {
        spanningIntoRequests.push(absence)
      } else if (absenceStart >= rangeStart && absenceEnd > rangeEnd) {
        spanningOutRequests.push(absence)
      } else if (absenceStart < rangeStart && absenceEnd > rangeEnd) {
        spanningAcrossRequests.push(absence)
      }
    })

    const overlappingInfo = {
      fullyWithin: fullyWithinRequests.length,
      spanningInto: spanningIntoRequests.length,
      spanningOut: spanningOutRequests.length,
      spanningAcross: spanningAcrossRequests.length,
      fullyWithinRequests,
      spanningIntoRequests,
      spanningOutRequests,
      spanningAcrossRequests
    }

    return { absences: filtered, overlappingInfo }
  }, [
    dashboardData.rawAbsences,
    startDate,
    endDate,
    month,
    department,
    status,
    // ✅ RESTORED: Add current date range from table to allow date filter updates
    currentFilteredData?.appliedFilters?.currentDateRange?.startDate,
    currentFilteredData?.appliedFilters?.currentDateRange?.endDate,
    resolvedStartDate,
    resolvedEndDate
  ])

  // 🚀 PHASE 2: Dynamic analysis calculations based on current filtered table data
  const dynamicAnalysis = useMemo(() => {
    const source = resolveDynamicAnalysisSource({
      currentFilteredData,
      filteredAbsencesForMonth,
      startDate,
      endDate,
      month,
      department,
      status
    })

    if (!source) {
      return null
    }

    if (!source.sourceData.length) {
      return null
    }

    const filteredAbsences = source.sourceData

    // Calculate core metrics
    // Prefer server aggregates; if missing/zero, fall back to current list to avoid stale zeros
    const localTotalRequests =
      typeof currentFilteredData?.total === 'number' ? currentFilteredData.total : filteredAbsences.length
    const localTotalDays = filteredAbsences.reduce((sum: number, a: any) => sum + (Number(a.effectiveDays) || 0), 0)
    const localUniqueEmployees = new Set((filteredAbsences || []).map((a: any) => a?.employee?.id).filter(Boolean)).size

    const totalRequests = serverTotalRequests && serverTotalRequests > 0 ? serverTotalRequests : localTotalRequests
    const totalDays = serverTotalDays && serverTotalDays > 0 ? serverTotalDays : localTotalDays
    const uniqueEmployees =
      serverUniqueEmployees && serverUniqueEmployees > 0 ? serverUniqueEmployees : localUniqueEmployees

    // Calculate averages
    const avgDaysPerEmployee = uniqueEmployees > 0 ? Math.round((totalDays / uniqueEmployees) * 100) / 100 : 0
    const avgDaysPerRequest = totalRequests > 0 ? Math.round((totalDays / totalRequests) * 100) / 100 : 0

    // Status breakdown: prefer server aggregate for parity with dashboard, fallback to local
    let statusBreakdown: Record<string, number> = {}
    if (serverStatusBreakdown) {
      statusBreakdown = {
        APPROVED: serverStatusBreakdown.APPROVED.count,
        PENDING: serverStatusBreakdown.PENDING.count,
        REJECTED: serverStatusBreakdown.REJECTED.count,
        CANCELLED: serverStatusBreakdown.CANCELLED.count
      }
      Object.entries(statusBreakdown).forEach(([statusKey, count]) => {
        if (!count) {
          delete statusBreakdown[statusKey]
        }
      })
    } else {
      statusBreakdown = filteredAbsences.reduce((acc: any, absence: any) => {
        const s =
          absence.status ||
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_management_hub_backoffice.absence_details.unknown',
            'Unknown'
          )
        acc[s] = (acc[s] || 0) + 1
        return acc
      }, {})
    }

    // Department breakdown from current filtered data
    const departmentBreakdown = filteredAbsences.reduce((acc: any, absence: any) => {
      const deptName =
        absence.employee?.employeePosition?.organizationalUnit?.name ||
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_management_hub_backoffice.absence_details.no_department',
          'No Department'
        )
      acc[deptName] = (acc[deptName] || 0) + 1
      return acc
    }, {})

    return {
      totalRequests,
      totalDays,
      uniqueEmployees,
      avgDaysPerEmployee,
      avgDaysPerRequest,
      statusBreakdown,
      departmentBreakdown,
      isFiltered: source.isFiltered,
      appliedFilters: source.appliedFilters
    }
  }, [
    filteredAbsencesForMonth,
    startDate,
    endDate,
    month,
    department,
    status,
    // ✅ RESTORED: Add specific currentFilteredData properties to restore live dashboard
    currentFilteredData?.absences?.length,
    currentFilteredData?.total,
    currentFilteredData?.isFiltered,
    // Use JSON.stringify for appliedFilters to detect deep changes safely
    JSON.stringify(currentFilteredData?.appliedFilters || {}),
    serverTotalRequests,
    serverTotalDays,
    serverUniqueEmployees,
    JSON.stringify(serverStatusBreakdown || null)
  ])

  // 🎯 Dynamic UI Labels - Show current filter state
  const currentUIState = useMemo(
    () =>
      resolveCurrentUIState({
        currentFilteredData,
        startDate,
        endDate,
        month,
        department,
        status
      }),
    [
      startDate,
      endDate,
      month,
      department,
      status,
      currentFilteredData?.isFiltered,
      JSON.stringify(currentFilteredData?.appliedFilters || {})
    ]
  )

  const analysisTitle = useMemo(() => {
    const analysisLabel = getTranslationFromI18nKeyAndLabel(
      'lowcoder:absence_management_hub_backoffice.absence_details.analysis',
      'Analysis'
    )
    const departmentLabel = getTranslationFromI18nKeyAndLabel(
      'lowcoder:absence_management_hub_backoffice.absence_details.department',
      'Department'
    )

    if (currentUIState.hasChangedFilters) {
      if (department) {
        return `${analysisLabel}: ${department} ${departmentLabel}`
      }

      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_backoffice.absence_details.date_range_analysis',
        'Date Range Analysis'
      )
    }

    if (month) {
      return `${analysisLabel}: ${month}`
    }

    if (department) {
      return `${analysisLabel}: ${department} ${departmentLabel}`
    }

    return getTranslationFromI18nKeyAndLabel(
      'lowcoder:absence_management_hub_backoffice.absence_details.absence_analysis',
      'Absence Analysis'
    )
  }, [currentUIState.hasChangedFilters, department, month])

  const analysisDescription = useMemo(() => {
    if (currentUIState.hasChangedFilters) {
      if (currentUIState.currentDateRange.startDate && currentUIState.currentDateRange.endDate) {
        return `${getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.absence_details.live_analysis', 'Live Analysis')} • ${formatDateForLocale(currentUIState.currentDateRange.startDate)} ${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.to_date', 'to')} ${formatDateForLocale(currentUIState.currentDateRange.endDate)}`
      }

      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_backoffice.absence_details.live_analysis_custom_filters',
        'Live Analysis • Custom filters applied'
      )
    }

    if (month && startDate && endDate) {
      return `${getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.absence_details.drilled_down_trends', 'Drilled down from trends chart')} • ${formatDateForLocale(startDate)} ${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.to_date', 'to')} ${formatDateForLocale(endDate)}`
    }

    if (department) {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_backoffice.absence_details.drilled_down_department',
        'Drilled down from department chart'
      )
    }

    if (status) {
      return getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_management_hub_backoffice.absence_details.drilled_down_status',
        'Drilled down from status chart'
      )
    }

    return getTranslationFromI18nKeyAndLabel(
      'lowcoder:absence_management_hub_backoffice.absence_details.current_table_analysis',
      'Current table data analysis'
    )
  }, [
    currentUIState.currentDateRange.endDate,
    currentUIState.currentDateRange.startDate,
    currentUIState.hasChangedFilters,
    month,
    startDate,
    endDate,
    department,
    status
  ])

  // 🚀 CRITICAL: Handle loading state properly - AFTER ALL HOOKS
  if (dashboardData.isLoading) {
    return (
      <div className="gba:p-6">
        <div className="gba:flex gba:items-center gba:gap-4 gba:mb-6">
          <Button onClick={onNavigateBack} className="gba:flex gba:items-center gba:gap-2">
            <ArrowLeftIcon />
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.absence_details.back_to_dashboard',
              'Back to Dashboard'
            )}
          </Button>
        </div>
        <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
          <div className="gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_hub.loading_absence_details',
              'Loading absence details...'
            )}
          </div>
        </div>
      </div>
    )
  }

  // 🚀 CRITICAL: Handle error state properly - AFTER ALL HOOKS
  if (dashboardData.error) {
    const fallbackMessage = t('error-loading-absence-details')

    return (
      <div className="gba:p-6">
        <div className="gba:flex gba:items-center gba:gap-4 gba:mb-6">
          <Button onClick={onNavigateBack} className="gba:flex gba:items-center gba:gap-2">
            <ArrowLeftIcon />
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_backoffice.absence_details.back_to_dashboard',
              'Back to Dashboard'
            )}
          </Button>
        </div>
        <ErrorStateCard message={getSafeHubErrorMessage(fallbackMessage)} />
      </div>
    )
  }

  return (
    <div data-testid="absence-details-page" className="gba:space-y-6">
      {/* Back Navigation - Above everything */}
      <div className="gba:mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={onNavigateBack}
          className="gba:flex gba:items-center gba:gap-2"
          data-testid="back-to-dashboard-button"
        >
          <ArrowLeftIcon size={16} />
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_management_hub_backoffice.absence_details.back_to_dashboard',
            'Back to Dashboard'
          )}
        </Button>
      </div>

      {/* Page Header */}
      <div className="gba:bg-card gba:p-6 gba:rounded-lg gba:border gba:shadow-sm">
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-3">
            <CalendarBlankIcon size={24} className="gba:text-info" />
            <div>
              <h1 className="gba:text-2xl gba:font-bold gba:text-foreground">{currentUIState.title}</h1>
              <p className="gba:text-muted-foreground gba:mt-1">{currentUIState.description}</p>
            </div>
          </div>

          {/* Breadcrumb */}
          <div className="gba:text-sm gba:text-muted-foreground">
            <button
              type="button"
              className="gba:border-none gba:bg-transparent gba:p-0 gba:text-info hover:gba:underline"
              onClick={onNavigateBack}
              data-testid="absence-details-breadcrumb-dashboard-button"
            >
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_backoffice.absence_details.absence_dashboard',
                'Absence Dashboard'
              )}
            </button>
            <span className="gba:mx-2">/</span>
            <span>{currentUIState.breadcrumb}</span>
          </div>
        </div>
      </div>

      {/* 🚀 PHASE 2: Universal Dynamic Analysis - Shows when table is filtered */}
      {dynamicAnalysis && (
        <div className="gba:bg-card gba:border gba:rounded-lg gba:p-4">
          <div className="gba:mb-3">
            <div className="gba:text-foreground gba:font-medium gba:text-base gba:mb-1">
              {analysisTitle}
              <span className="gba:ml-2 gba:text-xs gba:bg-muted gba:text-foreground gba:px-2 gba:py-1 gba:rounded">
                {dynamicAnalysis.isFiltered
                  ? getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_management_hub_backoffice.absence_details.filtered',
                      'Filtered'
                    )
                  : getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_management_hub_backoffice.absence_details.live',
                      'Live'
                    )}
              </span>
            </div>
            <div className="gba:text-muted-foreground gba:text-sm">
              {analysisDescription}
              {dynamicAnalysis.isFiltered && (
                <span className="gba:ml-2">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_management_hub_backoffice.absence_details.updates_automatically',
                    '• Updates automatically'
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Dynamic Analysis Grid - Main Metrics as Cards */}
          <div className="gba:grid gba:grid-cols-2 gba:md:grid-cols-4 gba:gap-3">
            <Card data-testid="details-kpi-total-days">
              <CardHeader className="gba:pb-2">
                <CardTitle className="gba:text-sm gba:font-medium">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_management_hub_backoffice.total_days',
                    'Total Days'
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="gba:pt-0">
                <div
                  className="gba:text-2xl gba:font-bold gba:text-foreground"
                  data-testid="details-kpi-total-days-value"
                >
                  {dynamicAnalysis.totalDays}
                </div>
                <div className="gba:text-xs gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_management_hub_backoffice.absence_details.filtered_results',
                    'Filtered Results'
                  )}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="details-kpi-total-requests">
              <CardHeader className="gba:pb-2">
                <CardTitle className="gba:text-sm gba:font-medium">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_management_hub_backoffice.absence_details.total_requests',
                    'Total Requests'
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="gba:pt-0">
                <div
                  className="gba:text-2xl gba:font-bold gba:text-foreground"
                  data-testid="details-kpi-total-requests-value"
                >
                  {dynamicAnalysis.totalRequests}
                </div>
                <div className="gba:text-xs gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_management_hub_backoffice.absence_details.filtered_results',
                    'Filtered Results'
                  )}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="details-kpi-employees">
              <CardHeader className="gba:pb-2">
                <CardTitle className="gba:text-sm gba:font-medium">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_management_hub_backoffice.absence_details.employees',
                    'Employees'
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="gba:pt-0">
                <div
                  className="gba:text-2xl gba:font-bold gba:text-foreground"
                  data-testid="details-kpi-employees-value"
                >
                  {dynamicAnalysis.uniqueEmployees}
                </div>
                <div className="gba:text-xs gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_management_hub_backoffice.absence_details.filtered_results',
                    'Filtered Results'
                  )}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="details-kpi-avg-days-per-employee">
              <CardHeader className="gba:pb-2">
                <CardTitle className="gba:text-sm gba:font-medium">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_management_hub_backoffice.absence_details.avg_days_per_employee',
                    'Avg Days/Employee'
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="gba:pt-0">
                <div
                  className="gba:text-2xl gba:font-bold gba:text-foreground"
                  data-testid="details-kpi-avg-days-per-employee-value"
                >
                  {dynamicAnalysis.avgDaysPerEmployee}
                </div>
                <div className="gba:text-xs gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_management_hub_backoffice.absence_details.filtered_results',
                    'Filtered Results'
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Analysis - 4 Cards in a Row */}
          <div className="gba:mt-3 gba:grid gba:gap-3 gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-4">
            {/* Cross-Month Analysis Card - First Position */}
            <Card>
              <CardHeader className="gba:pb-2">
                <CardTitle className="gba:text-sm gba:font-medium">
                  {month
                    ? `${getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.absence_details.cross_month_analysis', 'Cross-Month Analysis')} (${month})`
                    : getTranslationFromI18nKeyAndLabel(
                        'lowcoder:absence_management_hub_backoffice.absence_details.request_details',
                        'Request Details'
                      )}
                </CardTitle>
              </CardHeader>
              <CardContent className="gba:pt-0">
                {filteredAbsencesForMonth.overlappingInfo &&
                (filteredAbsencesForMonth.overlappingInfo.spanningInto > 0 ||
                  filteredAbsencesForMonth.overlappingInfo.spanningOut > 0 ||
                  filteredAbsencesForMonth.overlappingInfo.spanningAcross > 0) ? (
                  <div className="gba:text-xs gba:text-muted-foreground gba:space-y-1">
                    <div>
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:absence_management_hub_backoffice.absence_details.fully_within_period',
                        'Fully within period'
                      )}
                      : {filteredAbsencesForMonth.overlappingInfo.fullyWithin}{' '}
                      {getTranslationFromI18nKeyAndLabel(
                        'lowcoder:absence_management_hub_backoffice.absence_details.requests',
                        'requests'
                      )}
                    </div>
                    {filteredAbsencesForMonth.overlappingInfo.spanningInto > 0 && (
                      <div>
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:absence_management_hub_backoffice.absence_details.spanning_into_period',
                          'Spanning INTO period'
                        )}
                        : {filteredAbsencesForMonth.overlappingInfo.spanningInto}{' '}
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:absence_management_hub_backoffice.absence_details.requests',
                          'requests'
                        )}
                      </div>
                    )}
                    {filteredAbsencesForMonth.overlappingInfo.spanningOut > 0 && (
                      <div>
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:absence_management_hub_backoffice.absence_details.spanning_out_period',
                          'Spanning OUT of period'
                        )}
                        : {filteredAbsencesForMonth.overlappingInfo.spanningOut}{' '}
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:absence_management_hub_backoffice.absence_details.requests',
                          'requests'
                        )}
                      </div>
                    )}
                    {filteredAbsencesForMonth.overlappingInfo.spanningAcross > 0 && (
                      <div>
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:absence_management_hub_backoffice.absence_details.spanning_across_period',
                          'Spanning ACROSS period'
                        )}
                        : {filteredAbsencesForMonth.overlappingInfo.spanningAcross}{' '}
                        {getTranslationFromI18nKeyAndLabel(
                          'lowcoder:absence_management_hub_backoffice.absence_details.requests',
                          'requests'
                        )}
                      </div>
                    )}

                    {/* Detailed Employee Info for Spanning Requests */}
                    {(filteredAbsencesForMonth.overlappingInfo.spanningIntoRequests?.length > 0 ||
                      filteredAbsencesForMonth.overlappingInfo.spanningOutRequests?.length > 0) && (
                      <div className="gba:mt-2 gba:pt-2 gba:border-t gba:border">
                        {filteredAbsencesForMonth.overlappingInfo.spanningIntoRequests?.length > 0 && (
                          <div className="gba:mb-1">
                            <span className="gba:font-medium">
                              {getTranslationFromI18nKeyAndLabel(
                                'lowcoder:absence_management_hub_backoffice.absence_details.into',
                                'INTO'
                              )}
                              :
                            </span>{' '}
                            {filteredAbsencesForMonth.overlappingInfo.spanningIntoRequests
                              .slice(0, 2)
                              .map((absence: any, index: number) => {
                                const employeeName =
                                  absence.employeeName ||
                                  `${absence.employee?.firstName || ''} ${absence.employee?.lastName || ''}`.trim()
                                return (
                                  <span key={absence.id || index} className="gba:text-muted-foreground">
                                    {index > 0 && ', '}
                                    {employeeName} ({formatShortDateForLocale(absence.startDate)}-
                                    {formatShortDateForLocale(absence.endDate)})
                                  </span>
                                )
                              })}
                            {filteredAbsencesForMonth.overlappingInfo.spanningIntoRequests.length > 2 && (
                              <span className="gba:text-muted-foreground">
                                {' '}
                                +{filteredAbsencesForMonth.overlappingInfo.spanningIntoRequests.length - 2}{' '}
                                {getTranslationFromI18nKeyAndLabel(
                                  'lowcoder:absence_management_hub_backoffice.absence_details.more',
                                  'more'
                                )}
                              </span>
                            )}
                          </div>
                        )}
                        {filteredAbsencesForMonth.overlappingInfo.spanningOutRequests?.length > 0 && (
                          <div>
                            <span className="gba:font-medium">
                              {getTranslationFromI18nKeyAndLabel(
                                'lowcoder:absence_management_hub_backoffice.absence_details.out',
                                'OUT'
                              )}
                              :
                            </span>{' '}
                            {filteredAbsencesForMonth.overlappingInfo.spanningOutRequests
                              .slice(0, 2)
                              .map((absence: any, index: number) => {
                                const employeeName =
                                  absence.employeeName ||
                                  `${absence.employee?.firstName || ''} ${absence.employee?.lastName || ''}`.trim()
                                return (
                                  <span key={absence.id || index} className="gba:text-muted-foreground">
                                    {index > 0 && ', '}
                                    {employeeName} ({formatShortDateForLocale(absence.startDate)}-
                                    {formatShortDateForLocale(absence.endDate)})
                                  </span>
                                )
                              })}
                            {filteredAbsencesForMonth.overlappingInfo.spanningOutRequests.length > 2 && (
                              <span className="gba:text-muted-foreground">
                                {' '}
                                +{filteredAbsencesForMonth.overlappingInfo.spanningOutRequests.length - 2}{' '}
                                {getTranslationFromI18nKeyAndLabel(
                                  'lowcoder:absence_management_hub_backoffice.absence_details.more',
                                  'more'
                                )}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="gba:text-xs gba:text-muted-foreground">
                    {month
                      ? getTranslationFromI18nKeyAndLabel(
                          'lowcoder:absence_management_hub_backoffice.absence_details.no_cross_month_requests',
                          'No cross-month requests'
                        )
                      : getTranslationFromI18nKeyAndLabel(
                          'lowcoder:absence_management_hub_backoffice.absence_details.all_requests_within_period',
                          'All requests within period'
                        )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Performance Card */}
            <Card>
              <CardHeader className="gba:pb-2">
                <CardTitle className="gba:text-sm gba:font-medium">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_management_hub_backoffice.absence_details.performance',
                    'Performance'
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="gba:pt-0">
                <div className="gba:text-xs gba:text-muted-foreground gba:space-y-1">
                  <div>
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_management_hub_backoffice.absence_details.avg_duration_per_request',
                      'Avg Duration per Request'
                    )}
                    : {dynamicAnalysis.avgDaysPerRequest}{' '}
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_management_hub_backoffice.absence_details.days',
                      'days'
                    )}
                  </div>
                  <div>
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_management_hub_backoffice.absence_details.requests_per_employee',
                      'Requests per Employee'
                    )}
                    :{' '}
                    {dynamicAnalysis.uniqueEmployees > 0
                      ? Math.round((dynamicAnalysis.totalRequests / dynamicAnalysis.uniqueEmployees) * 100) / 100
                      : 0}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Status Distribution Card */}
            <Card>
              <CardHeader className="gba:pb-2">
                <CardTitle className="gba:text-sm gba:font-medium">
                  {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.status_distribution', 'Status Distribution')}
                </CardTitle>
              </CardHeader>
              <CardContent className="gba:pt-0">
                {Object.keys(dynamicAnalysis.statusBreakdown).length > 0 ? (
                  <div className="gba:flex gba:flex-wrap gba:gap-2 gba:text-xs">
                    {Object.entries(dynamicAnalysis.statusBreakdown).map(([status, count]) => (
                      <div
                        key={status}
                        className="gba:text-muted-foreground gba:bg-muted gba:px-2 gba:py-1 gba:rounded"
                      >
                        <span className="gba:font-medium">{getAbsenceStatusLabel(status)}:</span> {count}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="gba:text-xs gba:text-muted-foreground">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_management_hub_backoffice.absence_details.no_status_data',
                      'No status data'
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Department Distribution Card */}
            <Card>
              <CardHeader className="gba:pb-2">
                <CardTitle className="gba:text-sm gba:font-medium">
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:absence_management_hub_backoffice.absence_details.department_distribution',
                    'Department Distribution'
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="gba:pt-0">
                {Object.keys(dynamicAnalysis.departmentBreakdown).length > 0 ? (
                  <div className="gba:flex gba:flex-wrap gba:gap-2 gba:text-xs">
                    {Object.entries(dynamicAnalysis.departmentBreakdown).map(([dept, count]) => (
                      <div key={dept} className="gba:text-muted-foreground gba:bg-muted gba:px-2 gba:py-1 gba:rounded">
                        <span className="gba:font-medium">{dept}:</span> {count}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="gba:text-xs gba:text-muted-foreground">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:absence_management_hub_backoffice.absence_details.no_department_data',
                      'No department data'
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Absence List with MONTH-FILTERED DATA */}
      <AbsenceList
        accessToken={accessToken}
        userInfo={userInfo}
        initialFilters={{
          startDate: resolvedStartDate,
          endDate: resolvedEndDate,
          status,
          department,
          departmentId
        }}
        onDataChange={handleDataChange}
      />
    </div>
  )
}

export default AbsenceDetails
