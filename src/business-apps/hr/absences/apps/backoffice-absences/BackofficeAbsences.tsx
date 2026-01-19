import React from 'react'
import { BusinessAppContextProps } from '../../../../../common/BusinessAppContext'
import { useDashboardData } from './hooks/useDashboardData'
import { useBackofficeNavigation } from './hooks/useBackofficeNavigation'
import BackofficeViewRenderer from './components/BackofficeViewRenderer'

const BackofficeAbsences: React.FC<BusinessAppContextProps> = context => {
  const { accessToken } = context

  const navigation = useBackofficeNavigation()

  const dashboardData = useDashboardData({ accessToken, timeFilter: navigation.timeFilter })

  return (
    <BackofficeViewRenderer
      {...context}
      currentView={navigation.currentView}
      activeTab={navigation.activeTab}
      absenceDetailsFilter={navigation.absenceDetailsFilter}
      timeFilter={navigation.timeFilter}
      dashboardData={dashboardData}
      onTabChange={navigation.handleTabChange}
      onNavigateBack={navigation.handleNavigateBackToDashboard}
      onTimeFilterChange={navigation.setTimeFilter}
      onNavigateToAbsenceDetails={navigation.handleNavigateToAbsenceDetails}
      onNavigateToAbsenceDetailsWithFilters={navigation.handleNavigateToAbsenceDetailsWithFilters}
      onNavigateToEntitlementsDetails={navigation.handleNavigateToEntitlementsDetails}
    />
  )
}

export default BackofficeAbsences
