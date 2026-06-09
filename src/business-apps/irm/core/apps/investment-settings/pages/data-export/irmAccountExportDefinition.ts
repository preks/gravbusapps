import type { InvestmentAccount } from '@/common/data/investment/types/investmentAccountTypes'
import { INVESTMENT_ACCOUNT_DESCRIPTORS } from '@/common/data/investment/types/investmentAccountTypes'
import type { InvestmentAccountQueryVariables } from '@/common/data/investment/queries/investmentAccountQueries'
import type {
  EntityExportDefinition,
  ExportQueryParams
} from '@/common/components/common-relations/apps/data-export/types/configTypes'
import { buildIrmAccountExportFields } from '@/common/components/common-relations/apps/data-export/registries/account/irmAccountExportFields'
import { irmAccountExportFilterConfig } from '@/common/components/common-relations/apps/data-export/registries/account/irmAccountExportFilterConfig'
import { buildAccountQueryVariables } from '@/common/components/common-relations/view-layouts/account-layout/utils/buildAccountQueryVariables'

export function createIrmAccountExportDefinition(
  fetchInvestmentAccounts: (
    vars: InvestmentAccountQueryVariables
  ) => Promise<{ accounts?: InvestmentAccount[]; total?: number }>
): EntityExportDefinition<InvestmentAccount, InvestmentAccountQueryVariables> {
  return {
    entityType: 'account',
    entityLabel: 'accounts',
    sheetName: 'Accounts',
    filenamePrefix: 'irm-accounts-export',
    graphqlEntityName: 'InvestmentAccount',
    descriptors: INVESTMENT_ACCOUNT_DESCRIPTORS,
    baseFilterConfig: irmAccountExportFilterConfig,
    exportFields: buildIrmAccountExportFields(),
    buildQueryVariables: ({ selectedFilters, limit = 50, offset = 0 }: ExportQueryParams) => {
      const pageSize = limit
      const pageIndex = pageSize > 0 ? Math.floor(offset / pageSize) : 0

      return buildAccountQueryVariables<InvestmentAccountQueryVariables>({
        selectedFilters,
        pagination: { pageIndex, pageSize },
        sorting: [{ id: 'createdAt', desc: true }]
      })
    },
    fetchPage: async vars => {
      const result = await fetchInvestmentAccounts(vars)
      return {
        items: result.accounts ?? [],
        total: result.total ?? 0
      }
    }
  }
}
