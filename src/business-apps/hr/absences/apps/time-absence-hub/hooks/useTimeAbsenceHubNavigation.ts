import { useCallback, useEffect, useState } from 'react'
import { AbsenceDetailsFilter } from '../types'
import { generateMonthDateRange } from '../utils/dateUtils'
import { DEFAULT_VIEW, HubView, URL_PARAMS, isHubView, AbsencesSubTab, isAbsencesSubTab } from '../constants/routes'

type LegacyTimeFilter = 'current-year' | 'quarter' | 'month' | 'everything'

export type ViewType = HubView

export interface UseTimeAbsenceHubNavigationReturn {
  currentView: HubView
  activeTab: string
  absenceDetailsFilter: AbsenceDetailsFilter
  timeFilter: LegacyTimeFilter
  setCurrentView: (view: HubView) => void
  setActiveTab: (tab: string) => void
  setTimeFilter: (filter: LegacyTimeFilter) => void
  handleTabChange: (value: string) => void
  handleNavigateToAbsenceDetails: (month: string, year?: number) => void
  handleNavigateBackToDashboard: () => void
  handleNavigateToAbsenceDetailsWithFilters: (filters: AbsenceDetailsFilter) => void
  handleNavigateToEntitlementsDetails: () => void
  handleNavigateToView: (view: HubView, options?: { tab?: string; replace?: boolean }) => void
  handleNavigateToAbsencesSubTab: (subTab: AbsencesSubTab) => void
}

const readSearchParams = (): URLSearchParams =>
  typeof globalThis.location === 'undefined' ? new URLSearchParams() : new URLSearchParams(globalThis.location.search)

const writeUrl = (mutator: (params: URLSearchParams) => void, replace: boolean): void => {
  if (typeof globalThis.location === 'undefined' || typeof globalThis.history === 'undefined') {
    return
  }
  const url = new URL(globalThis.location.href)
  mutator(url.searchParams)
  if (replace) {
    globalThis.history.replaceState({}, '', url.toString())
  } else {
    globalThis.history.pushState({}, '', url.toString())
  }
}

const readDetailsFilterFromUrl = (params: URLSearchParams): AbsenceDetailsFilter => {
  const month = params.get('month') ?? undefined
  const startDate = params.get(URL_PARAMS.dateFrom) ?? undefined
  const endDate = params.get(URL_PARAMS.dateTo) ?? undefined
  const status = params.get(URL_PARAMS.statusIds) ?? undefined
  const department = params.get('department') ?? undefined
  const departmentId = params.get('departmentId') ?? undefined
  return { month, startDate, endDate, status, department, departmentId }
}

const writeDetailsFilterToUrl = (params: URLSearchParams, filters: AbsenceDetailsFilter): void => {
  const setOrDelete = (key: string, value?: string) => {
    if (value) {
      params.set(key, value)
    } else {
      params.delete(key)
    }
  }
  setOrDelete('month', filters.month)
  setOrDelete(URL_PARAMS.dateFrom, filters.startDate)
  setOrDelete(URL_PARAMS.dateTo, filters.endDate)
  setOrDelete(URL_PARAMS.statusIds, filters.status)
  setOrDelete('department', filters.department)
  setOrDelete('departmentId', filters.departmentId)
}

const DEFAULT_SUB_TABS: Record<HubView, string> = {
  dashboard: 'dashboard',
  absences: 'list',
  attendance: 'week',
  entitlements: 'overview',
  compliance: 'overview',
  insights: 'trends',
  reports: 'absence',
  'absence-details': '',
  'entitlements-details': ''
}

const resolveDefaultTab = (view: HubView): string => DEFAULT_SUB_TABS[view] ?? ''

