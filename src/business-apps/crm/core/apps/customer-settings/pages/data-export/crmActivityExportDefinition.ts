import type { CustomerActivity } from '@/common/data/customer/types/customerActivityTypes'
import { CUSTOMER_ACTIVITY_DESCRIPTORS } from '@/common/data/customer/types/customerActivityTypes'
import type { CustomerActivityQueryVariables } from '@/common/data/customer/queries/customerActivityQueries'
import type {
  EntityExportDefinition,
  ExportQueryParams
} from '@/common/components/common-relations/apps/data-export/types/configTypes'
import { buildCrmActivityExportFields } from '@/common/components/common-relations/apps/data-export/registries/activity/crmActivityExportFields'
import { crmActivityExportFilterConfig } from '@/common/components/common-relations/apps/data-export/registries/activity/activityExportFilterConfig'
import { buildActivityExportQueryVariables } from '@/common/components/common-relations/apps/data-export/registries/activity/buildActivityExportQueryVariables'

export function createCrmActivityExportDefinition(
  fetchCustomerActivities: (
    vars: CustomerActivityQueryVariables
  ) => Promise<{ activities?: CustomerActivity[]; total?: number }>
): EntityExportDefinition<CustomerActivity, CustomerActivityQueryVariables> {
  return {
    entityType: 'activity',
    entityLabel: 'activities',
    sheetName: 'Activities',
    filenamePrefix: 'crm-activities-export',
    graphqlEntityName: 'SalesActivity',
    descriptors: CUSTOMER_ACTIVITY_DESCRIPTORS,
    baseFilterConfig: crmActivityExportFilterConfig,
    exportFields: buildCrmActivityExportFields(),
    buildQueryVariables: ({ selectedFilters, limit = 50, offset = 0 }: ExportQueryParams) =>
      buildActivityExportQueryVariables<CustomerActivityQueryVariables>({ selectedFilters, limit, offset }),
    fetchPage: async vars => {
      const result = await fetchCustomerActivities(vars)
      return {
        items: result.activities ?? [],
        total: result.total ?? 0
      }
    }
  }
}
