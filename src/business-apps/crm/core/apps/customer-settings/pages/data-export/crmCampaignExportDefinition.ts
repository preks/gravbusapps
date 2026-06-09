import type {
  SalesCampaign,
  SalesCampaignWithCountResponse
} from '@/business-apps/crm/campaigns/apps/campaign-management/components/campaign-list/types/SalesCampaignTypes'
import type {
  EntityExportDefinition,
  ExportQueryParams
} from '@/common/components/common-relations/apps/data-export/types/configTypes'
import { buildCrmCampaignExportFields } from '@/common/components/common-relations/apps/data-export/registries/campaign/crmCampaignExportFields'
import { crmCampaignExportFilterConfig } from '@/common/components/common-relations/apps/data-export/registries/campaign/crmCampaignExportFilterConfig'
import {
  buildCampaignExportQueryVariables,
  type CampaignExportQueryVariables
} from '@/common/components/common-relations/apps/data-export/registries/campaign/buildCampaignExportQueryVariables'
import { filterCampaignsByExportStatus } from '@/common/components/common-relations/apps/data-export/registries/campaign/campaignExportHelpers'

async function fetchCampaignPage(
  fetchSalesCampaignsWithCount: (variables?: CampaignExportQueryVariables) => Promise<SalesCampaignWithCountResponse>,
  variables: CampaignExportQueryVariables
): Promise<{ items: SalesCampaign[]; total: number }> {
  const { statusFilters, limit, offset, ...graphqlVars } = variables

  if (statusFilters && statusFilters.length > 0) {
    const countResult = await fetchSalesCampaignsWithCount({ ...graphqlVars, limit: 1, offset: 0 })
    const serverTotal = countResult.SalesCampaignAggregate?.aggregate?.count ?? 0

    if (serverTotal === 0) {
      return { items: [], total: 0 }
    }

    const fullResult = await fetchSalesCampaignsWithCount({
      ...graphqlVars,
      limit: serverTotal,
      offset: 0
    })
    const filteredItems = filterCampaignsByExportStatus(fullResult.SalesCampaign ?? [], statusFilters)
    const pageLimit = limit ?? filteredItems.length
    const pageOffset = offset ?? 0

    return {
      items: filteredItems.slice(pageOffset, pageOffset + pageLimit),
      total: filteredItems.length
    }
  }

  const result = await fetchSalesCampaignsWithCount(variables)

  return {
    items: result.SalesCampaign ?? [],
    total: result.SalesCampaignAggregate?.aggregate?.count ?? 0
  }
}

export function createCrmCampaignExportDefinition(
  fetchSalesCampaignsWithCount: (variables?: CampaignExportQueryVariables) => Promise<SalesCampaignWithCountResponse>
): EntityExportDefinition<SalesCampaign, CampaignExportQueryVariables> {
  return {
    entityType: 'campaign',
    entityLabel: 'campaigns',
    sheetName: 'Campaigns',
    filenamePrefix: 'crm-campaigns-export',
    graphqlEntityName: 'SalesCampaign',
    descriptors: [],
    baseFilterConfig: crmCampaignExportFilterConfig,
    exportFields: buildCrmCampaignExportFields(),
    buildQueryVariables: ({ selectedFilters, limit = 50, offset = 0 }: ExportQueryParams) =>
      buildCampaignExportQueryVariables(selectedFilters, { limit, offset }),
    fetchPage: variables => fetchCampaignPage(fetchSalesCampaignsWithCount, variables)
  }
}