export const useTimeAbsenceHubNavigation = (): UseTimeAbsenceHubNavigationReturn => {
  const initialParams = readSearchParams()
  const initialViewParam = initialParams.get(URL_PARAMS.view)
  const initialView: HubView = isHubView(initialViewParam) ? initialViewParam : DEFAULT_VIEW
  const initialTabParam = initialParams.get(URL_PARAMS.tab)
  const initialTab = initialTabParam ?? resolveDefaultTab(initialView)

  const [currentView, setCurrentViewState] = useState<HubView>(initialView)
  const [activeTab, setActiveTabState] = useState<string>(initialTab)
  const [absenceDetailsFilter, setAbsenceDetailsFilter] = useState<AbsenceDetailsFilter>(
    readDetailsFilterFromUrl(initialParams)
  )
  const [timeFilter, setTimeFilterState] = useState<LegacyTimeFilter>('current-year')

  useEffect(() => {
    if (initialViewParam !== initialView || (!initialTabParam && initialTab)) {
      writeUrl(params => {
        params.set(URL_PARAMS.view, initialView)
        if (initialTab) {
          params.set(URL_PARAMS.tab, initialTab)
        }
      }, true)
    }
  }, [initialView, initialViewParam, initialTab, initialTabParam])

  useEffect(() => {
    const handlePopState = () => {
      const params = readSearchParams()
      const viewParam = params.get(URL_PARAMS.view)
      const nextView: HubView = isHubView(viewParam) ? viewParam : DEFAULT_VIEW
      const tabParam = params.get(URL_PARAMS.tab)
      setCurrentViewState(nextView)
      setActiveTabState(tabParam ?? resolveDefaultTab(nextView))
      setAbsenceDetailsFilter(readDetailsFilterFromUrl(params))
    }
    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [])

  const handleNavigateToView = useCallback((view: HubView, options?: { tab?: string; replace?: boolean }) => {
    const nextTab = options?.tab ?? resolveDefaultTab(view)
    setCurrentViewState(view)
    setActiveTabState(nextTab)
    writeUrl(params => {
      params.set(URL_PARAMS.view, view)
      if (nextTab) {
        params.set(URL_PARAMS.tab, nextTab)
      } else {
        params.delete(URL_PARAMS.tab)
      }
    }, options?.replace ?? false)
  }, [])

  const setCurrentView = useCallback(
    (view: HubView) => {
      handleNavigateToView(view)
    },
    [handleNavigateToView]
  )

  const setActiveTab = useCallback((tab: string) => {
    setActiveTabState(tab)
    writeUrl(params => {
      params.set(URL_PARAMS.tab, tab)
    }, false)
  }, [])

  const handleTabChange = useCallback(
    (value: string) => {
      const isHubLevel = isHubView(value)
      if (isHubLevel) {
        handleNavigateToView(value as HubView)
        return
      }
      setActiveTab(value)
    },
    [handleNavigateToView, setActiveTab]
  )

  const handleNavigateToAbsencesSubTab = useCallback(
    (subTab: AbsencesSubTab) => {
      if (!isAbsencesSubTab(subTab)) {
        return
      }
      handleNavigateToView('absences', { tab: subTab })
    },
    [handleNavigateToView]
  )

  const handleNavigateToAbsenceDetails = useCallback((month: string, year: number = new Date().getFullYear()) => {
    const dateRange = generateMonthDateRange(month, year)
    if (!dateRange) {
      return
    }
    const nextFilter: AbsenceDetailsFilter = {
      month: dateRange.shortMonth,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    }
    setAbsenceDetailsFilter(nextFilter)
    setCurrentViewState('absence-details')
    writeUrl(params => {
      params.set(URL_PARAMS.view, 'absence-details')
      writeDetailsFilterToUrl(params, nextFilter)
    }, false)
  }, [])

  const handleNavigateBackToDashboard = useCallback(() => {
    setAbsenceDetailsFilter({})
    handleNavigateToView('dashboard')
  }, [handleNavigateToView])

  const handleNavigateToAbsenceDetailsWithFilters = useCallback((filters: AbsenceDetailsFilter) => {
    setAbsenceDetailsFilter(filters)
    setCurrentViewState('absence-details')
    writeUrl(params => {
      params.set(URL_PARAMS.view, 'absence-details')
      writeDetailsFilterToUrl(params, filters)
    }, false)
  }, [])

  const handleNavigateToEntitlementsDetails = useCallback(() => {
    setCurrentViewState('entitlements-details')
    writeUrl(params => {
      params.set(URL_PARAMS.view, 'entitlements-details')
    }, false)
  }, [])

  const setTimeFilter = useCallback((filter: LegacyTimeFilter) => {
    setTimeFilterState(filter)
  }, [])

  return {
    currentView,
    activeTab,
    absenceDetailsFilter,
    timeFilter,
    setCurrentView,
    setActiveTab,
    setTimeFilter,
    handleTabChange,
    handleNavigateToAbsenceDetails,
    handleNavigateBackToDashboard,
    handleNavigateToAbsenceDetailsWithFilters,
    handleNavigateToEntitlementsDetails,
    handleNavigateToView,
    handleNavigateToAbsencesSubTab
  }
}
