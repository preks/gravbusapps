import type { CustomerLead } from '@/common/data/customer/types/customerLeadTypes'
import { CUSTOMER_LEAD_DESCRIPTORS } from '@/common/data/customer/types/customerLeadTypes'
import type { CustomerLeadQueryVariables } from '@/common/data/customer/queries/customerLeadQueries'
import type {
  EntityExportDefinition,
  ExportQueryParams
} from '@/common/components/common-relations/apps/data-export/types/configTypes'
import { buildCrmLeadExportFields } from '@/common/components/common-relations/apps/data-export/registries/lead/crmLeadExportFields'
import { crmLeadExportFilterConfig } from '@/common/components/common-relations/apps/data-export/registries/lead/crmLeadExportFilterConfig'
import { buildLeadQueryVariables } from '@/common/components/common-relations/view-layouts/lead-layout/utils/buildLeadQueryVariables'

export function createCrmLeadExportDefinition(
  fetchCustomerLeads: (vars: CustomerLeadQueryVariables) => Promise<{ leads?: CustomerLead[]; total?: number }>
): EntityExportDefinition<CustomerLead, CustomerLeadQueryVariables> {
  return {
    entityType: 'lead',
    entityLabel: 'leads',
    sheetName: 'Leads',
    filenamePrefix: 'crm-leads-export',
    graphqlEntityName: 'Lead',
    descriptors: CUSTOMER_LEAD_DESCRIPTORS,
    baseFilterConfig: crmLeadExportFilterConfig,
    exportFields: buildCrmLeadExportFields(),
    queryVariableOptions: { nonSortableColumns: ['communicationChannels', 'location'] },
    buildQueryVariables: ({ selectedFilters, limit = 50, offset = 0 }: ExportQueryParams) => {
      const pageSize = limit
      const pageIndex = pageSize > 0 ? Math.floor(offset / pageSize) : 0

      return buildLeadQueryVariables<CustomerLeadQueryVariables>(
        {
          selectedFilters,
          pagination: { pageIndex, pageSize },
          sorting: [{ id: 'createdAt', desc: true }]
        },
        { nonSortableColumns: ['communicationChannels', 'location'] }
      )
    },
    fetchPage: async vars => {
      const result = await fetchCustomerLeads(vars)
      return {
        items: result.leads ?? [],
        total: result.total ?? 0
      }
    }
  }
}
