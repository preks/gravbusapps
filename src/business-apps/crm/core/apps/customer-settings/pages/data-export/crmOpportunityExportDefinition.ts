import type { CustomerOpportunity } from '@/common/data/customer/types/customerOpportunityTypes'
import { CUSTOMER_OPPORTUNITY_DESCRIPTORS } from '@/common/data/customer/types/customerOpportunityTypes'
import type { CustomerOpportunityQueryVariables } from '@/common/data/customer/queries/customerOpportunityQueries'
import type {
  EntityExportDefinition,
  ExportQueryParams
} from '@/common/components/common-relations/apps/data-export/types/configTypes'
import { buildCrmOpportunityExportFields } from '@/common/components/common-relations/apps/data-export/registries/opportunity/crmOpportunityExportFields'
import { CRM_OPPORTUNITY_EXPORT_FILTER_DESCRIPTORS } from '@/common/components/common-relations/apps/data-export/registries/opportunity/crmOpportunityExportFilterDescriptors'
import { crmOpportunityExportFilterConfig } from '@/common/components/common-relations/apps/data-export/registries/opportunity/crmOpportunityExportFilterConfig'
import { buildOpportunityQueryVariables } from '@/common/components/common-relations/view-layouts/opportunity-layout/utils/buildOpportunityQueryVariables'

export function createCrmOpportunityExportDefinition(
  fetchCustomerOpportunities: (
    vars: CustomerOpportunityQueryVariables
  ) => Promise<{ opportunities?: CustomerOpportunity[]; total?: number }>
): EntityExportDefinition<CustomerOpportunity, CustomerOpportunityQueryVariables> {
  return {
    entityType: 'opportunity',
    entityLabel: 'opportunities',
    sheetName: 'Opportunities',
    filenamePrefix: 'crm-opportunities-export',
    graphqlEntityName: 'Opportunity',
    descriptors: CUSTOMER_OPPORTUNITY_DESCRIPTORS,
    filterDescriptors: CRM_OPPORTUNITY_EXPORT_FILTER_DESCRIPTORS,
    baseFilterConfig: crmOpportunityExportFilterConfig,
    exportFields: buildCrmOpportunityExportFields(),
    buildQueryVariables: ({ selectedFilters, limit = 50, offset = 0 }: ExportQueryParams) => {
      const pageSize = limit
      const pageIndex = pageSize > 0 ? Math.floor(offset / pageSize) : 0

      return buildOpportunityQueryVariables<CustomerOpportunityQueryVariables>({
        selectedFilters,
        pagination: { pageIndex, pageSize },
        sorting: [{ id: 'createdAt', desc: true }]
      })
    },
    fetchPage: async vars => {
      const result = await fetchCustomerOpportunities(vars)
      return {
        items: result.opportunities ?? [],
        total: result.total ?? 0
      }
    }
  }
}
