import { TodaysActivitiesConfig } from '@/common/components/common-relations/view-layouts/dashboard-layout/hooks/useTodaysActivitiesData'

export const crmTodaysActivitiesConfig: TodaysActivitiesConfig = {
  activityTable: 'SalesActivity',
  activityAggregateTable: 'SalesActivityAggregate',
  activityTypeField: 'activityType',
  activityTypeRefField: 'activityTypeRef',
  leadField: 'lead',
  opportunityField: 'opportunity',
  leadNameFields: 'name'
}
