import type { InvestmentLead } from '@/common/data/investment/types/investmentLeadTypes'
import { INVESTMENT_LEAD_DESCRIPTORS } from '@/common/data/investment/types/investmentLeadTypes'
import type { InvestmentLeadQueryVariables } from '@/common/data/investment/queries/investmentLeadQueries'
import type {
  EntityExportDefinition,
  ExportQueryParams
} from '@/common/components/common-relations/apps/data-export/types/configTypes'
import { buildIrmLeadExportFields } from '@/common/components/common-relations/apps/data-export/registries/lead/irmLeadExportFields'
import { irmLeadExportFilterConfig } from '@/common/components/common-relations/apps/data-export/registries/lead/irmLeadExportFilterConfig'
import { buildLeadQueryVariables } from '@/common/components/common-relations/view-layouts/lead-layout/utils/buildLeadQueryVariables'

export function createIrmLeadExportDefinition(
  fetchInvestmentLeads: (vars: InvestmentLeadQueryVariables) => Promise<{ leads?: InvestmentLead[]; total?: number }>
): EntityExportDefinition<InvestmentLead, InvestmentLeadQueryVariables> {
  return {
    entityType: 'lead',
    entityLabel: 'leads',
    sheetName: 'Leads',
    filenamePrefix: 'irm-leads-export',
    graphqlEntityName: 'InvestmentLead',
    descriptors: INVESTMENT_LEAD_DESCRIPTORS,
    baseFilterConfig: irmLeadExportFilterConfig,
    exportFields: buildIrmLeadExportFields(),
    buildQueryVariables: ({ selectedFilters, limit = 50, offset = 0 }: ExportQueryParams) => {
      const pageSize = limit
      const pageIndex = pageSize > 0 ? Math.floor(offset / pageSize) : 0

      return buildLeadQueryVariables<InvestmentLeadQueryVariables>({
        selectedFilters,
        pagination: { pageIndex, pageSize },
        sorting: [{ id: 'createdAt', desc: true }]
      })
    },
    fetchPage: async vars => {
      const result = await fetchInvestmentLeads(vars)
      return {
        items: result.leads ?? [],
        total: result.total ?? 0
      }
    }
  }
}
