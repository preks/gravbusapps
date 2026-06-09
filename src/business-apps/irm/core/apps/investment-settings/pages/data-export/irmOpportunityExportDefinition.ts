import type { InvestmentOpportunity } from '@/common/data/investment/types/investmentOpportunityTypes'
import { INVESTMENT_OPPORTUNITY_DESCRIPTORS } from '@/common/data/investment/types/investmentOpportunityTypes'
import type { InvestmentOpportunityQueryVariables } from '@/common/data/investment/queries/investmentOpportunityQueries'
import type {
  EntityExportDefinition,
  ExportQueryParams
} from '@/common/components/common-relations/apps/data-export/types/configTypes'
import { buildIrmOpportunityExportFields } from '@/common/components/common-relations/apps/data-export/registries/opportunity/irmOpportunityExportFields'
import { irmOpportunityExportFilterConfig } from '@/common/components/common-relations/apps/data-export/registries/opportunity/irmOpportunityExportFilterConfig'
import { IRM_OPPORTUNITY_EXPORT_FILTER_DESCRIPTORS } from '@/common/components/common-relations/apps/data-export/registries/opportunity/irmOpportunityExportFilterDescriptors'
import { buildOpportunityQueryVariables } from '@/common/components/common-relations/view-layouts/opportunity-layout/utils/buildOpportunityQueryVariables'

export function createIrmOpportunityExportDefinition(
  fetchInvestmentOpportunities: (
    vars: InvestmentOpportunityQueryVariables
  ) => Promise<{ opportunities?: InvestmentOpportunity[]; total?: number }>
): EntityExportDefinition<InvestmentOpportunity, InvestmentOpportunityQueryVariables> {
  return {
    entityType: 'opportunity',
    entityLabel: 'opportunities',
    sheetName: 'Opportunities',
    filenamePrefix: 'irm-opportunities-export',
    graphqlEntityName: 'InvestmentOpportunity',
    descriptors: INVESTMENT_OPPORTUNITY_DESCRIPTORS,
    filterDescriptors: IRM_OPPORTUNITY_EXPORT_FILTER_DESCRIPTORS,
    baseFilterConfig: irmOpportunityExportFilterConfig,
    exportFields: buildIrmOpportunityExportFields(),
    buildQueryVariables: ({ selectedFilters, limit = 50, offset = 0 }: ExportQueryParams) => {
      const pageSize = limit
      const pageIndex = pageSize > 0 ? Math.floor(offset / pageSize) : 0

      return buildOpportunityQueryVariables<InvestmentOpportunityQueryVariables>({
        selectedFilters,
        pagination: { pageIndex, pageSize },
        sorting: [{ id: 'createdAt', desc: true }]
      })
    },
    fetchPage: async vars => {
      const result = await fetchInvestmentOpportunities(vars)
      return {
        items: result.opportunities ?? [],
        total: result.total ?? 0
      }
    }
  }
}
