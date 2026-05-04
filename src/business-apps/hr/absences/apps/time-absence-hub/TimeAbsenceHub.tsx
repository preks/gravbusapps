import React from 'react'
import { BusinessAppContextProps } from '../../../../../common/BusinessAppContext'
import { useDashboardData } from './hooks/useDashboardData'
import { useTimeAbsenceHubNavigation } from './hooks/useTimeAbsenceHubNavigation'
import { useHubGlobalFilters } from './hooks/useHubGlobalFilters'
import { useHubFilterOptions } from './hooks/useHubFilterOptions'
import TimeAbsenceHubViewRenderer from './components/TimeAbsenceHubViewRenderer'

const TimeAbsenceHub: React.FC<BusinessAppContextProps> = context => {
  const { accessToken } = context

  const navigation = useTimeAbsenceHubNavigation()
  const globalFilters = useHubGlobalFilters()
  const filterOptions = useHubFilterOptions(accessToken)

  const dashboardData = useDashboardData({
    accessToken,
    timeFilter: globalFilters.legacyTimeFilter,
    filters: globalFilters.filters,
    derivedDateRange: globalFilters.derivedDateRange
  })

  return (
    <TimeAbsenceHubViewRenderer
      {...context}
      navigation={navigation}
      globalFilters={globalFilters}
      filterOptions={filterOptions}
      dashboardData={dashboardData}
    />
  )
}

export default TimeAbsenceHub
