import React, { useEffect, useMemo, useRef } from 'react'
import { BusinessAppContextProps } from '../../../../../common/BusinessAppContext'
import { useDashboardData } from './hooks/useDashboardData'
import { useTimeAbsenceHubNavigation } from './hooks/useTimeAbsenceHubNavigation'
import { useHubGlobalFilters } from './hooks/useHubGlobalFilters'
import { useHubFilterOptions } from './hooks/useHubFilterOptions'
import TimeAbsenceHubViewRenderer from './components/TimeAbsenceHubViewRenderer'

const WORK_ABSENCE_GROUP_ID = 'AbsenceGroup:v1:WORK'

const TimeAbsenceHub: React.FC<BusinessAppContextProps> = context => {
  const { accessToken } = context

  const navigation = useTimeAbsenceHubNavigation()
  const globalFilters = useHubGlobalFilters()
  const filterOptions = useHubFilterOptions(accessToken)
  const didApplyDefaultAbsenceTypeFilter = useRef(false)
  const defaultAbsenceTypeIds = useMemo(
    () =>
      filterOptions.absenceTypes
        .filter(option => option.parentEntryId !== WORK_ABSENCE_GROUP_ID)
        .map(option => option.id),
    [filterOptions.absenceTypes]
  )

  useEffect(() => {
    if (didApplyDefaultAbsenceTypeFilter.current || filterOptions.isLoading) {
      return
    }

    if (globalFilters.filters.absenceTypeIds.length > 0) {
      didApplyDefaultAbsenceTypeFilter.current = true
      return
    }

    if (filterOptions.absenceTypes.length === 0 || defaultAbsenceTypeIds.length === filterOptions.absenceTypes.length) {
      return
    }

    globalFilters.setAbsenceTypeIds(defaultAbsenceTypeIds)
    didApplyDefaultAbsenceTypeFilter.current = true
  }, [
    defaultAbsenceTypeIds,
    filterOptions.absenceTypes.length,
    filterOptions.isLoading,
    globalFilters.filters.absenceTypeIds.length,
    globalFilters.setAbsenceTypeIds
  ])

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
