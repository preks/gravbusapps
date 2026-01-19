import { useState, useCallback } from 'react'
import { AbsenceDetailsFilter } from '../types'
import { generateMonthDateRange } from '../utils/dateUtils'

export type ViewType = 'tabs' | 'absence-details' | 'entitlements-details'

export interface UseBackofficeNavigationReturn {
  currentView: ViewType
  activeTab: string
  absenceDetailsFilter: AbsenceDetailsFilter
  timeFilter: 'current-year' | 'quarter' | 'month' | 'everything'
  setCurrentView: (view: ViewType) => void
  setActiveTab: (tab: string) => void
  setTimeFilter: (filter: 'current-year' | 'quarter' | 'month' | 'everything') => void
  handleTabChange: (value: string) => void
  handleNavigateToAbsenceDetails: (month: string, year?: number) => void
  handleNavigateBackToDashboard: () => void
  handleNavigateToAbsenceDetailsWithFilters: (filters: AbsenceDetailsFilter) => void
  handleNavigateToEntitlementsDetails: () => void
}

export const useBackofficeNavigation = (): UseBackofficeNavigationReturn => {
  const [currentView, setCurrentView] = useState<ViewType>('tabs')
  const [activeTab, setActiveTab] = useState('dashboard')
  const [absenceDetailsFilter, setAbsenceDetailsFilter] = useState<AbsenceDetailsFilter>({})
  const [timeFilter, setTimeFilter] = useState<'current-year' | 'quarter' | 'month' | 'everything'>('current-year')

  const handleTabChange = useCallback((value: string) => {
    setActiveTab(value)
  }, [])

  const handleNavigateToAbsenceDetails = useCallback((month: string, year: number = new Date().getFullYear()) => {
    const dateRange = generateMonthDateRange(month, year)

    if (!dateRange) {
      return
    }

    setAbsenceDetailsFilter({
      month: dateRange.shortMonth,
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    })
    setCurrentView('absence-details')
  }, [])

  const handleNavigateBackToDashboard = useCallback(() => {
    setCurrentView('tabs')
    setActiveTab('dashboard')
    setAbsenceDetailsFilter({})
  }, [])

  const handleNavigateToAbsenceDetailsWithFilters = useCallback((filters: AbsenceDetailsFilter) => {
    setAbsenceDetailsFilter(filters)
    setCurrentView('absence-details')
  }, [])

  const handleNavigateToEntitlementsDetails = useCallback(() => {
    setCurrentView('entitlements-details')
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
    handleNavigateToEntitlementsDetails
  }
}
