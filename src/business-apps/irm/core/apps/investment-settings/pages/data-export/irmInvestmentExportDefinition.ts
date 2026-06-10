import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import type {
  EntityExportDefinition,
  ExportQueryParams
} from '@/common/components/common-relations/apps/data-export/types/configTypes'
import { buildIrmInvestmentExportFields } from '@/common/components/common-relations/apps/data-export/registries/investment/irmInvestmentExportFields'
import { irmInvestmentExportFilterConfig } from '@/common/components/common-relations/apps/data-export/registries/investment/irmInvestmentExportFilterConfig'
import {
  buildInvestmentExportQueryVariables,
  type InvestmentExportQueryVariables
} from '@/common/components/common-relations/apps/data-export/registries/investment/buildInvestmentExportQueryVariables'
import { fetchInvestmentExportPage } from '@/common/components/common-relations/apps/data-export/registries/investment/fetchInvestmentExportPage'
import { INVESTMENT_DESCRIPTORS } from '@/common/data/investment/types/investmentTypes.new'
import type { GraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export function createIrmInvestmentExportDefinition(
  graphqlClient: GraphQLClient
): EntityExportDefinition<Investment, InvestmentExportQueryVariables> {
  return {
    entityType: 'investment',
    entityLabel: 'investments',
    sheetName: 'Investments',
    filenamePrefix: 'irm-investments-export',
    graphqlEntityName: 'Investment',
    descriptors: INVESTMENT_DESCRIPTORS,
    baseFilterConfig: irmInvestmentExportFilterConfig,
    exportFields: buildIrmInvestmentExportFields(),
    buildQueryVariables: ({ selectedFilters, limit = 50, offset = 0 }: ExportQueryParams) =>
      buildInvestmentExportQueryVariables(selectedFilters, { limit, offset }),
    fetchPage: variables => fetchInvestmentExportPage(graphqlClient, variables)
  }
}
