import type { InvestmentActivity } from '@/common/data/investment/types/investmentActivityTypes'
import { INVESTMENT_ACTIVITY_DESCRIPTORS } from '@/common/data/investment/types/investmentActivityTypes'
import type { InvestmentActivityQueryVariables } from '@/common/data/investment/queries/investmentActivityQueries'
import type {
  EntityExportDefinition,
  ExportQueryParams
} from '@/common/components/common-relations/apps/data-export/types/configTypes'
import { buildIrmActivityExportFields } from '@/common/components/common-relations/apps/data-export/registries/activity/irmActivityExportFields'
import { irmActivityExportFilterConfig } from '@/common/components/common-relations/apps/data-export/registries/activity/activityExportFilterConfig'
import { buildActivityExportQueryVariables } from '@/common/components/common-relations/apps/data-export/registries/activity/buildActivityExportQueryVariables'

export function createIrmActivityExportDefinition(
  fetchInvestmentActivities: (vars: InvestmentActivityQueryVariables) => Promise<{
    InvestmentActivity?: InvestmentActivity[]
    InvestmentActivityAggregate?: { aggregate?: { count?: number } }
  }>
): EntityExportDefinition<InvestmentActivity, InvestmentActivityQueryVariables> {
  return {
    entityType: 'activity',
    entityLabel: 'activities',
    sheetName: 'Activities',
    filenamePrefix: 'irm-activities-export',
    graphqlEntityName: 'InvestmentActivity',
    descriptors: INVESTMENT_ACTIVITY_DESCRIPTORS,
    baseFilterConfig: irmActivityExportFilterConfig,
    exportFields: buildIrmActivityExportFields(),
    buildQueryVariables: ({ selectedFilters, limit = 50, offset = 0 }: ExportQueryParams) =>
      buildActivityExportQueryVariables<InvestmentActivityQueryVariables>({ selectedFilters, limit, offset }),
    fetchPage: async vars => {
      const result = await fetchInvestmentActivities(vars)
      return {
        items: result.InvestmentActivity ?? [],
        total: result.InvestmentActivityAggregate?.aggregate?.count ?? 0
      }
    }
  }
}
