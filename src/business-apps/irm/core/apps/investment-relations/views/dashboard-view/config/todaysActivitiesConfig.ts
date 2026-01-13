import { TodaysActivitiesConfig } from '@/common/components/common-relations/view-layouts/dashboard-layout/hooks/useTodaysActivitiesData'

export const irmTodaysActivitiesConfig: TodaysActivitiesConfig = {
  activityTable: 'InvestmentActivity',
  activityAggregateTable: 'InvestmentActivityAggregate',
  activityTypeField: 'activityType',
  activityTypeRefField: 'activityTypeRef',
  leadField: 'lead',
  opportunityField: 'opportunity',
  leadNameFields: 'firstName\n              lastName'
}
