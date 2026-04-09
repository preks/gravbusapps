import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ActivityLayout } from '@/common/components/common-relations/view-layouts/activity-layout'
import { useViewPreferencesStorage } from '@/common/hooks/useViewPreferencesStorage'
import { buildIrmActivityConfig } from './config/activityConfig'
import { useGetInvestmentActivities } from '@/common/data/investment/hooks/useInvestmentActivities'
import { useInvestmentActivityStatistics } from '@/common/data/investment/hooks/useInvestmentActivityStatistics'

export type ActivityViewProps = BusinessAppContextProps

/**
 * Activities Tab — shows all activities for all employees.
 * Mirrors IRM TaskView pattern: hooks at component level, config memoized.
 */
export const ActivityView: React.FC<ActivityViewProps> = props => {
  const { initialFilters, saveFilters, initialSorting, saveSorting, initialVisibleColumns, saveVisibleColumns } =
    useViewPreferencesStorage('irm:investment-activity-preferences:v1')

  const { fetchInvestmentActivities } = useGetInvestmentActivities(props)
  const activityStatistics = useInvestmentActivityStatistics(props)

  const config = useMemo(() => buildIrmActivityConfig(fetchInvestmentActivities), [fetchInvestmentActivities])

  return (
    <ActivityLayout
      context={props}
      config={config}
      dataTestId="irm-activity-view"
      showOwnerEmployee
      enableExport
      exportFilenamePrefix="irm-activities"
      initialFilters={initialFilters}
      onFilterChange={saveFilters}
      initialSorting={initialSorting ?? undefined}
      onSortingChange={saveSorting}
      initialVisibleColumns={initialVisibleColumns ?? undefined}
      onVisibleColumnsChange={saveVisibleColumns}
      kpiStatistics={activityStatistics.teamActivitiesStatistics}
      kpiLoading={activityStatistics.isLoading}
      kpiError={activityStatistics.error}
      onKpiRetry={() => {
        void activityStatistics.refetch()
      }}
    />
  )
}

export default ActivityView
