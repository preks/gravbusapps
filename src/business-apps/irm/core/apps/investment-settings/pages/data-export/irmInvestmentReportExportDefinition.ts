import type { InvestmentReport } from '@/common/data/investment/types/investmentReportTypes'
import type {
  EntityExportDefinition,
  ExportQueryParams
} from '@/common/components/common-relations/apps/data-export/types/configTypes'
import { buildIrmInvestmentReportExportFields } from '@/common/components/common-relations/apps/data-export/registries/investment-report/irmInvestmentReportExportFields'
import { irmInvestmentReportExportFilterConfig } from '@/common/components/common-relations/apps/data-export/registries/investment-report/irmInvestmentReportExportFilterConfig'
import {
  buildInvestmentReportExportQueryVariables,
  type InvestmentReportExportQueryVariables
} from '@/common/components/common-relations/apps/data-export/registries/investment-report/buildInvestmentReportExportQueryVariables'
import { fetchInvestmentReportExportPage } from '@/common/components/common-relations/apps/data-export/registries/investment-report/fetchInvestmentReportExportPage'
import { INVESTMENT_REPORT_DESCRIPTORS } from '@/common/data/investment/types/investmentReportTypes'
import type { GraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export function createIrmInvestmentReportExportDefinition(
  graphqlClient: GraphQLClient
): EntityExportDefinition<InvestmentReport, InvestmentReportExportQueryVariables> {
  return {
    entityType: 'investment-report',
    entityLabel: 'investment reports',
    sheetName: 'Investment Reports',
    filenamePrefix: 'irm-investment-reports-export',
    graphqlEntityName: 'InvestmentReport',
    descriptors: INVESTMENT_REPORT_DESCRIPTORS,
    baseFilterConfig: irmInvestmentReportExportFilterConfig,
    exportFields: buildIrmInvestmentReportExportFields(),
    buildQueryVariables: ({ selectedFilters, limit = 50, offset = 0 }: ExportQueryParams) =>
      buildInvestmentReportExportQueryVariables(selectedFilters, { limit, offset }),
    fetchPage: variables => fetchInvestmentReportExportPage(graphqlClient, variables)
  }
}
