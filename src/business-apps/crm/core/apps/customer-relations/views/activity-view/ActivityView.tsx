import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ActivityLayout } from '@/common/components/common-relations/view-layouts/activity-layout'
import { buildCrmActivityConfig } from './config/activityConfig'
import { useCustomerActivities } from '@/common/data/customer/hooks/useCustomerActivities'
import { useCustomerActivityStatistics } from '@/common/data/customer/hooks/useCustomerActivityStatistics'
import { useViewPreferencesStorage } from '@/common/hooks/useViewPreferencesStorage'

export type ActivityViewProps = BusinessAppContextProps

/**
 * Activities Tab — shows all activities for all employees.
 * Mirrors the pattern of TaskView: hooks are called at component level,
 * config is memoized so ActivityLayout never sees a new object reference
 * on every render (which would cause duplicate fetches).
 */
export const ActivityView: React.FC<ActivityViewProps> = props => {
  const { initialFilters, saveFilters, initialSorting, saveSorting, initialVisibleColumns, saveVisibleColumns } =
    useViewPreferencesStorage('crm:customer-activity-preferences:v1')

  const { fetchCustomerActivities } = useCustomerActivities(props)
  const activityStatistics = useCustomerActivityStatistics(props)

  const config = useMemo(() => buildCrmActivityConfig(fetchCustomerActivities), [fetchCustomerActivities])

  return (
    <ActivityLayout
      context={props}
      config={config}
      dataTestId="crm-activity-view"
      showOwnerEmployee
      enableExport
      exportFilenamePrefix="crm-activities"
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
